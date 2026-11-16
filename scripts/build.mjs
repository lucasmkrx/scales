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
const icons = await readFile(new URL('public/assets/controls.svg', root), 'utf8');
const instrumentArtwork = await Promise.all(
  ['guitar', 'bass'].map((instrument) =>
    readFile(new URL(`public/assets/instruments/${instrument}.webp`, root)),
  ),
);
const revisionHash = createHash('sha256')
  .update(JSON.stringify(modules))
  .update(css)
  .update(theme)
  .update(icons);
for (const artwork of instrumentArtwork) revisionHash.update(artwork);
const revision = revisionHash.digest('hex').slice(0, 12);
const versionArtwork = (source) =>
  source.replace(
    /\.\/assets\/instruments\/(guitar|bass)\.webp/g,
    (path) => `${path}?v=${revision}`,
  );
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(new URL('public/', root), dist, { recursive: true });
await mkdir(new URL('src/', dist), { recursive: true });
// Version the whole module graph, so an updated entry point cannot load stale dependencies.
for (const [name, source] of modules) {
  const versioned = versionArtwork(source)
    .replace(
      /(['"])(\.\/[^'"]+\.mjs)\1/g,
      (_, quote, path) => `${quote}${path}?v=${revision}${quote}`,
    )
    .replaceAll('./assets/controls.svg#', `./assets/controls.svg?v=${revision}#`);
  await writeFile(new URL(`src/${name}`, dist), versioned);
}
const html = versionArtwork(await readFile(new URL('public/index.html', root), 'utf8'))
  .replace('./src/app.mjs', `./src/app.mjs?v=${revision}`)
  .replace('./theme.js', `./theme.js?v=${revision}`)
  .replaceAll('./assets/controls.svg#', `./assets/controls.svg?v=${revision}#`)
  .replace('./styles.css', `./styles.css?v=${revision}`);
await writeFile(new URL('index.html', dist), html);
await writeFile(new URL('.nojekyll', dist), '');
console.log(
  `Built dist/ (${revision}; relative paths support GitHub Pages project sites).`,
);
