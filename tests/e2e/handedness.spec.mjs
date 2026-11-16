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
const flipped = (page) =>
  page
    .locator('#hand .orientation-graphic')
    .evaluate(
      (graphic) => new DOMMatrixReadOnly(getComputedStyle(graphic).transform).m11 < -0.99,
    );
async function expectInstrumentArtwork(page, instrument) {
  const image = page.locator('#hand-instrument');
  await expect(image).toHaveAttribute('data-instrument', instrument);
  await expect(image).toHaveAttribute(
    'src',
    new RegExp(`/instruments/${instrument}\\.webp`),
  );
  await expect(image).toHaveAttribute('alt', '');
  await expect
    .poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0))
    .toBe(true);
  const proportions = await image.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      natural: element.naturalWidth / element.naturalHeight,
      rendered: parseFloat(style.width) / parseFloat(style.height),
    };
  });
  expect(proportions.rendered).toBeCloseTo(proportions.natural, 1);
}
const handLabels = {
  en: { right: 'Right-handed', left: 'Left-handed' },
  pt: { right: 'Destro', left: 'Canhoto' },
  es: { right: 'Diestro', left: 'Zurdo' },
};
async function expectReadableHandLabel(page, lang, hand) {
  const label = page.locator('#hand-label');
  await expect(label).toHaveText(handLabels[lang][hand]);
  await expect(label).toBeVisible();
  expect(
    await label.evaluate((element) => {
      const labelBounds = element.getBoundingClientRect();
      const buttonBounds = document.querySelector('#hand').getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(element);
      const textBounds = range.getBoundingClientRect();
      // Check the full written label, rather than just its clipped element box.
      const tolerance = 0.5;
      return (
        textBounds.width <= labelBounds.width + tolerance &&
        textBounds.left >= buttonBounds.left - tolerance &&
        textBounds.right <= buttonBounds.right + tolerance &&
        textBounds.top >= buttonBounds.top - tolerance &&
        textBounds.bottom <= buttonBounds.bottom + tolerance
      );
    }),
  ).toBe(true);
}
const pageErrors = new WeakMap();

test.beforeEach(({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  pageErrors.set(page, errors);
});
test.afterEach(({ page }) => expect(pageErrors.get(page)).toEqual([]));

test('clicking the instrument mirrors the fretboard and retains the exact selected fingering', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1360, height: 900 });
  await page.goto(url());
  const hand = page.locator('#hand');
  await expect(hand).toHaveAttribute('data-hand', 'right');
  await expect(hand).toHaveAccessibleName(/right-handed.*left-handed/i);
  await expectReadableHandLabel(page, 'en', 'right');
  await expectInstrumentArtwork(page, 'guitar');
  expect(await flipped(page)).toBe(false);
  const selected = await points(page);
  expect(selected).toHaveLength(17);
  const highC = page.locator('#board .note[data-row="0"][data-fret="8"]');
  const originalX = await highC.evaluate((note) => note.getBBox().x);
  const originalWidth = await page
    .locator('#board svg')
    .evaluate((svg) => svg.getBoundingClientRect().width);
  await hand.click();
  await expect(hand).toHaveAttribute('data-hand', 'left');
  await expect(hand).toHaveAccessibleName(/left-handed.*right-handed/i);
  await expectReadableHandLabel(page, 'en', 'left');
  await expect.poll(() => flipped(page)).toBe(true);
  await expect(page.locator('#neck-octave-label')).toHaveText('12–0');
  await expect(page.locator('[data-pattern="caged-major-1"]')).toContainText('10–7');
  expect(await points(page)).toEqual(selected);
  expect(
    await page.locator('#board svg').evaluate((svg) => svg.getBoundingClientRect().width),
  ).toBe(originalWidth);
  const mirroredX = await highC.evaluate((note) => note.getBBox().x);
  expect(mirroredX).not.toBe(originalX);
  await expect(page).toHaveURL(/hand=left/);
  await page.reload();
  await expect(hand).toHaveAttribute('data-hand', 'left');
  await page.goto('/');
  await expect(hand).toHaveAttribute('data-hand', 'left');
  expect(await points(page)).toEqual(selected);
  await page.goto(url({ hand: 'right' }));
  await expect(hand).toHaveAttribute('data-hand', 'right');
  await expect(page.locator('#neck-octave-label')).toHaveText('0–12');
  expect(await points(page)).toEqual(selected);
});

