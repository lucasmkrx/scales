import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { routes, siteOrigin } from '../src/site.mjs';
import { sitemap } from '../scripts/sitemap.mjs';
import { referenceMarkdown, referencePage } from '../scripts/reference-pages.mjs';
import { SCALES } from '../src/catalog.mjs';
import { spellScale } from '../src/music.mjs';
import { restoreWorkspace } from '../src/workspace.mjs';
import { GUIDED_BOOKS } from '../src/guides.mjs';

const publicFile = (name) =>
  readFile(new URL(`../public/${name}`, import.meta.url), 'utf8');

test('the sitemap and agent directory reference the current public pages and lessons', async () => {
  const [robots, directory] = await Promise.all([
    publicFile('robots.txt'),
    publicFile('llms.txt'),
  ]);
  assert.match(robots, /^User-agent: \*\nAllow: \/$/m);
  assert.ok(
    robots.split('\n').includes(`Sitemap: ${new URL('/sitemap.xml', siteOrigin)}`),
  );

  const pages = Object.values(routes).flatMap(({ home, guide, reference }) => [
    home,
    guide,
    reference,
  ]);
  const books = GUIDED_BOOKS.map(({ file }) => `/guides/${file}`);
  const addresses = [...sitemap().matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (entry) => entry[1],
  );
  assert.deepEqual(
    addresses.sort(),
    [...pages, ...books].map((path) => new URL(path, siteOrigin).href).sort(),
  );

  const expectedDirectoryPaths = [
    ...Object.values(routes).flatMap(({ home, guide, reference }) => [
      home,
      `${guide}index.md`,
      `${reference}index.md`,
    ]),
    ...books,
  ];
  const links = [...directory.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map(
    (entry) => entry[1],
  );
  for (const path of expectedDirectoryPaths)
    assert.ok(links.includes(new URL(path, siteOrigin).href), path);
});

test('every published reference example opens its spelled notes on guitar and bass', () => {
  const saved = {
    instrument: 'bass',
    preferences: { lang: 'pt', spelling: 'both', labels: 'degrees', allNotes: true },
    setups: { guitar: { strings: 7 }, bass: { strings: 6 } },
  };
  for (const [lang, route] of Object.entries(routes)) {
    const base = '../'.repeat(route.reference.split('/').filter(Boolean).length);
    const html = referencePage(lang, '', base, 'test');
    const md = referenceMarkdown(lang);
    const rows = [
      ...html.matchAll(/<li class="reference-row" id="scale-([^"]+)">([\s\S]*?)<\/li>/g),
    ];
    assert.deepEqual(
      new Set(rows.map((row) => row[1])),
      new Set(SCALES.map((scale) => scale.id)),
    );
    for (const [, id, body] of rows) {
      const shapes = [...body.matchAll(/<a href="([^"]+)"/g)].map(
        ([, href]) =>
          new URL(href.replaceAll('&amp;', '&'), siteOrigin + route.reference),
      );
      assert.deepEqual(
        shapes.map((url) => url.searchParams.get('instrument')),
        ['guitar', 'bass'],
      );
      for (const url of shapes) {
        assert.equal(url.pathname, route.home);
        const state = restoreWorkspace(Object.fromEntries(url.searchParams), saved);
        assert.equal(state.lang, lang);
        assert.equal(state.scale, id);
        assert.equal(state.strings, state.instrument === 'bass' ? 4 : 6);
        assert.equal(
          state.tuning,
          state.instrument === 'bass' ? 'bass-4-standard' : 'guitar-standard',
        );
        assert.ok(body.includes(`<dd>${spellScale(state).join(' ')}</dd>`));
        assert.ok(md.includes(url.href));
      }
    }
    assert.ok(html.includes('<dd>C E♭ G♭ B♭♭</dd>'));
    assert.ok(html.includes('<dd>A C D E G</dd>'));
    assert.ok(html.includes('<dd>A B C D E F♯ G</dd>'));
  }
});
