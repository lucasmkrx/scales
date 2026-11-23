import { expect, test } from '@playwright/test';

const workspace = '/?lang=en&instrument=guitar&root=9&scale=minor-pentatonic';

async function recordExternalRequests(context, baseURL) {
  const requests = [];
  await context.route(
    (url) => url.origin !== new URL(baseURL).origin,
    (route) => {
      if (new URL(route.request().url()).pathname === '/iframe_api') {
        return route.fulfill({
          contentType: 'application/javascript',
          body: `window.YT = {Player: class {
            constructor(frame, options) {
              window.reportTestPlaybackError = (code) => options.events.onError({data: code});
            }
            destroy() {}
          }};
          window.onYouTubeIframeAPIReady();`,
        });
      }
      requests.push(route.request().url());
      return route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>YouTube video</title>',
      });
    },
  );
  return requests;
}

test('YouTube search uses the current selection and opens a separate tab during playback', async ({
  page,
  context,
  baseURL,
}) => {
  const requests = await recordExternalRequests(context, baseURL);
  await page.goto(workspace);
  const search = page.getByRole('link', { name: /search youtube/i });
  await expect(search).toBeVisible();
  await expect(search).toHaveAttribute('target', '_blank');
  const rel = (await search.getAttribute('rel')).split(/\s+/);
  expect(rel).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
  const firstQuery = new URL(await search.getAttribute('href')).searchParams.get(
    'search_query',
  );
  expect(firstQuery).toMatch(/\bA\b/i);
  expect(firstQuery).toMatch(/minor pentatonic/i);
  expect(firstQuery).toMatch(/guitar/i);
  expect(firstQuery).toMatch(/backing track/i);

  await page.getByRole('radio', { name: 'D', exact: true }).check();
  await page.locator('[data-scale="major"]').click();
  await page.locator('#instrument-toggle').click();
  await page.getByRole('radio', { name: 'Bass', exact: true }).check();
  const url = new URL(await search.getAttribute('href'));
  expect(url.origin + url.pathname).toBe('https://www.youtube.com/results');
  const query = url.searchParams.get('search_query');
  expect(query).toMatch(/\bD\b/i);
  expect(query).toMatch(/major/i);
  expect(query).toMatch(/bassless/i);
  expect(query).toMatch(/backing track/i);
  expect(requests).toEqual([]);

  const workspaceURL = page.url();
  const track = page.locator('#backing-list').getByRole('button').first();
  await track.click();
  const player = page.locator('#backing-player');
  const frame = await player.elementHandle();
  const playerURL = await player.getAttribute('src');
  const [results] = await Promise.all([context.waitForEvent('page'), search.click()]);
  await expect(results).toHaveURL(url.href);
  expect(await results.evaluate(() => window.opener === null)).toBe(true);
  await expect(page).toHaveURL(workspaceURL);
  await expect(track).toHaveAttribute('aria-current', 'true');
  await expect(player).toHaveAttribute('src', playerURL);
  expect(await frame.evaluate((node) => node.isConnected)).toBe(true);
});

