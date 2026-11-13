import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const baseState = {
  instrument: 'guitar',
  strings: '6',
  tuning: 'guitar-standard',
  hand: 'right',
  lang: 'en',
  root: '0',
  scale: 'major',
  frets: '24',
  spelling: 'both',
  neck: 'octave',
  range: 'full',
};
const url = (state = {}) => `/?${new URLSearchParams({ ...baseState, ...state })}`;
const marker = (page, id) => page.locator(`[data-pattern="${id}"]`);
const activeNotes = (page) => page.locator('#board .note:not(.muted)');
const points = (page) =>
  activeNotes(page).evaluateAll((notes) =>
    notes.map((note) => `${note.dataset.row}:${note.dataset.fret}`).sort(),
  );
const pageErrors = new WeakMap();

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  pageErrors.set(page, errors);
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test('C major uses the exact compact fingering and a keyboard-operable bracket', async ({
  page,
}) => {
  await page.goto(url());
  const first = marker(page, 'caged-major-1');
  await first.click();
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await expect(activeNotes(page)).toHaveCount(17);
  await expect(page.locator('#board .note[data-row="0"][data-fret="8"]')).not.toHaveClass(
    /muted/,
  );
  expect(
    await activeNotes(page).evaluateAll((notes) =>
      notes.every((note) => note.dataset.fret !== '12'),
    ),
  ).toBe(true);
  await expect(page.locator('#pattern-summary')).toContainText('Lowest note: B (7)');
  await first.press('Enter');
  await expect(first).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#pattern-summary')).toBeHidden();
  await first.press('Space');
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await expect(first).toBeFocused();
});

test('new pattern links restore and expanding the neck retains the same fingering', async ({
  page,
}) => {
  for (const state of [
    { scale: 'minor-blues', root: '9', range: 'blues-1' },
    { scale: 'diminished-hw', root: '4', range: 'four-per-string-1' },
  ]) {
    await page.goto(url(state));
    await expect(marker(page, state.range)).toHaveAttribute('aria-pressed', 'true');
    const selected = await points(page);
    await page
      .locator('#neck-view label')
      .filter({ has: page.locator('[value="full"]') })
      .click();
    await expect(marker(page, state.range)).toHaveAttribute('aria-pressed', 'true');
    expect(await points(page)).toEqual(selected);
    await page.reload();
    await expect(marker(page, state.range)).toHaveAttribute('aria-pressed', 'true');
    expect(await points(page)).toEqual(selected);
  }
});

test('inline settings remain contained across languages, phone widths, and handedness', async ({
  page,
}) => {
  for (const state of [
    { lang: 'en', hand: 'right', width: 320 },
    { lang: 'pt', hand: 'left', width: 390 },
    { lang: 'es', hand: 'left', width: 390 },
  ]) {
    await page.setViewportSize({ width: state.width, height: 844 });
    await page.goto(url({ lang: state.lang, hand: state.hand }));
    await expect(page.locator('#neck-octave-label')).toHaveText(
      state.hand === 'left' ? '12–0' : '0–12',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    const width = await page
      .locator('#board svg')
      .evaluate((board) => board.getBoundingClientRect().width);
    expect(width).toBe(657);
    await expect(page.locator('#instrument-settings')).toBeVisible();
    expect(await page.locator('dialog').count()).toBe(0);
  }
  for (const hand of ['right', 'left']) {
    await page.setViewportSize({ width: 1360, height: 900 });
    await page.goto(url({ hand, range: 'caged-major-1' }));
    await expect(marker(page, 'caged-major-1')).toHaveAttribute('aria-pressed', 'true');
    for (const width of [390, 1360]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(() =>
          page.locator('#board').evaluate((board) => {
            const viewport = board.getBoundingClientRect();
            const notes = [...board.querySelectorAll('.note:not(.muted)')].map((note) =>
              note.getBoundingClientRect(),
            );
            const bracket = board
              .querySelector('.pattern-range[aria-pressed="true"] .pattern-bracket')
              .getBoundingClientRect();
            const noteCenter =
              (Math.min(...notes.map((note) => note.left)) +
                Math.max(...notes.map((note) => note.right))) /
              2;
            const bracketCenter = (bracket.left + bracket.right) / 2;
            return [noteCenter, bracketCenter].every(
              (center) => center >= viewport.left && center <= viewport.right,
            );
          }),
        )
        .toBe(true);
      await expect(activeNotes(page)).toHaveCount(17);
    }
  }
});

test('mobile navigation reaches and focuses the fretboard without hiding settings', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url());
  await page.locator('#jump-to-board').click();
  await expect(page.locator('#scale-title')).toBeFocused();
  const heading = await page.locator('#scale-title').boundingBox();
  expect(heading.y).toBeGreaterThanOrEqual(0);
  expect(heading.y).toBeLessThan(300);
  await expect(page.locator('#instrument-settings')).toBeVisible();
});

