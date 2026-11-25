// SPDX-License-Identifier: MPL-2.0

import { explorerPage } from './homepage.mjs';
import { sitemap } from './sitemap.mjs';
import { explorerPath } from '../src/site.mjs';
import { LANGUAGES } from '../src/locales.mjs';
import { cp, mkdir, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url),
  dist = new URL('dist/', root);
const modules = await Promise.all(
  (await readdir(new URL('src/', root)))
    .filter((name) => name.endsWith('.mjs'))
    .sort()
    .map(async (name) => [name, await readFile(new URL(`src/${name}`, root), 'utf8')]),
);
const css = await readFile(new URL('public/styles.css', root), 'utf8');
const theme = await readFile(new URL('public/theme.js', root), 'utf8');
const manifest = await readFile(new URL('public/site.webmanifest', root), 'utf8');
const visualAssets = [
  'assets/fonts/fa-solid-900.woff2',
  'assets/fonts/cookie.woff2',
  'assets/fonts/ibm-plex-sans.woff2',
  'assets/fonts/ibm-plex-mono.woff2',
  'assets/fonts/ibm-plex-mono-semibold.woff2',
  'assets/fonts/ibm-plex-mono-bold.woff2',
  'favicon.ico',
  'assets/favicon.svg',
  'assets/pinned-tab.svg',
  'assets/icon.png',
  'assets/icon-192.png',
  'assets/apple-touch-icon.png',
  'assets/tukany-wordmark.svg',
  'assets/tukany-logo.svg',
  'assets/buy-me-a-coffee.svg',
  'assets/flags/us.svg',
  'assets/flags/br.svg',
  'assets/flags/es.svg',
  'assets/flags/it.svg',
  'assets/flags/fr.svg',
  'assets/flags/de.svg',
  'assets/tukany-social.jpg',
  'assets/instruments/telecaster-headstock.png',
  'assets/instruments/bass-headstock.png',
];
const revisionHash = createHash('sha256')
  .update(JSON.stringify(modules))
  .update(css)
  .update(theme)
  .update(manifest);
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
await cp(new URL('LICENSE', root), new URL('LICENSE', dist));
await mkdir(new URL('src/', dist), { recursive: true });
// Version the whole module graph, so an updated entry point cannot load stale dependencies.
for (const [name, source] of modules) {
  const versioned = versionVisualAssets(source).replace(
    /(['"])(\.\/[^'"]+\.mjs)\1/g,
    (_, quote, path) => `${quote}${path}?v=${revision}${quote}`,
  );
  await writeFile(new URL(`src/${name}`, dist), versioned);
}
const template = (await readFile(new URL('public/index.html', root), 'utf8'))
  .replace('./src/app.mjs', `./src/app.mjs?v=${revision}`)
  .replace('theme.js"', `theme.js?v=${revision}"`)
  .replace('./site.webmanifest', `./site.webmanifest?v=${revision}`)
  .replace('./styles.css', `./styles.css?v=${revision}`);
for (const lang of Object.keys(LANGUAGES)) {
  const directory = new URL(explorerPath(lang), dist);
  await mkdir(directory, { recursive: true });
  const html = versionVisualAssets(explorerPage(template, lang));
  await writeFile(new URL('index.html', directory), html);
}
await writeFile(new URL('site.webmanifest', dist), versionVisualAssets(manifest));
await writeFile(new URL('sitemap.xml', dist), sitemap());
await writeFile(new URL('styles.css', dist), versionVisualAssets(css));
await writeFile(new URL('.nojekyll', dist), '');
console.log(
  `Built dist/ (${revision}; relative paths support GitHub Pages project sites).`,
);