test('choosing a track plays it in place and retains it while changing diagram labels', async ({
  page,
  context,
  baseURL,
}) => {
  const requests = await recordExternalRequests(context, baseURL);
  await page.goto(workspace);
  await expect(page.locator('#backing-context')).toHaveText(
    'A Minor pentatonic · Guitar',
  );
  const panel = page.getByRole('region', { name: 'Backing tracks' });
  await expect(panel.locator('select, [aria-haspopup="listbox"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Play in\b/i })).toHaveCount(0);
  const choices = page.locator('#backing-list').getByRole('button');
  const choice = choices.filter({ hasText: 'Organ trio · minor blues' });
  await expect(choice.locator('.backing-tags > span')).toHaveText(['Blues', '60 BPM']);
  const metal = choices.filter({ hasText: 'A Minor Heavy Metal' });
  await expect(metal.locator('.backing-tags > span')).toHaveText(['Metal', '150 BPM']);
  await expect(choices.locator('.backing-tags > span')).toHaveCount(
    2 * (await choices.count()),
  );
  const embed = page.locator('iframe#backing-player[src*="/embed/"]');
  await expect(embed).toHaveCount(0);
  expect(requests).toEqual([]);

  const originalURL = page.url();
  const notes = page.locator('#board .note');
  const diagram = await notes.allTextContents();
  expect(diagram.length).toBeGreaterThan(0);
  await choice.press('Enter');
  await expect(embed).toBeVisible();
  await expect(page.locator('#backing-list')).toBeVisible();
  await expect(metal).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Back to tracks', includeHidden: true }),
  ).toHaveCount(0);
  await expect(page.locator('#backing-current')).toHaveText('Organ trio · minor blues');
  const src = new URL(await embed.getAttribute('src'));
  expect(src.origin).toBe('https://www.youtube.com');
  expect(src.pathname).toMatch(/^\/embed\/[\w-]{11}$/);
  expect(src.searchParams.get('autoplay')).toBe('1');
  expect(src.searchParams.get('rel')).toBe('0');
  expect(src.searchParams.get('origin')).toBe(new URL(originalURL).origin);
  await expect.poll(() => requests).toEqual([src.href]);
  expect(context.pages()).toHaveLength(1);
  expect(page.url()).toBe(originalURL);
  expect(await notes.allTextContents()).toEqual(diagram);

  const originalPlayer = await embed.elementHandle();
  await page.getByRole('radio', { name: 'Degrees', exact: true }).check();
  await expect(notes.first()).toBeVisible();
  await expect(embed).toHaveAttribute('src', src.href);
  expect(await originalPlayer.evaluate((node) => node.isConnected)).toBe(true);
  expect(requests).toEqual([src.href]);

  await page.getByRole('radio', { name: 'D', exact: true }).check();
  await expect(embed).toHaveCount(0);
  await page.locator('#scale-family-trigger').click();
  await page.getByRole('option', { name: 'Major & modes', exact: true }).click();
  await page.locator('[data-scale="dorian"]').click();
  await page.locator('#instrument-toggle').click();
  await page.getByRole('radio', { name: 'Bass', exact: true }).check();
  await expect(page.locator('#backing-context')).toHaveText('D Dorian · Bass');
  const funky = choices.filter({ hasText: 'Funky Fresh Groove' });
  await expect(funky.locator('.backing-tags > span')).toHaveText([
    'Funk',
    'Tempo unlisted',
  ]);
  expect(requests).toEqual([src.href]);
  await funky.click();
  await expect(embed).toBeVisible();
  await expect(embed).not.toHaveAttribute('src', src.href);
  await expect.poll(() => requests.length).toBe(2);

  await page.goto('/?lang=en&instrument=guitar&root=5&scale=locrian');
  const locrian = choices.filter({ hasText: 'Locrian light rock' });
  await expect(locrian.locator('.backing-tags > span')).toHaveText(['Rock', '100 BPM']);
  await locrian.click();
  await expect(embed).toBeVisible();
  await expect.poll(() => requests.length).toBe(3);

  await page.goto(
    '/?lang=en&instrument=guitar&root=5&scale=custom&formula=1%20b2%20%234',
  );
  await expect(choices).toHaveCount(1);
  await expect(choices.locator('.backing-tags > span')).toHaveText([
    'Drone',
    'Unmetered',
  ]);
  await expect(embed).toHaveCount(0);
  expect(requests).toHaveLength(3);
});

test('selecting a different track replaces the player and selecting it again closes it', async ({
  page,
  context,
  baseURL,
}) => {
  const requests = await recordExternalRequests(context, baseURL);
  await page.goto('/?lang=en&instrument=guitar&root=0&scale=major');
  const choices = page.locator('#backing-list').getByRole('button');
  const player = page.locator('iframe#backing-player');
  await choices.first().click();
  await expect(player).toHaveAttribute('src', /\/embed\//);
  const original = await player.getAttribute('src');
  await expect.poll(() => requests).toEqual([original]);
  const originalFrame = await player.elementHandle();
  await expect(choices.first()).toHaveAttribute('aria-current', 'true');
  await choices.nth(1).press('Enter');
  await expect(player).toHaveCount(1);
  await expect(player).not.toHaveAttribute('src', original);
  expect(await originalFrame.evaluate((node) => node.isConnected)).toBe(false);
  await expect(page.locator('#backing-list [aria-current="true"]')).toHaveCount(1);
  await expect(choices.nth(1)).toHaveAttribute('aria-current', 'true');
  await expect(choices.first()).toHaveAttribute('aria-expanded', 'false');
  await expect(choices.nth(1)).toHaveAccessibleName(/^Close player · /);
  await expect(choices.nth(1)).toHaveAttribute('aria-expanded', 'true');
  const selected = new URL(await player.getAttribute('src'));
  expect(selected.origin).toBe('https://www.youtube.com');
  expect(selected.pathname).toMatch(/^\/embed\/[\w-]{11}$/);
  await expect.poll(() => requests).toEqual([original, selected.href]);
  const secondFrame = await player.elementHandle();
  await choices.nth(1).press('Space');
  await expect(player).toHaveCount(0);
  expect(await secondFrame.evaluate((node) => node.isConnected)).toBe(false);
  await expect(page.locator('#backing-playback')).toBeHidden();
  await expect(choices.nth(1)).toHaveAttribute('aria-expanded', 'false');
  await expect(choices.nth(1)).toHaveAccessibleName(/^Play · /);
  await expect(page.locator('#backing-list [aria-current]')).toHaveCount(0);
  await expect(choices.nth(1)).toBeFocused();
  expect(requests).toEqual([original, selected.href]);
  await choices.nth(1).click();
  await expect(player).toHaveAttribute('src', selected.href);
  await expect.poll(() => requests).toEqual([original, selected.href, selected.href]);
});

test('a YouTube embed restriction gives an in-app recovery and a fresh retry', async ({
  page,
  context,
  baseURL,
}) => {
  const requests = await recordExternalRequests(context, baseURL);
  await page.goto(workspace);
  const tracks = page.locator('#backing-list').getByRole('button');
  await tracks.first().click();
  const player = page.locator('#backing-player');
  const src = await player.getAttribute('src');
  await expect.poll(() => requests).toEqual([src]);
  await page.waitForFunction(() => typeof window.reportTestPlaybackError === 'function');
  await page.evaluate(() => window.reportTestPlaybackError(101));
  await expect(page.locator('#backing-player-status')).toContainText('unavailable');
  await tracks.first().click();
  await expect(player).toHaveCount(0);
  await expect(page.locator('#backing-player-status')).toBeHidden();
  expect(requests).toEqual([src]);
  await tracks.first().click();
  await expect(player).toBeVisible();
  await expect(page.locator('#backing-player-status')).toBeHidden();
  await expect.poll(() => requests).toEqual([src, src]);
});

test('tonic-chord practice stays labeled and playable when the optional YouTube API is blocked', async ({
  page,
  context,
  baseURL,
}) => {
  await recordExternalRequests(context, baseURL);
  await context.route('https://www.youtube.com/iframe_api', (route) => route.abort());
  await page.goto('/?lang=en&instrument=bass&root=0&scale=bebop-dominant');
  const tracks = page.locator('#backing-list').getByRole('button');
  const chord = tracks.filter({ hasText: 'C7 · Tonic chord' });
  await expect(chord.locator('.backing-tags > span')).toHaveText([
    'Solo piano',
    '78 BPM',
  ]);
  await expect(page.locator('#backing-fallback')).toContainText('Practice over C7');
  await expect(tracks).toHaveCount(2);
  await chord.click();
  await expect(page.locator('#backing-player')).toHaveAttribute(
    'src',
    /\/embed\/iGlDt6mFU6k/,
  );
  await expect(tracks).toHaveCount(2);
  await page.getByRole('button', { name: 'Close player', exact: true }).click();
  await expect(chord).toBeFocused();
  await expect(page.locator('#backing-fallback')).toBeVisible();
});

test.describe('touch practice', () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 740 } });

  test('shows all matching tracks and plays in Tukany on a phone with legacy preferences', async ({
    page,
    context,
    baseURL,
  }) => {
    const requests = await recordExternalRequests(context, baseURL);
    await page.addInitScript(() => {
      localStorage.setItem('scales.backingDestination', 'youtube');
      localStorage.setItem('scales.backingStyle', 'metal');
    });
    await page.goto(workspace);
    const list = page.locator('#backing-list');
    const choices = list.getByRole('button');
    const track = page.getByRole('button', { name: /organ trio · minor blues/i });
    await track.scrollIntoViewIfNeeded();
    await expect(track).toBeInViewport({ ratio: 1 });
    const count = await choices.count();
    expect(count).toBeGreaterThan(1);
    expect(requests).toEqual([]);
    const originalURL = page.url();
    await track.tap();
    const player = page.locator('iframe#backing-player');
    await expect(player).toBeVisible();
    await expect(choices).toHaveCount(count);
    expect(
      await list.evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
    ).toBe(true);
    const embedURL = new URL(await player.getAttribute('src'));
    expect(embedURL.origin).toBe('https://www.youtube.com');
    expect(embedURL.pathname).toBe('/embed/1UYjjVPhQ58');
    expect(embedURL.searchParams.get('playsinline')).toBe('1');
    expect(context.pages()).toHaveLength(1);
    await expect(page).toHaveURL(originalURL);
    await expect.poll(() => requests).toEqual([embedURL.href]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await track.tap();
    await expect(player).toHaveCount(0);
    await expect(choices).toHaveCount(count);
    await expect(track).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('radio', { name: 'E', exact: true }).check();
    await expect(page.locator('#backing-context')).toHaveText(
      'E Minor pentatonic · Guitar',
    );
    await expect(page.locator('#board .note').first()).toBeVisible();
    await expect(player).toHaveCount(0);
    expect(requests).toHaveLength(1);
  });
});
