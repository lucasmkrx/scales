// SPDX-License-Identifier: MPL-2.0

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
    range: 'caged-major-1',
    ...changes,
  })}`;
const points = (page) =>
  page
    .locator('#board .note:not(.muted)')
    .evaluateAll((notes) =>
      notes.map((note) => `${note.dataset.row}:${note.dataset.fret}`).sort(),
    );
async function expectHeadstocksFacing(page, hand) {
  const glyphs = page.locator('#instrument .instrument-glyph');
  const x = hand === 'left' ? -1 : 1;
  await expect
    .poll(() =>
      glyphs.evaluateAll((icons) =>
        icons.map((icon) => {
          const transform = getComputedStyle(icon).transform;
          const matrix = new DOMMatrixReadOnly(
            transform === 'none' ? undefined : transform,
          );
          return [Math.sign(matrix.a), Math.sign(matrix.d)];
        }),
      ),
    )
    .toEqual([
      [x, 1],
      [x, 1],
    ]);
}
const pageErrors = new WeakMap();

test.beforeEach(({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  pageErrors.set(page, errors);
});
test.afterEach(({ page }) => expect(pageErrors.get(page)).toEqual([]));

test('choosing Left-handed mirrors the fretboard and preserves the shared fingering', async ({
  page,
}) => {
  await page.goto(url());
  await page.locator('#instrument-toggle').click();
  const hand = page.getByRole('group', { name: 'Orientation', exact: true });
  const right = hand.getByRole('radio', { name: 'Right-handed' });
  const left = hand.getByRole('radio', { name: 'Left-handed' });
  await expect(right).toBeChecked();
  await expect(left).not.toBeChecked();
  await expectHeadstocksFacing(page, 'right');
  const rightBox = await right.boundingBox();
  const leftBox = await left.boundingBox();
  expect(rightBox.x + rightBox.width).toBeLessThanOrEqual(leftBox.x + 1);

  const selected = await points(page);
  expect(selected).toHaveLength(17);
  const fretX = (fret) =>
    page
      .locator(`#board .note[data-row="0"][data-fret="${fret}"]`)
      .evaluate((note) => note.offsetLeft);
  expect(await fretX(12)).toBeGreaterThan(await fretX(0));
  const board = page.locator('#board .fretboard-map');
  const originalWidth = (await board.boundingBox()).width;

  await hand.locator('label:has(input[value="left"])').click();
  await expect(left).toBeChecked();
  await expect(right).not.toBeChecked();
  await expectHeadstocksFacing(page, 'left');
  expect(await fretX(12)).toBeLessThan(await fretX(0));
  expect((await board.boundingBox()).width).toBe(originalWidth);
  await expect(page.locator('#board')).toHaveAttribute('dir', 'rtl');
  const pattern = page.locator('[data-pattern="caged-major-1"]');
  await expect(pattern).toHaveText('Pattern 1');
  await expect(pattern).toHaveAccessibleDescription(/Frets 10–7/);
  expect(await points(page)).toEqual(selected);

  await page.keyboard.press('Escape');
  const shared = page.url();
  expect(new URL(shared).searchParams.get('hand')).toBe('left');
  await page.goto('/');
  await page.locator('#instrument-toggle').click();
  await expect(left).toBeChecked();
  await page.goto(url({ hand: 'right' }));
  await page.locator('#instrument-toggle').click();
  await expect(right).toBeChecked();
  await expect(page.locator('#board')).toHaveAttribute('dir', 'ltr');
  await page.goto(shared);
  await page.locator('#instrument-toggle').click();
  await expect(left).toBeChecked();
  expect(await points(page)).toEqual(selected);
});

