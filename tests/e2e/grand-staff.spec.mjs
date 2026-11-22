import { test, expect } from '@playwright/test';

const url =
  '/?instrument=guitar&strings=6&tuning=guitar-standard&frets=24&root=0&scale=major&neck=octave&range=full';
const black = 'rgb(0, 0, 0)';
const boardPitches = (page, filter = '') =>
  page
    .locator(`#board .note${filter}`)
    .evaluateAll((notes) =>
      [...new Set(notes.map((note) => Number(note.dataset.midi)))].sort((a, b) => a - b),
    );
const staffPitches = (page, filter = '') =>
  page
    .locator(`#staff-notation [data-staff-midi]${filter}`)
    .evaluateAll((notes) => notes.map((note) => Number(note.dataset.staffMidi)));

async function expectStaffColors(page, monochromeInk) {
  const pitches = await page
    .locator('#staff-notation [data-staff-midi]')
    .evaluateAll((notes) =>
      notes.map((note) => {
        const midi = note.dataset.staffMidi;
        const head = getComputedStyle(note.querySelector('.staff-notehead'));
        const fret = document.querySelector(
          `#board [data-midi="${midi}"]:not(.muted):not(.outside)`,
        );
        return {
          midi,
          fill: head.fill,
          opacity:
            Number(head.fillOpacity) *
            Number(head.opacity) *
            Number(getComputedStyle(note).opacity),
          fretColor: fret && getComputedStyle(fret).backgroundColor,
        };
      }),
    );
  for (const { midi, fill, opacity, fretColor } of pitches) {
    const expectedFill = monochromeInk ?? fretColor;
    if (expectedFill) {
      expect(fill, `notehead color at MIDI ${midi}`).toBe(expectedFill);
      expect(opacity, `full opacity at MIDI ${midi}`).toBe(1);
    } else {
      expect(opacity, `inactive MIDI ${midi} remains visible`).toBeGreaterThan(0);
      expect(opacity, `inactive MIDI ${midi} is faded`).toBeLessThan(1);
    }
  }
}

test('the staff shows each sounding pitch once and retains the whole neck view when a pattern is selected', async ({
  page,
}) => {
  await page.goto(url);
  await expect(page.locator('#staff-notation').getByRole('img')).toBeVisible();
  const initial = await boardPitches(page);
  expect(await staffPitches(page)).toEqual(initial);
  expect(await page.locator('#board [data-midi="64"]').count()).toBeGreaterThan(1);
  expect(initial).toEqual(expect.arrayContaining([40, 52, 64, 76]));
  await expectStaffColors(page, black);

  const bracket = page.locator('#board [data-pattern="caged-major-1"]');
  await bracket.click();
  const pattern = await boardPitches(page, ':not(.muted)');
  expect(pattern.length).toBeLessThan(initial.length);
  expect(await staffPitches(page)).toEqual(initial);
  expect(await staffPitches(page, ':not(.is-muted)')).toEqual(pattern);
  expect(await staffPitches(page, '.is-in-pattern')).toEqual(pattern);
  await expect(page.locator('#staff-notation .staff-pattern-halo')).toHaveCount(0);
  await expectStaffColors(page);
  await bracket.click();
  expect(await staffPitches(page)).toEqual(initial);
  await expectStaffColors(page, black);

  await page.locator('#allNotes').check();
  expect(await staffPitches(page)).toEqual(await boardPitches(page));
  expect(await staffPitches(page, '.is-outside')).toEqual(
    await boardPitches(page, '.outside'),
  );
  expect(await staffPitches(page)).toContain(42);
  await expectStaffColors(page, black);
  await page.locator('#neck-view label:has(input[value="full"])').click();
  expect(await staffPitches(page)).toEqual(await boardPitches(page));
  expect((await staffPitches(page)).at(-1)).toBe(88);
});

