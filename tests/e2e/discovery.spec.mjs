import { test, expect } from '@playwright/test';
import { routes, siteOrigin } from '../../src/site.mjs';

test.describe('static discovery pages', () => {
  test.use({ javaScriptEnabled: false });

  test('each language has a canonical explorer and a readable, linked practice guide', async ({
    page,
  }) => {
    for (const [lang, tag] of [
      ['en', 'en-US'],
      ['pt', 'pt-BR'],
      ['es', 'es-419'],
    ]) {
      const { home, guide } = routes[lang];
      const response = await page.goto(home);
      expect(response.ok()).toBe(true);
      await expect(page.locator('html')).toHaveAttribute('lang', tag);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        new URL(home, siteOrigin).href,
      );
      await expect(page.locator('.workspace')).toBeHidden();
      await expect(page.locator('#page-title')).toBeVisible();
      const guideLink = page.locator('[data-guide-link]').first();
      await expect(guideLink).toBeVisible();
      await guideLink.click();
      await expect(page).toHaveURL((url) => url.pathname === guide);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        new URL(guide, siteOrigin).href,
      );
      await expect(page.locator('html')).toHaveAttribute('lang', tag);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.getByRole('heading', { level: 2 }).count()).toBeGreaterThan(1);
    }
  });
});

test('language changes retain the practice session and point metadata and assets to working URLs', async ({
  page,
}) => {
  await page.goto('/?lang=pt#fretboard');
  await expect(page.locator('#board .fretboard-map')).toBeVisible();
  await expect(page).toHaveURL(
    (url) => url.pathname === '/pt/' && !url.search && url.hash === '#fretboard',
  );
  await page.getByRole('radio', { name: 'A', exact: true }).check();
  await page.locator('#edit-formula').click();
  const draft = page.locator('#formula-input');
  await draft.fill('1 2 b3 4 5 6 b7');
  await page.locator('#language').selectOption('es');
  await expect(page).toHaveURL(
    (url) => url.pathname === '/es/' && url.searchParams.get('root') === '9',
  );
  await expect(draft).toHaveValue('1 2 b3 4 5 6 b7');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-419');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://tukany.com/es/',
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    'https://tukany.com/es/',
  );
  await expect(page.locator('[data-guide-link]').first()).toHaveJSProperty(
    'href',
    new URL(routes.es.guide, page.url()).href,
  );
  await expect(page.locator('[data-reference-link]').first()).toHaveJSProperty(
    'href',
    new URL(routes.es.reference, page.url()).href,
  );
  const credits = page.locator('a[data-i18n="iconCredits"]');
  const creditsURL = await credits.evaluate((link) => link.href);
  expect(new URL(creditsURL).pathname).toBe('/assets/instruments/credits.html');
  expect((await page.request.get(creditsURL)).ok()).toBe(true);

  await page.goto('/?utm_source=lesson');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-419');
  await expect(page).toHaveURL(
    (url) => url.pathname === '/es/' && url.search === '?utm_source=lesson',
  );
  await expect(page.getByRole('radio', { name: 'A', exact: true })).toBeChecked();
  await page.goto('/pt/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.locator('#board .fretboard-map')).toBeVisible();
  await expect(page).toHaveURL((url) => url.pathname === '/pt/' && !url.search);
  await page.locator('#share').click();
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('lang') === 'pt' &&
      url.searchParams.get('root') === '9' &&
      url.searchParams.has('instrument') &&
      url.searchParams.has('range') &&
      url.searchParams.has('neck'),
  );
});

test('a project-path deployment retains its prefix across language and guide navigation', async ({
  page,
}) => {
  // Mount the same build below /tukany/, matching a GitHub Pages project URL.
  await page.route('**/tukany/**', async (route) => {
    const url = new URL(route.request().url());
    url.pathname = url.pathname.slice('/tukany'.length);
    await route.fulfill({ response: await route.fetch({ url: url.href }) });
  });
  await page.goto('/tukany/pt/?instrument=bass');
  await expect(page.locator('#board .fretboard-map')).toBeVisible();
  await expect(page.locator('input[name="instrument"][value="bass"]')).toBeChecked();
  await page.locator('#language').selectOption('es');
  await expect(page).toHaveURL((url) => url.pathname === '/tukany/es/');
  const creditsUrl = await page
    .locator('a[data-i18n="iconCredits"]')
    .evaluate((link) => link.href);
  expect(new URL(creditsUrl).pathname).toBe('/tukany/assets/instruments/credits.html');
  await page.locator('[data-guide-link]').first().click();
  await expect(page).toHaveURL((url) => url.pathname === '/tukany' + routes.es.guide);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
