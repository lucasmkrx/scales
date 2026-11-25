// SPDX-License-Identifier: MPL-2.0

import test from 'node:test';
import { siteOrigin } from '../src/site.mjs';
import { LANGUAGES } from '../src/locales.mjs';
import { copy } from '../src/i18n.mjs';
import { escape } from '../src/board.mjs';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
test('published assets use one revision across the entry point, module graph, and styles', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.deepEqual(
    await readFile(new URL('../dist/LICENSE', import.meta.url)),
    await readFile(new URL('../LICENSE', import.meta.url)),
  );
  const version = html.match(/src\/app\.mjs\?v=([a-f0-9]{12})/)[1];
  assert.ok(html.includes(`styles.css?v=${version}`));
  assert.ok(html.includes(`theme.js?v=${version}`));
  assert.ok(html.includes(`site.webmanifest?v=${version}`));
  const manifest = JSON.parse(
    await readFile(new URL('../dist/site.webmanifest', import.meta.url), 'utf8'),
  );
  const css = await readFile(new URL('../dist/styles.css', import.meta.url), 'utf8');
  const pdf = await readFile(new URL('../dist/src/pdf.mjs', import.meta.url), 'utf8');
  for (const [path, source] of [
    ['favicon.ico', html],
    ['assets/favicon.svg', html],
    ['assets/pinned-tab.svg', html],
    ['assets/apple-touch-icon.png', html],
    ['assets/tukany-wordmark.svg', html],
    ['assets/tukany-logo.svg', html],
    ['assets/buy-me-a-coffee.svg', html],
    ['assets/flags/us.svg', html],
    ['assets/flags/br.svg', html],
    ['assets/flags/es.svg', html],
    ['assets/flags/it.svg', html],
    ['assets/flags/fr.svg', html],
    ['assets/flags/de.svg', html],
    ['assets/tukany-logo.svg', pdf],
    ['assets/tukany-wordmark.svg', pdf],
    ['assets/fonts/fa-solid-900.woff2', css],
    ['assets/fonts/cookie.woff2', css],
    ['assets/instruments/telecaster-headstock.png', css],
    ['assets/instruments/bass-headstock.png', css],
  ]) {
    assert.ok(source.includes(`${path}?v=${version}`), path);
    assert.deepEqual(
      await readFile(new URL(`../dist/${path}`, import.meta.url)),
      await readFile(new URL(`../public/${path}`, import.meta.url)),
    );
  }
  for (const [file, size] of [
    ['icon-192.png', 192],
    ['icon.png', 512],
  ]) {
    const icon = manifest.icons.find((entry) => entry.sizes === `${size}x${size}`);
    assert.equal(icon.src, `./assets/${file}?v=${version}`);
    const png = await readFile(new URL(`../dist/assets/${file}`, import.meta.url));
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  assert.ok(
    html.indexOf(`theme.js?v=${version}`) < html.indexOf(`styles.css?v=${version}`),
  );
  for (const name of await readdir(new URL('../dist/src/', import.meta.url))) {
    const source = await readFile(
      new URL(`../dist/src/${name}`, import.meta.url),
      'utf8',
    );
    for (const match of source.matchAll(/['"]\.\/[^'"]+\.mjs([^'"]*)['"]/g))
      assert.equal(match[1], `?v=${version}`, name);
  }
  const published = await import(`../dist/src/music.mjs?v=${version}`);
  assert.equal(published.normalizeState().frets, 21);
  assert.equal(published.normalizeState({ instrument: 'bass' }).frets, 20);
});

test('every localized explorer ships reciprocal alternates, content, and working links', async () => {
  await import('../scripts/build.mjs');
  const dist = new URL('../dist/', import.meta.url);
  const files = await readdir(dist, { recursive: true });
  const editions = Object.entries(LANGUAGES).map(([lang, { tag }]) => {
    const path = lang === 'en' ? '/' : `/${lang}/`;
    return {
      lang,
      tag,
      url: new URL(path, siteOrigin).href,
      file: path.slice(1) + 'index.html',
    };
  });
  assert.deepEqual(
    files.filter((name) => name.endsWith('.html')).sort(),
    editions.map(({ file }) => file).sort(),
  );
  const alternates = Object.fromEntries(editions.map(({ lang, url }) => [lang, url]));
  alternates['x-default'] = siteOrigin + '/';
  for (const { lang, tag, url, file } of editions) {
    const html = await readFile(new URL(file, dist), 'utf8');
    assert.ok(html.includes(`<html lang="${tag}"`), file);
    assert.ok(html.includes(`<title>${escape(copy[lang].pageTitle)}</title>`), file);
    assert.ok(
      html.includes(`name="description" content="${escape(copy[lang].metaDescription)}"`),
      file,
    );
    assert.ok(html.includes(escape(copy[lang].explorerTitle)), file);
    assert.ok(html.includes(escape(copy[lang].license)), file);
    assert.doesNotMatch(html, />undefined<|<!-- page-metadata -->/);
    assert.doesNotMatch(
      html,
      /footer-resources|practice-example|practice-guides|edition-links/,
    );
    assert.deepEqual(
      [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map(
        (match) => match[1],
      ),
      [url],
    );
    const alternateLinks = [...html.matchAll(/<link\b[^>]*rel="alternate"[^>]*>/g)].map(
      ([link]) => [link.match(/hreflang="([^"]+)"/)[1], link.match(/href="([^"]+)"/)[1]],
    );
    assert.equal(alternateLinks.length, Object.keys(alternates).length);
    assert.deepEqual(Object.fromEntries(alternateLinks), alternates);
    assert.ok(html.includes(`property="og:url" content="${url}"`));
    assert.ok(html.includes(`property="og:locale" content="${tag.replace('-', '_')}"`));
    assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
    const revision = html.match(/src\/app\.mjs\?v=([a-f0-9]{12})/)[1];
    const preview = `${siteOrigin}/assets/tukany-social.jpg?v=${revision}`;
    assert.ok(html.includes(`property="og:image" content="${preview}"`));
    assert.ok(html.includes(`name="twitter:image" content="${preview}"`));
    const schema = JSON.parse(html.match(/id="page-schema">([^<]+)<\/script>/)[1]);
    const page = schema['@graph'].find((entity) => entity['@type'] === 'WebPage');
    const app = schema['@graph'].find((entity) => entity['@type'] === 'WebApplication');
    assert.equal(page.primaryImageOfPage.url, preview);
    assert.equal(app.image, `${siteOrigin}/assets/icon.png?v=${revision}`);
    assert.equal(page.url, url);
    assert.equal(page.inLanguage, tag);
    const links = [...html.matchAll(/<a\s[^>]*?href="([^"]+)"/g)].map(
      ([, href]) => new URL(href, url),
    );
    for (const target of links.filter((target) => target.origin === siteOrigin)) {
      const path = target.pathname.slice(1);
      assert.ok(
        files.includes(target.pathname.endsWith('/') ? path + 'index.html' : path),
        target.href,
      );
    }
    assert.ok(links.some((link) => link.href === 'https://lucasgmarques.com/'));
  }
});