test('only a selected pattern colors accidental and natural noteheads in either theme', async ({
  page,
}) => {
  await page.goto(url);
  await page.getByRole('radio', { name: 'G', exact: true }).check();
  await page.locator('#allNotes').check();
  const bracket = page.locator('#board [data-pattern="caged-major-1"]');
  const sharp = page.locator('#staff-notation [data-staff-midi="42"] .staff-notehead');
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const ink =
      theme === 'light'
        ? black
        : await page
            .locator('.staff-lines')
            .first()
            .evaluate((lines) => getComputedStyle(lines).stroke);
    await expectStaffColors(page, ink);
    await bracket.click();
    await expect(sharp).toHaveCSS('fill', 'rgb(255, 255, 255)');
    await expect(
      page.locator('#staff-notation [data-staff-midi="40"] .staff-notehead'),
    ).toBeAttached();
    await expectStaffColors(page);
    const outline = await sharp.evaluate((head) => {
      const { stroke, strokeOpacity, strokeWidth, fill } = getComputedStyle(head);
      return (
        stroke !== 'none' &&
        stroke !== 'rgba(0, 0, 0, 0)' &&
        stroke !== fill &&
        Number(strokeOpacity) > 0 &&
        parseFloat(strokeWidth) > 0
      );
    });
    expect(outline, `white F♯ notehead has a visible outline in ${theme} mode`).toBe(
      true,
    );
    await bracket.click();
    await expectStaffColors(page, ink);
  }
});

test('inspecting or playing a note marks its exact octave on the staff', async ({
  page,
}) => {
  await page.goto(url);
  const selected = page.locator('#staff-notation .is-selected');
  const highE = page.locator('#board [data-row="0"][data-fret="0"]');
  await highE.click();
  await expect(selected).toHaveAttribute('data-staff-midi', '64');
  await expect(page.locator('#staff-range')).toContainText('E4');
  await expectStaffColors(page, black);
  await highE.press('ArrowRight');
  await expect(selected).toHaveAttribute('data-staff-midi', '65');
  await expect(page.locator('#staff-range')).toContainText('F4');

  await page.locator('#notes-strip [data-pitch="4"]').click();
  await expect(selected).toHaveAttribute('data-staff-midi', '40');
  await expect(page.locator('#staff-range')).toContainText('E2');
});

test('the staff follows bass tuning and scrolls within a phone viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(url);
  await page.locator('#instrument label:has(input[value="bass"])').click();
  expect(await staffPitches(page)).toEqual(await boardPitches(page));
  expect((await staffPitches(page))[0]).toBe(28);
  await page.locator('#allNotes').check();
  await expect(page.locator('#staff-notation')).toBeVisible();
  expect(
    await page
      .locator('#staff-notation')
      .evaluate(
        (staff) =>
          staff.scrollWidth > staff.clientWidth &&
          document.documentElement.scrollWidth <= innerWidth,
      ),
  ).toBe(true);
  const clefs = page.locator('#staff-notation .staff-clef-column');
  const left = (await clefs.boundingBox()).x;
  await page.locator('#board [data-row="0"][data-fret="12"]').focus();
  const staff = page.locator('#staff-notation');
  expect(await staff.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  expect((await clefs.boundingBox()).x).toBeCloseTo(left, 0);
  const selected = await staff.locator('.is-selected').boundingBox();
  const viewport = await staff.boundingBox();
  expect(selected.x).toBeGreaterThanOrEqual(left + (await clefs.boundingBox()).width);
  expect(selected.x + selected.width).toBeLessThanOrEqual(viewport.x + viewport.width);
  await page.locator('#board [data-pattern]').first().click();
  const firstPatternNote = await staff.locator('.is-in-pattern').first().boundingBox();
  expect(firstPatternNote.x).toBeGreaterThanOrEqual(
    left + (await clefs.boundingBox()).width,
  );
  expect(firstPatternNote.x + firstPatternNote.width).toBeLessThanOrEqual(
    viewport.x + viewport.width,
  );
});