test('custom formula drafts survive other settings and saved setups restore on a fresh visit', async ({
  page,
}) => {
  await page.goto(url());
  await expect(page.locator('#apply-scale')).toBeHidden();
  await page.locator('#formula-input').fill('1 2 b3 4 5 6 b7');
  await expect(page.locator('#apply-scale')).toBeVisible();
  await page.locator('#hand').selectOption('left');
  await expect(page.locator('#formula-input')).toHaveValue('1 2 b3 4 5 6 b7');
  await page.locator('#apply-scale').click();
  await expect(page).toHaveURL(/scale=custom/);
  await page.locator('#root').selectOption('9');
  await page.locator('#formula-input').fill('1 2 2');
  await page.locator('#apply-scale').click();
  await expect(page.locator('#formula-input')).toHaveAttribute('aria-invalid', 'true');
  await expect(page).toHaveURL(/formula=1\+2\+b3\+4\+5\+6\+b7/);
  await page.goto('/');
  await expect(page.locator('#hand')).toHaveValue('left');
  await expect(page.locator('#root')).toHaveValue('9');
  await expect(page.locator('#formula-input')).toHaveValue('1 2 b3 4 5 6 b7');
});

test('key spelling preserves distinct sharp and flat tonic names across reloads', async ({
  page,
}) => {
  await page.goto(url());
  await page.locator('#spelling').selectOption('key');
  await page.locator('#root').selectOption('F#');
  await expect(page.locator('#notes-strip')).toContainText('E♯');
  await page.locator('#root').selectOption('Gb');
  await expect(page.locator('#notes-strip')).toContainText('C♭');
  await page.reload();
  await expect(page.locator('#spelling')).toHaveValue('key');
  await expect(page.locator('#root')).toHaveValue('Gb');
  await expect(page.locator('#notes-strip')).toContainText('C♭');
});

test('scale playback and the tonic reference have independent stop controls', async ({
  page,
}) => {
  await page.goto(url());
  const drone = page.locator('#drone');
  await drone.click();
  await expect(drone).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#play').click();
  await expect(page.locator('#play')).toHaveClass(/playing/);
  await page.locator('#play').click();
  await expect(page.locator('#play')).not.toHaveClass(/playing/);
  await expect(drone).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#root').selectOption('2');
  await expect(drone).toHaveAttribute('aria-pressed', 'false');
  await drone.click();
  await expect(drone).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(drone).toHaveAttribute('aria-pressed', 'false');
});

test('PDF customization can cancel and then download a valid localized reference', async ({
  page,
}) => {
  let release;
  const libraryGate = new Promise((resolve) => (release = resolve));
  await page.route('**/vendor/fontkit.umd.min.js', async (route) => {
    await libraryGate;
    await route.continue();
  });
  await page.goto(url({ lang: 'es', scale: 'harmonic-minor', root: '9' }));
  await page.locator('#export').click();
  await expect(page.locator('#cancel-export')).toBeVisible();
  await page.locator('#cancel-export').click();
  release();
  await expect(page.locator('#export')).toBeEnabled();
  await expect(page.locator('#cancel-export')).toBeHidden();
  await expect(page.locator('#export-status')).toContainText('cancel');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#export').click(),
  ]);
  expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toMatch(/harmonic-minor.*-es\.pdf$/);
  const bytes = await readFile(await download.path());
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect(bytes.length).toBeGreaterThan(20000);
});
