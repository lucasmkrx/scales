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
await writeFile(new URL('index.html', dist), html);
await writeFile(new URL('styles.css', dist), versionVisualAssets(css));
await writeFile(new URL('.nojekyll', dist), '');
console.log(
  `Built dist/ (${revision}; relative paths support GitHub Pages project sites).`,
);
