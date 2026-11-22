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
  await expect(first).toHaveAccessibleName('Pattern 1');
  await expect(first.locator('.pattern-label')).toHaveText('Pattern 1');
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

test('keyboard focus moves to the next playable fret in either orientation', async ({
  page,
}) => {
  for (const hand of ['right', 'left']) {
    await page.goto(url({ hand }));
    const openE = page.locator('#board .note[data-row="0"][data-fret="0"]');
    const firstF = page.locator('#board .note[data-row="0"][data-fret="1"]');
    await openE.focus();
    await openE.press(hand === 'right' ? 'ArrowRight' : 'ArrowLeft');
    await expect(firstF).toBeFocused();
    await expect(firstF).toHaveAttribute('tabindex', '0');
    await expect(openE).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('#board .note[tabindex="0"]')).toHaveCount(1);
  }
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
      .locator('#board .fretboard-map')
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
  await expect(page.locator('#fretboard-heading')).toBeFocused();
  const heading = await page.locator('#fretboard-heading').boundingBox();
  expect(heading.y).toBeGreaterThanOrEqual(0);
  expect(heading.y).toBeLessThan(300);
  await expect(page.locator('#instrument-settings')).toBeVisible();
});

test('browse a family, choose a scale, and restore the selected family from a shared URL', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(url());
  const selected = page.locator('#scale-selection');
  const degrees = page.locator('#formula-degrees > span');
  const results = page.locator('#scale-results');
  const family = page.locator('#scale-family-trigger');
  const popup = page.getByRole('listbox');
  await expect(selected).toHaveText('C Major');
  await expect(family).toHaveAccessibleName('Scale family Common scales');
  const common = results.getByRole('button');
  await expect(common).toHaveCount(8);
  expect(
    await common.evaluateAll((choices) =>
      choices.every((choice) => choice.getBoundingClientRect().height >= 44),
    ),
  ).toBe(true);
  await page.getByRole('radio', { name: 'A', exact: true }).check();

  await family.click();
  await popup.getByRole('option', { name: 'Chord arpeggios' }).click();
  await expect(common).toHaveCount(12);
  await expect(selected).toHaveText('A Major');
  await results.locator('[data-scale="minor-triad"]').click();
  await expect(selected).toHaveText('A Minor triad');
  await expect(degrees).toHaveText(['1', '♭3', '5']);
  await expect(page.locator('#fretboard-heading')).toHaveText('Fretboard');

  await family.click();
  await popup.getByRole('option', { name: 'Major & modes', exact: true }).click();
  await expect(selected).toHaveText('A Minor triad');
  await family.press('Tab');
  await expect(results.locator('[data-scale="major"]')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  const dorian = results.locator('[data-scale="dorian"]');
  await expect(dorian).toBeFocused();
  await dorian.press('Enter');
  await expect(dorian).toBeFocused();
  await expect(dorian).toHaveAttribute('aria-pressed', 'true');
  await expect(selected).toHaveText('A Dorian');
  await expect(degrees).toHaveText(['1', '2', '♭3', '4', '5', '6', '♭7']);
  await expect(page).toHaveURL(/scale=dorian/);
  await page.reload();
  await expect(family).toHaveAccessibleName('Scale family Major & modes');
  await expect(dorian).toHaveAttribute('aria-pressed', 'true');
});

