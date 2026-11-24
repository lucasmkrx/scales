// SPDX-License-Identifier: MPL-2.0

import { test, expect } from '@playwright/test';
import { siteOrigin } from '../../src/site.mjs';
import { copy } from '../../src/i18n.mjs';
import { LANGUAGES } from '../../src/locales.mjs';

test('a crawler can fetch every sitemap entry and the assistant directory', async ({
  request,
}) => {
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain(`Sitemap: ${siteOrigin}/sitemap.xml`);
  const directory = await request.get('/llms.txt');
  expect(directory.ok()).toBe(true);
  expect(directory.headers()['content-type']).toContain('text/plain');
  const index = await request.get('/sitemap.xml');
  expect(index.ok()).toBe(true);
  const entries = [...(await index.text()).matchAll(/<loc>([^<]+)<\/loc>/g)];
  expect(entries.length).toBeGreaterThan(0);
  for (const [, location] of entries) {
    const url = new URL(location);
    expect(url.origin).toBe(siteOrigin);
    const response = await request.get(url.pathname, { maxRedirects: 0 });
    expect(response.status(), location).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
    expect(await response.text()).toContain(`rel="canonical" href="${url.href}"`);
  }
});

test.describe('static explorer', () => {
  test.use({ javaScriptEnabled: false });

  for (const [lang, { tag }] of Object.entries(LANGUAGES)) {
    test(`${tag} displays its title and instructions without JavaScript`, async ({
      page,
    }) => {
      const path = lang === 'en' ? '/' : `/${lang}/`;
      const response = await page.goto(path);
      expect(response.ok()).toBe(true);
      await expect(page.locator('html')).toHaveAttribute('lang', tag);
      await expect(page).toHaveTitle(copy[lang].pageTitle);
      await expect(
        page.getByRole('heading', { name: copy[lang].explorerTitle }),
      ).toBeVisible();
      await expect(page.getByText(copy[lang].noScript)).toBeVisible();
      await expect(page.locator('.workspace')).toBeHidden();
    });
  }
});

test('language changes retain the practice session on the homepage', async ({ page }) => {
  await page.goto('/?lang=pt#fretboard');
  await expect(page.locator('#board .fretboard-map')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page).toHaveURL(
    (url) => url.pathname === '/' && url.hash === '#fretboard',
  );
  await page.getByRole('radio', { name: 'A', exact: true }).check();
  const pitches = await page.locator('#formula-degrees .formula-note').allTextContents();
  await page.locator('#language').selectOption('es');
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === '/' &&
      url.searchParams.get('lang') === 'es' &&
      url.hash === '#fretboard',
  );
  await expect(page.locator('#formula-degrees .formula-note')).toHaveText(pitches);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-ES');
  await expect(page.locator('#keyboard-notes')).toContainText(
    'Pulsa Intro o la barra espaciadora',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    siteOrigin + '/es/',
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    siteOrigin + '/es/',
  );
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
    'content',
    'es_ES',
  );

  await page.goto('/?utm_source=lesson');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-ES');
  await expect(page).toHaveURL(
    (url) => url.pathname === '/' && url.search === '?utm_source=lesson',
  );
  await expect(page.getByRole('radio', { name: 'A', exact: true })).toBeChecked();
  await page.goto('/?lang=pt');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', { value: undefined }),
  );
  await page.locator('#share').click();
  await expect(page).toHaveURL(
    (url) => url.pathname === '/' && url.search === '?key=A&lang=pt',
  );
  const shared = new URL(await page.locator('#share-url').inputValue());
  expect(shared.pathname + shared.search).toBe('/pt/?key=A');
  const preview = await page.request.get(shared.href);
  expect(await preview.text()).toContain('property="og:locale" content="pt_BR"');
});

test('an old practice link copies as a compact setup and restores across preferences', async ({
  page,
}) => {
  await page.goto(
    '/?instrument=guitar&strings=6&tuning=guitar-standard&hand=left&lang=en&root=5&scale=minor-blues&frets=21&labels=notes&allNotes=false&range=full#top',
  );
  const compact = '?key=F&scale=minor-blues&hand=left';
  await expect(page).toHaveURL((url) => url.search === compact && url.hash === '#top');
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', { value: undefined }),
  );
  await page.locator('#share').click();
  const shared = new URL(await page.locator('#share-url').inputValue());
  expect(shared.search).toBe(compact);
  expect(shared.hash).toBe('');
  expect(new URL(page.url()).hash).toBe('#top');

  await page.goto('/?key=D&instrument=bass&strings=5&frets=24&notes=all&lang=pt');
  await expect(page.locator('#board .board-string')).toHaveCount(5);
  await expect(page.locator('#allNotes')).toBeChecked();
  await page.goto(shared.href);
  await expect(page.locator('#fretboard-heading')).toHaveText('F Minor blues');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await expect(page.locator('#setup-summary')).toHaveText('Guitar · E standard');
  await expect(page.locator('#board')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#board .board-string')).toHaveCount(6);
  await expect(page.locator('#board .fret-label').last()).toHaveText('21');
  await expect(page.locator('#allNotes')).not.toBeChecked();
});

test('a project-path deployment retains its prefix when switching language', async ({
  page,
}) => {
  // Mount the build below /tukany/, matching a GitHub Pages project URL.
  await page.route('**/tukany/**', async (route) => {
    const url = new URL(route.request().url());
    url.pathname = url.pathname.slice('/tukany'.length);
    await route.fulfill({ response: await route.fetch({ url: url.href }) });
  });
  await page.goto('/tukany/?instrument=bass&lang=pt');
  await expect(page.locator('#board .fretboard-map')).toBeVisible();
  await expect(page.locator('input[name="instrument"][value="bass"]')).toBeChecked();
  await page.locator('#language').selectOption('es');
  await expect(page).toHaveURL(
    (url) => url.pathname === '/tukany/' && url.searchParams.get('lang') === 'es',
  );
  await page.reload();
  await expect(page.locator('#board .fretboard-map')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-ES');

  await page.goto('/tukany/fr/?key=G&instrument=bass#fretboard');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr-FR');
  await expect(page.getByRole('radio', { name: 'G', exact: true })).toBeChecked();
  await expect(page.locator('#board .board-string')).toHaveCount(4);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    siteOrigin + '/fr/',
  );
  await page.locator('#language').selectOption('en');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await expect(page.locator('#board .board-string')).toHaveCount(4);
  await expect(page.getByRole('radio', { name: 'G', exact: true })).toBeChecked();
});