test('keyboard flipping keeps labels readable and honors reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto(url());
  const hand = page.locator('#hand');
  await hand.focus();
  await hand.press('Space');
  await expect(hand).toHaveAttribute('data-hand', 'left');
  await expect(hand).toBeFocused();
  expect(await flipped(page)).toBe(true);
  const presentation = await page
    .locator('#hand .orientation-graphic')
    .evaluate((graphic) => {
      const style = getComputedStyle(graphic);
      return { transition: style.transitionDuration, animation: style.animationName };
    });
  expect(
    presentation.transition.split(',').every((value) => parseFloat(value) === 0),
  ).toBe(true);
  expect(presentation.animation).toBe('none');
  expect(
    await page
      .locator('#hand-label')
      .evaluate((label) => getComputedStyle(label).transform),
  ).toBe('none');
  await hand.press('Enter');
  await expect(hand).toHaveAttribute('data-hand', 'right');
  await expect(hand).toBeFocused();
  expect(await flipped(page)).toBe(false);
  await expectReadableHandLabel(page, 'en', 'right');
});

test('the orientation control follows instrument variants and stays contained in each language and theme', async ({
  page,
}) => {
  for (const state of [
    {
      instrument: 'guitar',
      strings: '6',
      tuning: 'guitar-standard',
      width: 320,
      lang: 'en',
      hand: 'right',
      colorScheme: 'light',
    },
    {
      instrument: 'guitar',
      strings: '7',
      tuning: 'guitar-7-standard',
      width: 390,
      lang: 'pt',
      hand: 'left',
      colorScheme: 'dark',
    },
    {
      instrument: 'bass',
      strings: '4',
      tuning: 'bass-4-standard',
      width: 320,
      lang: 'es',
      hand: 'left',
      colorScheme: 'dark',
    },
    {
      instrument: 'bass',
      strings: '5',
      tuning: 'bass-5-standard',
      width: 390,
      lang: 'en',
      hand: 'right',
      colorScheme: 'light',
    },
    {
      instrument: 'bass',
      strings: '6',
      tuning: 'bass-6-standard',
      width: 1360,
      lang: 'pt',
      hand: 'left',
      colorScheme: 'dark',
    },
  ]) {
    const { width, colorScheme, ...music } = state;
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url({ ...music, range: 'full' }));
    const hand = page.locator('#hand');
    await expect(hand).toHaveAttribute('data-hand', state.hand);
    await expectReadableHandLabel(page, state.lang, state.hand);
    await expectInstrumentArtwork(page, state.instrument);
    await expect.poll(() => flipped(page)).toBe(state.hand === 'left');
    await expect(page.locator('#board .board-string')).toHaveCount(Number(state.strings));
    const name = await hand.getAttribute('aria-label');
    expect(name).toBeTruthy();
    expect(name).not.toMatch(/undefined|\{.*\}/);
    const bounds = await hand.boundingBox();
    // Firefox can report a 42px control as 41.999984px after 3D transforms.
    expect(bounds.width + 0.01).toBeGreaterThanOrEqual(44);
    expect(bounds.height + 0.01).toBeGreaterThanOrEqual(42);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    const before = await points(page);
    await hand.click();
    await expect(hand).toHaveAttribute(
      'data-hand',
      state.hand === 'right' ? 'left' : 'right',
    );
    await expectReadableHandLabel(
      page,
      state.lang,
      state.hand === 'right' ? 'left' : 'right',
    );
    expect(await points(page)).toEqual(before);
  }
  // Guitar was last used right-handed in the seven-string case. Returning to it
  // recalls that instrument's saved setup rather than copying the bass setting.
  await page.locator('#hand').click();
  await page
    .locator('#instrument label')
    .filter({ has: page.locator('[value="guitar"]') })
    .click();
  await expect(page.locator('#hand')).toHaveAttribute('data-hand', 'right');
  await expectInstrumentArtwork(page, 'guitar');
});
