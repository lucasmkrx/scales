import { expect, test } from '@playwright/test';

const workspace = '/?lang=en&instrument=guitar&root=9&scale=minor-pentatonic';

// Intercept the first navigation too, which occurs before the new tab is available.
async function recordExternalRequests(context, baseURL) {
  const requests = [];
  await context.route(
    (url) => url.origin !== new URL(baseURL).origin,
    (route) => {
      const request = route.request();
      requests.push({ url: request.url(), type: request.resourceType() });
      return route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>Search destination</title>',
      });
    },
  );
  return requests;
}

async function searchInNewTab(context, action) {
  const [tab] = await Promise.all([context.waitForEvent('page'), action()]);
  await tab.waitForURL('https://www.youtube.com/results?**');
  await tab.waitForLoadState();
  expect(await tab.evaluate(() => window.opener === null)).toBe(true);
  const url = new URL(tab.url());
  expect([...url.searchParams.keys()]).toEqual(['search_query']);
  await tab.close();
  return url;
}

test('opens YouTube on demand with the current music, style and tempo', async ({
  page,
  context,
  baseURL,
}) => {
  const requests = await recordExternalRequests(context, baseURL);
  await page.goto(workspace);
  const find = page.getByRole('button', { name: /search youtube/i });
  await expect(page.locator('#backing-context')).toHaveText(
    'A Minor pentatonic · Guitar',
  );
  await page.locator('#backing-style-trigger').click();
  await page.getByRole('option', { name: 'Blues', exact: true }).click();
  await page.locator('#backing-tempo-trigger').click();
  await page.getByRole('option', { name: 'Slow', exact: true }).click();
  expect(requests).toEqual([]);

  const originalURL = page.url();
  const notes = page.locator('#board .note');
  const diagram = await notes.allTextContents();
  expect(diagram.length).toBeGreaterThan(0);
  const first = await searchInNewTab(context, () => find.press('Enter'));
  expect(first.searchParams.get('search_query')).toMatch(/A minor blues.*guitar.*slow/i);
  expect(requests).toEqual([{ url: first.href, type: 'document' }]);
  expect(page.url()).toBe(originalURL);
  expect(await notes.allTextContents()).toEqual(diagram);

  await page.getByRole('radio', { name: 'D', exact: true }).check();
  await page.locator('#scale-family-trigger').click();
  await page.getByRole('option', { name: 'Major & modes', exact: true }).click();
  await page.locator('[data-scale="dorian"]').click();
  await page.getByRole('radio', { name: 'Bass', exact: true }).check();
  await page.locator('#backing-style-trigger').click();
  await page.getByRole('option', { name: 'Funk', exact: true }).click();
  await expect(page.locator('#backing-context')).toHaveText('D Dorian · Bass');
  expect(requests).toHaveLength(1);
  const second = await searchInNewTab(context, () => find.click());
  expect(second.searchParams.get('search_query')).toMatch(
    /D dorian funk.*bassless.*slow/i,
  );
  expect(requests).toEqual([
    { url: first.href, type: 'document' },
    { url: second.href, type: 'document' },
  ]);

  await page.reload();
  await expect(page.locator('#backing-style')).toHaveValue('funk');
  await expect(page.locator('#backing-tempo')).toHaveValue('any');
  expect(requests).toHaveLength(2);
});

test.describe('touch practice', () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 740 } });

  test('opens the search on a phone and leaves the fretboard interactive', async ({
    page,
    context,
    baseURL,
  }) => {
    const requests = await recordExternalRequests(context, baseURL);
    await page.goto(workspace);
    await page.locator('#backing-tempo-trigger').tap();
    await page.getByRole('option', { name: 'Medium', exact: true }).tap();
    const find = page.getByRole('button', { name: /search youtube/i });
    await find.scrollIntoViewIfNeeded();
    await expect(find).toBeInViewport({ ratio: 1 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);

    const originalURL = page.url();
    const search = await searchInNewTab(context, () => find.tap());
    expect(search.searchParams.get('search_query')).toMatch(/A minor.*medium/i);
    expect(requests).toEqual([{ url: search.href, type: 'document' }]);
    expect(page.url()).toBe(originalURL);
    await page.getByRole('radio', { name: 'E', exact: true }).check();
    await expect(page.locator('#backing-context')).toHaveText(
      'E Minor pentatonic · Guitar',
    );
    await expect(page.locator('#board .note').first()).toBeVisible();
  });
});
