import { expect, test } from '@playwright/test';

const workspace = '/?lang=en&instrument=guitar&root=9&scale=minor-pentatonic';
const service = 'https://www.googleapis.com/youtube/v3/search?**';
const videos = [
  ['track000001', 'A minor blues — 80 BPM', 'First channel'],
  ['track000002', 'A blues jam', 'Second channel'],
  ['track000003', 'Shuffle in A', 'Third channel'],
];
const items = videos.map(([id, title, channelTitle]) => ({
  id: { kind: 'youtube#video', videoId: id },
  snippet: {
    title,
    channelTitle,
    thumbnails: { medium: { url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` } },
  },
}));
async function mockApiKey(page) {
  await page.route('**/youtube-config.json*', (route) =>
    route.fulfill({ json: { apiKey: 'browser-test-fixture' } }),
  );
  await page.route('https://i.ytimg.com/**', (route) =>
    route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+h09sAAAAASUVORK5CYII=',
        'base64',
      ),
    }),
  );
}
test('search uses current music and filters on demand and persists only the style', async ({
  page,
}) => {
  const queries = [];
  await mockApiKey(page);
  await page.route(service, (route) => {
    queries.push(new URL(route.request().url()).searchParams.get('q').toLowerCase());
    return route.fulfill({ json: { items } });
  });
  await page.goto(workspace);
  await expect(page.locator('#backing-context')).toHaveText(
    'A Minor pentatonic · Guitar',
  );
  await page.locator('#backing-style-trigger').click();
  await page.getByRole('option', { name: 'Blues', exact: true }).click();
  await page.locator('#backing-tempo-trigger').click();
  await page.getByRole('option', { name: 'Slow', exact: true }).click();
  expect(queries).toEqual([]);
  await page.locator('#backing-find').click();
  await expect(page.locator('.backing-result')).toHaveCount(3);
  expect(queries).toHaveLength(1);
  expect(queries[0]).toContain('blues');
  expect(queries[0]).toMatch(/\ba\b/);
  expect(queries[0]).toContain('slow');
  await page.locator('#backing-style-trigger').click();
  await page.getByRole('option', { name: 'Funk', exact: true }).click();
  await page.locator('#scale-family-trigger').click();
  await page.getByRole('option', { name: 'Major & modes', exact: true }).click();
  await page.locator('[data-scale="dorian"]').click();
  await page.getByRole('radio', { name: 'Bass', exact: true }).check();
  await expect(page.locator('#backing-context')).toHaveText('A Dorian · Bass');
  expect(queries).toHaveLength(1);
  await page.locator('#backing-find').click();
  await expect(page.locator('.backing-result')).toHaveCount(3);
  expect(queries[1]).toContain('dorian');
  expect(queries[1]).toContain('funk');
  expect(queries[1]).toMatch(/bassless|no bass|without bass/);
  await page.reload();
  await expect(page.locator('#backing-style')).toHaveValue('funk');
  await expect(page.locator('#backing-tempo')).toHaveValue('any');
  expect(queries).toHaveLength(2);
});
test.describe('touch practice', () => {
  test.use({ hasTouch: true });
  test('mobile results play inline, switch tracks and retain the diagram and watch link', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await mockApiKey(page);
    await page.route(service, (route) => route.fulfill({ json: { items } }));
    await page.route('https://www.youtube.com/embed/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<title>Test video frame</title>',
      }),
    );
    await page.route('https://www.youtube.com/iframe_api', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `window.YT = {Player: class {
      constructor(frame, options) {
        this.frame = frame;
        if (frame.src.includes('track000002')) options.events.onError({data:101});
      }
      destroy() { this.frame.remove(); }
    }}; window.onYouTubeIframeAPIReady();`,
      }),
    );
    await page.goto(workspace);
    const url = page.url();
    const notes = page.locator('#board .note');
    const board = await notes.allTextContents();
    expect(board.length).toBeGreaterThan(0);
    await page.locator('#backing-tempo-trigger').tap();
    await page.getByRole('option', { name: 'Medium', exact: true }).tap();
    await page.locator('#backing-find').tap();
    const choices = page.locator('.backing-result');
    await expect(choices).toHaveCount(3);
    await expect(choices.first()).toContainText('First channel');
    await expect(choices.first().locator('img')).toBeVisible();
    await choices.first().tap();
    const frame = page.locator('#backing-embed iframe');
    await expect(frame).toHaveAttribute('src', /\/embed\/track000001\?.*autoplay=1/);
    await expect(choices.first()).toHaveAttribute('aria-current', 'true');
    await expect(frame).toBeInViewport({ ratio: 0.95 });
    await expect(page.locator('#board')).toBeInViewport();
    const dimensions = await frame.boundingBox();
    expect(dimensions.width).toBeGreaterThanOrEqual(200);
    expect(dimensions.height).toBeGreaterThanOrEqual(200);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    const prior = await frame.elementHandle();
    await choices.nth(1).tap();
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute('src', /\/embed\/track000002\?/);
    expect(await prior.evaluate((el) => el.isConnected)).toBe(false);
    await expect(page.locator('#backing-player-status')).toContainText(/play/i);
    await expect(page.locator('#backing-watch')).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=track000002',
    );
    await expect(choices).toHaveCount(3);
    expect(page.url()).toBe(url);
    expect(await notes.allTextContents()).toEqual(board);
    await page.locator('#backing-close').tap();
    await expect(frame).toHaveCount(0);
    await expect(choices.nth(1)).toBeFocused();
  });
});
test('empty, loading and failed searches leave the fretboard interactive', async ({
  page,
}) => {
  await mockApiKey(page);
  let release;
  const wait = new Promise((resolve) => {
    release = resolve;
  });
  let call = 0;
  await page.route(service, async (route) => {
    if (++call === 1) {
      await wait;
      return route.fulfill({ json: { items: [] } });
    }
    return route.fulfill({
      status: 403,
      json: { error: { errors: [{ reason: 'quotaExceeded' }] } },
    });
  });
  await page.goto(workspace);
  const find = page.locator('#backing-find');
  const status = page.locator('#backing-status');
  await find.click();
  try {
    await expect(find).toBeDisabled();
    await expect(status).toContainText(/search/i);
    await page.locator('#board .note').first().focus();
    await expect(page.locator('#board .note').first()).toBeFocused();
  } finally {
    release();
  }
  await expect(status).toContainText(/no .*tracks/i);
  await find.click();
  await expect(status).toContainText(/limit/i);
  await expect(find).toBeEnabled();
  await expect(page.locator('#board .note').first()).toBeVisible();
});