test('custom formula drafts survive other settings and saved setups restore on a fresh visit', async ({
  page,
}) => {
  await page.goto(url());
  const edit = page.locator('#edit-formula');
  const input = page.locator('#formula-input');
  const apply = page.locator('#apply-scale');
  const degrees = page.locator('#formula-degrees > span');
  await expect(input).toBeHidden();
  await edit.press('Enter');
  await expect(input).toBeFocused();
  await expect(apply).toBeDisabled();
  await input.fill('1 2 b3 4 5 6 b7');
  await expect(apply).toBeEnabled();
  await page.locator('#hand label:has(input[value="left"])').click();
  await expect(page.getByRole('radio', { name: 'Left-handed' })).toBeChecked();
  await expect(input).toHaveValue('1 2 b3 4 5 6 b7');
  await apply.click();
  await expect(page).toHaveURL(/scale=custom/);
  await expect(page.locator('#scale-family-trigger')).toHaveAccessibleName(
    'Scale family Custom',
  );
  await expect(page.locator('[data-scale="custom"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(edit).toBeFocused();
  await expect(degrees).toHaveText(['1', '2', '♭3', '4', '5', '6', '♭7']);
  await page.getByRole('radio', { name: 'A', exact: true }).check();
  await edit.click();
  await input.fill('1 2 2');
  await input.press('Enter');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(page).toHaveURL(/formula=1\+2\+b3\+4\+5\+6\+b7/);
  for (const [lang, message] of [
    ['pt', 'Comece pelo grau 1'],
    ['es', 'Empieza por el grado 1'],
    ['en', 'Start on 1'],
  ]) {
    await page.locator('#language').selectOption(lang);
    await expect(page.locator('#formula-error')).toContainText(message);
    await expect(input).toHaveValue('1 2 2');
  }
  await input.press('Escape');
  await expect(input).toBeHidden();
  await expect(edit).toBeFocused();
  await edit.click();
  await expect(input).toHaveValue('1 2 b3 4 5 6 b7');
  await input.fill('1 3 5');
  await page.locator('#cancel-formula').click();
  await expect(input).toBeHidden();
  await expect(edit).toBeFocused();
  await page.goto('/');
  await expect(page.getByRole('radio', { name: 'Left-handed' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'A', exact: true })).toBeChecked();
  await expect(degrees).toHaveText(['1', '2', '♭3', '4', '5', '6', '♭7']);
  await expect(page.locator('#scale-family')).toHaveValue('custom');
  await page.locator('#scale-family-trigger').click();
  await page.getByRole('option', { name: 'Pentatonic', exact: true }).click();
  await expect(page.locator('#scale-selection')).toHaveText('A Custom scale');
  await page.locator('[data-scale="minor-pentatonic"]').click();
  await expect(page).toHaveURL(/scale=minor-pentatonic/);
  await expect(page.locator('#scale-family option[value="custom"]')).toHaveCount(0);
});

test('note names change the diagram and keep all twelve root choices stable', async ({
  page,
}) => {
  await page.goto(url({ root: '6', tonic: 'Gb', spelling: 'key' }));
  const roots = page.getByRole('group', { name: 'Root note', exact: true });
  const names = roots.getByRole('radio');
  await expect(names).toHaveCount(12);
  const rootLabels = page.locator('#root-notes label');
  const rootNames = [
    'C',
    'C♯D♭',
    'D',
    'D♯E♭',
    'E',
    'F',
    'F♯G♭',
    'G',
    'G♯A♭',
    'A',
    'A♯B♭',
    'B',
  ];
  const chosen = roots.getByRole('radio', { name: 'F♯ / G♭', exact: true });
  const tones = page.locator('#notes-strip');
  const keyMenu = page.locator('#key-tonic-trigger');
  const before = await points(page);
  for (const [mode, first, fourth] of [
    ['flat', 'G♭', 'B'],
    ['sharp', 'F♯', 'B'],
    ['both', 'F♯/G♭', 'B'],
    ['key', 'G♭', 'C♭'],
  ]) {
    await page.locator('#spelling').selectOption(mode);
    await expect(rootLabels).toHaveText(rootNames);
    await expect(chosen).toBeChecked();
    await expect(page.locator('#scale-selection')).toHaveText('G♭ Major');
    await expect(tones.locator('button[data-pitch="6"]')).toHaveText(first);
    await expect(tones.locator('button[data-pitch="11"]')).toHaveText(fourth);
    expect(await keyMenu.isVisible()).toBe(mode === 'key');
    expect(await points(page)).toEqual(before);
  }
  await keyMenu.click();
  await page.getByRole('option', { name: 'F♯', exact: true }).click();
  await expect(keyMenu).toBeFocused();
  await expect(page.locator('#scale-selection')).toHaveText('F♯ Major');
  await expect(tones).toContainText('E♯');
  await page.reload();
  await expect(chosen).toBeChecked();
  await expect(keyMenu).toHaveText('F♯');
  await roots.getByRole('radio', { name: 'C♯ / D♭', exact: true }).check();
  await expect(keyMenu).toHaveText('Automatic');
  await expect(page.locator('#scale-selection')).toHaveText('D♭ Major');
  expect(new URL(page.url()).searchParams.has('tonic')).toBe(false);

  await page.goto(url({ root: '11', tonic: 'Cb', spelling: 'key' }));
  await expect(names).toHaveCount(12);
  await expect(roots.getByRole('radio', { name: 'B', exact: true })).toBeChecked();
  await expect(page.locator('#scale-selection')).toHaveText('C♭ Major');
  await expect(keyMenu).toHaveText('C♭');
  await keyMenu.click();
  await page.getByRole('option', { name: 'Automatic', exact: true }).click();
  await expect(keyMenu).toBeHidden();
  await expect(page.locator('#spelling-trigger')).toBeFocused();
  await expect(page.locator('#scale-selection')).toHaveText('B Major');
});

test('auditioning a note highlights its pitch on the fretboard and in the reference row', async ({
  page,
}) => {
  await page.goto(url());
  const referenceNote = page.locator('#notes-strip button[data-pitch="0"]');
  const soundingTone = page.locator('#notes-strip button.sounding');
  await referenceNote.click();
  await expect(soundingTone).toHaveAttribute('data-pitch', '0');
  await expect(page.locator('#board .note.sounding').first()).toBeVisible();
  await expect(page.locator('#note-readout')).toContainText('unison');
  await expect(soundingTone).toHaveCount(0);
  await expect(referenceNote).toHaveAttribute('aria-pressed', 'true');
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
