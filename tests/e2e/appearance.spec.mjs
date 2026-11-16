import { test, expect } from '@playwright/test';

const url = (changes = {}) =>
  `/?${new URLSearchParams({
    instrument: 'guitar',
    strings: '6',
    tuning: 'guitar-standard',
    root: '0',
    scale: 'major',
    frets: '21',
    hand: 'right',
    lang: 'en',
    labels: 'notes',
    spelling: 'both',
    range: 'caged-major-1',
    neck: 'octave',
    ...changes,
  })}`;
const errors = new WeakMap();

test.beforeEach(({ page }) => {
  const messages = [];
  page.on('pageerror', (error) => messages.push(error.message));
  errors.set(page, messages);
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

test('the initial appearance follows the device and updates while using System', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  let release;
  const applicationGate = new Promise((resolve) => (release = resolve));
  await page.route('**/src/app.mjs*', async (route) => {
    await applicationGate;
    await route.continue();
  });
  try {
    await page.goto(url(), { waitUntil: 'commit' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'system');
    await expect(page.locator('#board svg')).toHaveCount(0);
  } finally {
    release();
  }
  await expect(page.locator('#board svg')).toBeVisible();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(new URL(page.url()).searchParams.has('theme')).toBe(false);
});

test('keyboard theme changes persist without replacing the selected fretboard', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(url());
  await expect(page.locator('#board .note:not(.muted)')).toHaveCount(17);
  await page.locator('#drone').click();
  await expect(page.locator('#drone')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#play').click();
  await expect(page.locator('#play')).toHaveClass(/playing/);
  await page.evaluate(() => {
    window.appearanceBoard = document.querySelector('#board svg');
    window.appearancePattern = document.querySelector('[data-pattern="caged-major-1"]');
    window.appearanceNoteColors = [...document.querySelectorAll('.note:not(.muted)')].map(
      (note) => getComputedStyle(note.querySelector('circle:last-of-type')).fill,
    );
  });
  const toggle = page.locator('#theme-toggle');
  await toggle.focus();
  await toggle.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toBeFocused();
  await expect(page.locator('#play')).toHaveClass(/playing/);
  await expect(page.locator('#drone')).toHaveAttribute('aria-pressed', 'true');
  expect(
    await page.evaluate(
      () =>
        window.appearanceBoard === document.querySelector('#board svg') &&
        window.appearancePattern ===
          document.querySelector('[data-pattern="caged-major-1"]') &&
        JSON.stringify(window.appearanceNoteColors) ===
          JSON.stringify(
            [...document.querySelectorAll('.note:not(.muted)')].map(
              (note) => getComputedStyle(note.querySelector('circle:last-of-type')).fill,
            ),
          ),
    ),
  ).toBe(true);
  await page.locator('#play').click();
  await page.locator('#drone').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'dark');
  await expect(page.locator('[data-pattern="caged-major-1"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await toggle.press('Space');
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await toggle.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'dark');
  await toggle.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('an explicit theme survives music and language changes with localized control names', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(url());
  await page.locator('#theme-toggle').click();
  const names = [];
  for (const lang of ['en', 'pt', 'es']) {
    await page.locator('#language').selectOption(lang);
    await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const name = await page.locator('#theme-toggle').getAttribute('aria-label');
    expect(name).toBeTruthy();
    expect(name).not.toMatch(/undefined|\{.*\}/);
    names.push(name);
  }
  expect(new Set(names).size).toBe(3);
  await page.locator('#root').selectOption('9');
  await page
    .locator('#instrument label')
    .filter({ has: page.locator('[value="bass"]') })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'dark');
  await expect(page.locator('#root')).toHaveValue('9');
});

test('blocked storage falls back to the device and allows an in-memory override', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage blocked', 'SecurityError');
      },
    });
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(url());
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'system');
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('#board .note:not(.muted)')).toHaveCount(17);
});

test('dark appearance keeps controls contained and preserves mirrored pattern geometry', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  for (const state of [
    { width: 320, lang: 'en', hand: 'right' },
    { width: 390, lang: 'pt', hand: 'left' },
    { width: 1360, lang: 'es', hand: 'left' },
  ]) {
    await page.setViewportSize({ width: state.width, height: 900 });
    await page.goto(url({ lang: state.lang, hand: state.hand }));
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#board .note:not(.muted)')).toHaveCount(17);
    await expect(page.locator('#neck-octave-label')).toHaveText(
      state.hand === 'left' ? '12–0' : '0–12',
    );
    expect(
      await page
        .locator('#board svg')
        .evaluate((svg) => svg.getBoundingClientRect().width),
    ).toBe(657);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    const toggle = await page.locator('#theme-toggle').boundingBox();
    expect(toggle.x).toBeGreaterThanOrEqual(0);
    expect(toggle.x + toggle.width).toBeLessThanOrEqual(state.width);
    const surfaces = await page.evaluate(() => [
      getComputedStyle(document.body).backgroundColor,
      getComputedStyle(document.querySelector('#board rect')).fill,
    ]);
    for (const color of surfaces) {
      const channels = color
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number);
      expect(Math.max(...channels)).toBeLessThan(160);
    }
  }
});

test('reduced motion disables control and fretboard animations during interaction', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto(url());
  await page.locator('#play').click();
  await expect(page.locator('#play')).toHaveClass(/playing/);
  await expect(page.locator('.note.sounding').first()).toBeVisible();
  const styles = await page.evaluate(() => {
    const targets = [
      document.querySelector('#theme-toggle'),
      document.querySelector('#board svg'),
      document.querySelector('.note.sounding'),
      document.querySelector('.note.sounding circle:first-child'),
      document.querySelector('.scale-choice[aria-pressed="true"]'),
    ].map((element) => getComputedStyle(element));
    targets.push(getComputedStyle(document.querySelector('#neck-view'), '::before'));
    return targets.map((style) => ({
      animation: style.animationName,
      transitions: style.transitionDuration.split(',').map((value) => parseFloat(value)),
    }));
  });
  for (const style of styles) {
    expect(style.animation).toBe('none');
    expect(style.transitions.every((duration) => duration === 0)).toBe(true);
  }
  await page.locator('#play').click();
});
