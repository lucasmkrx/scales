import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { siteOrigin } from '../src/site.mjs';
import { sitemap } from '../scripts/sitemap.mjs';
import { LANGUAGES } from '../src/locales.mjs';

const publicFile = (name) =>
  readFile(new URL(`../public/${name}`, import.meta.url), 'utf8');

test('the sitemap and agent directory reference all explorer editions', async () => {
  const [robots, directory] = await Promise.all([
    publicFile('robots.txt'),
    publicFile('llms.txt'),
  ]);
  assert.match(robots, /^User-agent: \*\nAllow: \/$/m);
  assert.ok(
    robots.split('\n').includes(`Sitemap: ${new URL('/sitemap.xml', siteOrigin)}`),
  );

  const paths = Object.keys(LANGUAGES).map((lang) => (lang === 'en' ? '/' : `/${lang}/`));
  const addresses = [...sitemap().matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (entry) => entry[1],
  );
  assert.deepEqual(
    addresses.sort(),
    paths.map((path) => new URL(path, siteOrigin).href).sort(),
  );

  const links = [...directory.matchAll(/\]\((https:\/\/[^)]+)\)/g)]
    .map((entry) => new URL(entry[1]))
    .filter((url) => url.origin === siteOrigin);
  assert.deepEqual(new Set(links.map((url) => url.pathname)), new Set(paths));
  for (const path of paths)
    assert.ok(
      links.some((url) => url.href === new URL(path, siteOrigin).href),
      path,
    );
});