test('keyboard instrument changes keep the current orientation and restore each tuning', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#instrument-toggle').click();
  const guitar = page.getByRole('radio', { name: 'Guitar', exact: true });
  const bass = page.getByRole('radio', { name: 'Bass', exact: true });
  const right = page.getByRole('radio', { name: 'Right-handed' });
  const left = page.getByRole('radio', { name: 'Left-handed' });
  const strings = page.getByRole('group', { name: 'Strings', exact: true });
  const frets = page.getByRole('group', { name: 'Frets', exact: true });
  const stringCount = (count) =>
    strings.getByRole('radio', { name: String(count), exact: true });
  const fretCount = (count) =>
    frets.getByRole('radio', { name: String(count), exact: true });
  const tuning = page.locator('#tuning');
  await expect(guitar).toBeChecked();
  await expect(right).toBeChecked();
  await right.press('ArrowRight');
  await expect(left).toBeFocused();
  await expect(left).toBeChecked();
  await tuning.click();
  await page.getByRole('option', { name: /^Drop D\b/i }).click();
  await expect(strings.getByRole('radio', { disabled: false })).toHaveCount(2);
  await guitar.press('ArrowRight');
  await expect(bass).toBeFocused();
  await expect(bass).toBeChecked();
  await expect(left).toBeChecked();
  await expect(page.locator('#board')).toHaveAttribute('dir', 'rtl');
  await expectHeadstocksFacing(page, 'left');
  await expect(strings.getByRole('radio', { disabled: false })).toHaveCount(3);
  await expect(stringCount(4)).toBeChecked();

  await stringCount(4).press('ArrowRight');
  await expect(stringCount(5)).toBeChecked();
  await expect(stringCount(5)).toBeFocused();
  for (const count of [20, 21, 22]) await fretCount(count).press('ArrowRight');
  await expect(fretCount(24)).toBeChecked();
  await expect(fretCount(24)).toBeFocused();
  await tuning.click();
  await page.getByRole('option', { name: /^Drop A\b/i }).click();
  await expect(page.locator('#tuning-name')).toHaveText('Drop A');
  expect(new URL(page.url()).searchParams.get('tuning')).toBe('drop-a');
  await tuning.press('Enter');
  await expect(tuning).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  const pitches = page.locator('#tuning-fields input');
  await expect(pitches).toHaveCount(5);
  await expect(pitches.first()).toBeFocused();
  await pitches.first().fill('G0');
  await page.locator('#apply-tuning').click();
  await expect(page.locator('#tuning-name')).toHaveText('Custom');
  expect(new URL(page.url()).searchParams.get('pitches')).toBe('G0 E1 A1 D2 G2');
  await expect(page.locator('#open-string-pitches > span')).toHaveCount(5);
  await expect(page.locator('#board .board-string')).toHaveCount(5);

  await left.press('ArrowLeft');
  await expect(right).toBeChecked();
  await expectHeadstocksFacing(page, 'right');
  await bass.press('ArrowLeft');
  await expect(guitar).toBeChecked();
  await expect(right).toBeChecked();
  await expect(page.locator('#board')).toHaveAttribute('dir', 'ltr');
  await expect(stringCount(6)).toBeChecked();
  await expect(fretCount(21)).toBeChecked();
  await expect(page.locator('#tuning-name')).toHaveText('Drop D');
  await expect(page.locator('#open-string-pitches > span')).toHaveCount(6);
  await right.press('ArrowRight');
  await guitar.press('ArrowRight');
  await page.reload();
  await page.locator('#instrument-toggle').click();
  await expect(left).toBeChecked();
  await page.goto('/');
  await page.locator('#instrument-toggle').click();
  await expect(bass).toBeChecked();
  await expect(left).toBeChecked();
  await expectHeadstocksFacing(page, 'left');
  await expect(stringCount(5)).toBeChecked();
  await expect(fretCount(24)).toBeChecked();
  await page.locator('#edit-pitches').click();
  await expect(pitches).toHaveCount(5);
  await expect(pitches.first()).toHaveValue('G0');
});

test('the highlighted segment and check follow clicks and drags in both themes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url());

  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.locator('#instrument-toggle').click();
    for (const [group, initial, other] of [
      ['instrument', 'guitar', 'bass'],
      ['hand', 'right', 'left'],
    ]) {
      const control = page.locator(`#${group} .switch-control`);
      const label = (value) => control.locator(`label:has(input[value="${value}"])`);
      const selected = async (value) => {
        const active = label(value);
        const inactive = label(value === initial ? other : initial);
        await expect(active.getByRole('radio')).toBeChecked();
        await expect(active.locator('.switch-check')).toBeVisible();
        await expect(inactive.locator('.switch-check')).toBeHidden();
        const face = await active.boundingBox();
        const fill = await control.locator('.switch-thumb').boundingBox();
        expect(Math.abs(fill.x + fill.width / 2 - face.x - face.width / 2)).toBeLessThan(
          3,
        );
        expect(fill.width).toBeGreaterThan(face.width * 0.85);
      };
      const drag = async (from, to) => {
        const start = await label(from).boundingBox();
        const end = await label(to).boundingBox();
        await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
        await page.mouse.down();
        await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
          steps: 5,
        });
        await page.mouse.up();
      };

      await selected(initial);
      await label(initial).click();
      await selected(initial);
      await label(other).click();
      await selected(other);
      await drag(other, initial);
      await selected(initial);
      await expect(label(initial).getByRole('radio')).toBeFocused();
    }
    await page.keyboard.press('Escape');
  }
});

