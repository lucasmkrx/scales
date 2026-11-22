import test from 'node:test';
import { routes, siteOrigin } from '../src/site.mjs';
import { LANGUAGES } from '../src/locales.mjs';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
test('published assets use one revision across the entry point, module graph, and styles', async () => {
  await import('../scripts/build.mjs');
  const youtubeConfig = JSON.parse(
    await readFile(new URL('../dist/youtube-config.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual(Object.keys(youtubeConfig), ['apiKey']);
  assert.ok(youtubeConfig.apiKey === (process.env.YOUTUBE_API_KEY?.trim() || ''));
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const version = html.match(/src\/app\.mjs\?v=([a-f0-9]{12})/)[1];
  assert.ok(html.includes(`styles.css?v=${version}`));
  assert.ok(html.includes(`theme.js?v=${version}`));
  const css = await readFile(new URL('../dist/styles.css', import.meta.url), 'utf8');
  for (const [path, source] of [
    ['vendor/fontawesome.min.css', html],
    ['assets/icon.png', html],
    ['assets/marques-and-co.png', html],
    ['assets/fonts/fa-solid-900.woff2', css],
    ['assets/instruments/telecaster-headstock.png', css],
    ['assets/instruments/bass-headstock.png', css],
  ]) {
    assert.ok(source.includes(`./${path}?v=${version}`), path);
    assert.deepEqual(
      await readFile(new URL(`../dist/${path}`, import.meta.url)),
      await readFile(new URL(`../public/${path}`, import.meta.url)),
    );
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

test('the published HTML identifies each localized page before JavaScript runs', async () => {
  await import('../scripts/build.mjs');
  const dist = new URL('../dist/', import.meta.url);
  for (const [lang, route] of Object.entries(routes)) {
    for (const kind of ['home', 'guide', 'reference']) {
      const path = route[kind];
      const directory = new URL('.' + path, dist);
      const html = await readFile(new URL('index.html', directory), 'utf8');
      const url = siteOrigin + path;
      assert.ok(html.includes(`lang="${LANGUAGES[lang].tag}"`), path);
      assert.deepEqual(
        [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map(
          (match) => match[1],
        ),
        [url],
      );
      assert.ok(html.includes(`property="og:url" content="${url}"`));
      assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
      assert.ok(html.includes(siteOrigin + '/assets/tukany-social.jpg'));
      assert.ok(
        !html.includes('>undefined<') && !html.includes('<!-- page-metadata -->'),
      );
      for (const other of Object.values(routes))
        assert.ok(
          html.includes(
            `hreflang="${other.hreflang}" href="${siteOrigin}${other[kind]}"`,
          ),
        );
      assert.ok(
        html.includes(`hreflang="x-default" href="${siteOrigin}${routes.en[kind]}"`),
      );
      const schema = JSON.parse(html.match(/id="page-schema">([^<]+)<\/script>/)[1]);
      const page = schema['@graph'].find((entity) => entity['@type'] === 'WebPage');
      assert.equal(page.url, url);
      assert.equal(page.inLanguage, LANGUAGES[lang].tag);
      if (kind !== 'home') {
        assert.ok(html.includes(`type="text/markdown" href="${url}index.md"`));
        assert.match(await readFile(new URL('index.md', directory), 'utf8'), /^# /);
      }
    }
  }
});
