import { routes } from '../src/site.mjs';
import { metadata, explorerPage } from './search-pages.mjs';
import { guidePage, guideMarkdown } from './practice-pages.mjs';
import { referencePage, referenceMarkdown } from './reference-pages.mjs';
import { sitemap } from './sitemap.mjs';
import { cp, mkdir, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadEnvFile } from 'node:process';
const root = new URL('../', import.meta.url),
  dist = new URL('dist/', root);
try {
  loadEnvFile(new URL('.env', root));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const modules = await Promise.all(
  (await readdir(new URL('src/', root)))
    .filter((name) => name.endsWith('.mjs'))
    .sort()
    .map(async (name) => [name, await readFile(new URL(`src/${name}`, root), 'utf8')]),
);
const css = await readFile(new URL('public/styles.css', root), 'utf8');
const theme = await readFile(new URL('public/theme.js', root), 'utf8');
const visualAssets = [
  './vendor/fontawesome.min.css',
  './assets/fonts/fa-solid-900.woff2',
  './assets/icon.png',
  './assets/marques-and-co.png',
  './assets/instruments/telecaster-headstock.png',
  './assets/instruments/bass-headstock.png',
];
const revisionHash = createHash('sha256')
  .update(JSON.stringify(modules))
  .update(css)
  .update(await readFile(new URL('public/practice.css', root)))
  .update(await readFile(new URL('public/reference.css', root)))
  .update(theme);
for (const path of visualAssets) {
  revisionHash.update(await readFile(new URL(`public/${path}`, root)));
}
const revision = revisionHash.digest('hex').slice(0, 12);
function versionVisualAssets(source) {
  for (const path of visualAssets)
    source = source.replaceAll(path, `${path}?v=${revision}`);
  return source;
}
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(new URL('public/', root), dist, { recursive: true });
// Only the website-restricted, publishable YouTube browser key belongs in this file.
await writeFile(
  new URL('youtube-config.json', dist),
  JSON.stringify({ apiKey: process.env.YOUTUBE_API_KEY?.trim() || '' }),
);
await mkdir(new URL('src/', dist), { recursive: true });
// Version the whole module graph, so an updated entry point cannot load stale dependencies.
for (const [name, source] of modules) {
  const versioned = versionVisualAssets(source).replace(
    /(['"])(\.\/[^'"]+\.mjs)\1/g,
    (_, quote, path) => `${quote}${path}?v=${revision}${quote}`,
  );
  await writeFile(new URL(`src/${name}`, dist), versioned);
}
const html = versionVisualAssets(
  await readFile(new URL('public/index.html', root), 'utf8'),
)
  .replace('./src/app.mjs', `./src/app.mjs?v=${revision}`)
  .replace('theme.js"', `theme.js?v=${revision}"`)
  .replace('./styles.css', `./styles.css?v=${revision}`);
for (const [lang, route] of Object.entries(routes)) {
  const home = new URL('.' + route.home, dist);
  await mkdir(home, { recursive: true });
  const base = route.home === '/' ? './' : '../';
  await writeFile(new URL('index.html', home), explorerPage(html, lang, base));
  for (const [kind, renderPage, renderMarkdown] of [
    ['guide', guidePage, guideMarkdown],
    ['reference', referencePage, referenceMarkdown],
  ]) {
    const directory = new URL('.' + route[kind], dist);
    await mkdir(directory, { recursive: true });
    const assetBase = '../'.repeat(route[kind].split('/').filter(Boolean).length);
    await writeFile(
      new URL('index.html', directory),
      renderPage(lang, metadata(lang, kind), assetBase, revision),
    );
    await writeFile(new URL('index.md', directory), renderMarkdown(lang));
  }
}
await writeFile(new URL('sitemap.xml', dist), sitemap());
await writeFile(new URL('styles.css', dist), versionVisualAssets(css));
await writeFile(new URL('.nojekyll', dist), '');
console.log(
  `Built dist/ (${revision}; relative paths support GitHub Pages project sites).`,
);
