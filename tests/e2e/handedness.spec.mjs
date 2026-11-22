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
const points = (page) =>
  page
    .locator('#board .note:not(.muted)')
    .evaluateAll((notes) =>
      notes.map((note) => `${note.dataset.row}:${note.dataset.fret}`).sort(),
    );
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
  const hand = page.getByRole('group', { name: 'Orientation', exact: true });
  const right = hand.getByRole('radio', { name: 'Right-handed' });
  const left = hand.getByRole('radio', { name: 'Left-handed' });
  await expect(right).toBeChecked();
  await expect(left).not.toBeChecked();

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
  expect(await fretX(12)).toBeLessThan(await fretX(0));
  expect((await board.boundingBox()).width).toBe(originalWidth);
  await expect(page.locator('#neck-octave-label')).toHaveText('12–0');
  const pattern = page.locator('[data-pattern="caged-major-1"]');
  await expect(pattern).toHaveText('Pattern 1');
  await expect(pattern).toHaveAccessibleDescription(/Frets 10–7/);
  expect(await points(page)).toEqual(selected);

  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', { value: undefined }),
  );
  await page.locator('#share').click();
  const shared = await page.locator('#share-url').inputValue();
  expect(new URL(shared).searchParams.get('hand')).toBe('left');
  await page.goto('/');
  await expect(left).toBeChecked();
  await page.goto(url({ hand: 'right' }));
  await expect(right).toBeChecked();
  await expect(page.locator('#neck-octave-label')).toHaveText('0–12');
  await page.goto(shared);
  await expect(left).toBeChecked();
  expect(await points(page)).toEqual(selected);
});

test('keyboard choices restore each instrument’s orientation, fret count, and tuning', async ({
  page,
}) => {
  await page.goto('/');
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
  await right.press('ArrowLeft');
  await expect(left).toBeFocused();
  await expect(left).toBeChecked();
  await tuning.click();
  await page.getByRole('option', { name: /^Drop D\b/i }).click();
  await expect(strings.getByRole('radio', { disabled: false })).toHaveCount(2);
  await guitar.press('ArrowRight');
  await expect(bass).toBeFocused();
  await expect(bass).toBeChecked();
  await expect(right).toBeChecked();
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
  expect(new URL(page.url()).searchParams.get('tuning')).toBe('bass-5-drop-a');
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
  expect(new URL(page.url()).searchParams.get('customTuning')).toBe('G0 E1 A1 D2 G2');
  await expect(page.locator('#open-string-pitches > span')).toHaveCount(5);
  await expect(page.locator('#board .board-string')).toHaveCount(5);

  await bass.press('ArrowLeft');
  await expect(guitar).toBeChecked();
  await expect(left).toBeChecked();
  await expect(stringCount(6)).toBeChecked();
  await expect(fretCount(21)).toBeChecked();
  await expect(page.locator('#tuning-name')).toHaveText('Drop D');
  await expect(page.locator('#open-string-pitches > span')).toHaveCount(6);
  await guitar.press('ArrowRight');
  await page.reload();
  await expect(bass).toBeChecked();
  await expect(right).toBeChecked();
  await expect(stringCount(5)).toBeChecked();
  await expect(fretCount(24)).toBeChecked();
  await page.locator('#edit-pitches').click();
  await expect(pitches).toHaveCount(5);
  await expect(pitches.first()).toHaveValue('G0');
});

test('track clicks toggle and directional drags select the side released', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url());
  for (const [group, initial, other, initialSide] of [
    ['instrument', 'guitar', 'bass', -1],
    ['hand', 'right', 'left', 1],
  ]) {
    const track = page.locator(`#${group} .switch-track`);
    const selected = (value) => page.locator(`#${group} input[value="${value}"]`);
    await expect(selected(initial)).toBeChecked();
    await track.click();
    await expect(selected(other)).toBeChecked();
    const { x, y, width, height } = await track.boundingBox();
    const middle = x + width / 2;
    const row = y + height / 2;
    const drag = async (side) => {
      await page.mouse.move(middle, row);
      await page.mouse.down();
      await page.mouse.move(middle + side * width * 0.4, row, { steps: 5 });
      await page.mouse.up();
    };
    // Dragging farther toward the active side should leave that option selected.
    await drag(-initialSide);
    await expect(selected(other)).toBeChecked();
    await drag(initialSide);
    await expect(selected(initial)).toBeChecked();
    await expect(selected(initial)).toBeFocused();
  }
});

test.describe('phone instrument setup', () => {
  test.use({ hasTouch: true });
  test('tapping a tuning preset updates the open strings, fretboard and shared URL', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(url({ range: 'full' }));
    const tuning = page.getByRole('button', { name: /Tuning.*E standard/i });
    const list = page.locator('#choice-list');
    await expect(tuning).toHaveAttribute('aria-haspopup', 'listbox');
    await tuning.tap();
    await expect(tuning).toHaveAttribute('aria-expanded', 'true');
    await expect(list).toBeVisible();
    await expect(list).toHaveRole('listbox');
    const pitchLines = await list.locator('small:not(:empty)').evaluateAll((labels) =>
      labels.map((label) => {
        const row = label.closest('[role="option"]').getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(label);
        const lines = [...range.getClientRects()];
        return {
          wrapped: lines.length > 1,
          fits: lines.every((line) => line.top >= row.top && line.bottom <= row.bottom),
        };
      }),
    );
    expect(pitchLines.some((label) => label.wrapped)).toBe(true);
    expect(pitchLines.every((label) => label.fits)).toBe(true);
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
    expect(new URL(page.url()).searchParams.get('tuning')).toBe('guitar-drop-d');

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
    expect(new URL(page.url()).searchParams.get('tuning')).toBe('guitar-drop-d');
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
      await hands.locator('.switch-track').tap();
      await expect(hands.getByRole('radio', { name: right, exact: true })).toBeChecked();
      await instruments.locator('.switch-track').tap();
      await expect(
        instruments.getByRole('radio', { name: guitar, exact: true }),
      ).toBeChecked();
    }
  });
});