test.describe('phone instrument setup', () => {
  test.use({ hasTouch: true });
  test('tapping a tuning preset updates the open strings, fretboard and shared URL', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(url({ range: 'full' }));
    await page.locator('#instrument-toggle').click();
    const tuning = page.getByRole('button', { name: /Tuning.*E standard/i });
    const list = page.locator('#choice-list');
    await expect(tuning).toHaveAttribute('aria-haspopup', 'listbox');
    await tuning.tap();
    await expect(tuning).toHaveAttribute('aria-expanded', 'true');
    await expect(list).toBeVisible();
    await expect(list).toHaveRole('listbox');
    const pitchDetails = list.locator('small:not(:empty)');
    await expect(pitchDetails.first()).toBeVisible();
    const pitchesFit = await pitchDetails.evaluateAll((labels) =>
      labels.every((label) => {
        const row = label.closest('[role="option"]').getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(label);
        const lines = [...range.getClientRects()];
        return lines.every(
          (line) =>
            line.top >= row.top &&
            line.bottom <= row.bottom &&
            line.left >= row.left &&
            line.right <= row.right,
        );
      }),
    );
    expect(pitchesFit).toBe(true);
    await expect(list.getByRole('option', { name: /^E standard\b/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await list.getByRole('option', { name: /^Drop D\b/i }).tap();
    const chosen = page.getByRole('button', { name: /Tuning.*Drop D/i });
    await expect(chosen).toHaveAttribute('aria-expanded', 'false');
    await expect(list).toBeHidden();
    await expect(page.locator('#open-string-pitches > span')).toHaveText([
      'D2',
      'A2',
      'D3',
      'G3',
      'B3',
      'E4',
    ]);
    await expect(
      page.locator('#board .note[data-row="5"][data-fret="0"]'),
    ).toHaveAttribute('data-midi', '38');
    expect(new URL(page.url()).searchParams.get('tuning')).toBe('drop-d');

    await chosen.press('Enter');
    await expect(list.getByRole('option', { name: /^Drop D\b/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await expect(list).toBeHidden();
    await expect(chosen).toBeFocused();
    await chosen.tap();
    const menu = await list.boundingBox();
    await page.touchscreen.tap(menu.x / 2, menu.y + menu.height / 2);
    await expect(list).toBeHidden();
    expect(new URL(page.url()).searchParams.get('tuning')).toBe('drop-d');
  });
  test('localized choices and numeric controls respond to taps at 320px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    for (const [lang, instrument, guitar, bass, orientation, right, left] of [
      [
        'en',
        'Instrument',
        'Guitar',
        'Bass',
        'Orientation',
        'Right-handed',
        'Left-handed',
      ],
      ['pt', 'Instrumento', 'Guitarra', 'Baixo', 'Orientação', 'Destro', 'Canhoto'],
      ['es', 'Instrumento', 'Guitarra', 'Bajo', 'Orientación', 'Diestro', 'Zurdo'],
    ]) {
      await page.goto(
        url({
          instrument: 'bass',
          strings: '6',
          tuning: 'bass-6-standard',
          hand: 'left',
          lang,
          range: 'full',
        }),
      );
      await page.locator('#instrument-toggle').tap();
      const instruments = page.getByRole('group', { name: instrument, exact: true });
      const hands = page.getByRole('group', { name: orientation, exact: true });
      await expect(
        instruments.getByRole('radio', { name: guitar, exact: true }),
      ).not.toBeChecked();
      await expect(
        instruments.getByRole('radio', { name: bass, exact: true }),
      ).toBeChecked();
      await expect(
        hands.getByRole('radio', { name: right, exact: true }),
      ).not.toBeChecked();
      await expect(hands.getByRole('radio', { name: left, exact: true })).toBeChecked();
      for (const [value, icon] of [
        ['guitar', 'telecaster-headstock'],
        ['bass', 'bass-headstock'],
      ]) {
        const glyph = instruments.locator(
          `label:has(input[value="${value}"]) .instrument-glyph`,
        );
        await expect(glyph).toBeVisible();
        await expect(glyph).toHaveAttribute('aria-hidden', 'true');
        const path = await glyph.evaluate(async (element) => {
          const mask = getComputedStyle(element).maskImage;
          const url = mask.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
          if (!url) return null;
          const image = new Image();
          image.src = url;
          await image.decode();
          return new URL(image.src).pathname;
        });
        expect(path).toBe(`/assets/instruments/${icon}.png`);
      }
      await expect(page.locator('#board .board-string')).toHaveCount(6);
      const controls = page.locator(
        '#instrument label, #hand label, #strings label, #frets label, #tuning',
      );
      const fits = await controls.evaluateAll((elements) =>
        elements.every((element) => {
          const box = element.getBoundingClientRect();
          return (
            box.width > 0 &&
            box.left >= 0 &&
            box.right <= innerWidth &&
            element.scrollWidth <= element.clientWidth + 1
          );
        }),
      );
      expect(fits).toBe(true);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBe(true);
      await page.locator('#strings label:has(input[value="5"])').tap();
      await page.locator('#frets label:has(input[value="22"])').tap();
      await expect(
        page.locator('#strings input[name="strings"][value="5"]'),
      ).toBeChecked();
      await expect(page.locator('#frets input[name="frets"][value="22"]')).toBeChecked();
      await expect(page.locator('#board .board-string')).toHaveCount(5);
      const query = new URL(page.url()).searchParams;
      expect(query.get('strings')).toBe('5');
      expect(query.get('frets')).toBe('22');
      await hands.locator('label:has(input[value="right"])').tap();
      await expect(hands.getByRole('radio', { name: right, exact: true })).toBeChecked();
      await instruments.locator('label:has(input[value="guitar"])').tap();
      await expect(
        instruments.getByRole('radio', { name: guitar, exact: true }),
      ).toBeChecked();
    }
  });
});
