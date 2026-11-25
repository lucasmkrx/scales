// SPDX-License-Identifier: MPL-2.0

import { test, expect } from '@playwright/test';

const url =
  '/?instrument=guitar&strings=6&tuning=guitar-standard&frets=24&root=0&scale=major&range=full';
const black = 'rgb(0, 0, 0)';
const white = 'rgb(255, 255, 255)';
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

function luminance(rgb) {
  const [r, g, b] = rgb.match(/[\d.]+/g).map((channel) => {
    const s = Number(channel) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function expectStaffColors(page, monochromeInk) {
  const dark = (await page.locator('html').getAttribute('data-theme')) === 'dark';
  const staffInk = await page
    .locator('.staff-score')
    .evaluate((score) => getComputedStyle(score).color);
  const pitches = await page
    .locator('#staff-notation [data-staff-midi]')
    .evaluateAll((notes) =>
      notes.map((note) => {
        const midi = note.dataset.staffMidi;
        const head = getComputedStyle(note.querySelector('.staff-notehead'));
        const stem = getComputedStyle(note.querySelector('.staff-stem'));
        const letters = [...note.querySelectorAll('.staff-pitch-letter')];
        const fret = document.querySelector(
          `#board [data-midi="${midi}"]:not(.muted):not(.outside)`,
        );
        return {
          midi,
          fill: head.fill,
          headStroke: head.stroke,
          accidental: note
            .querySelector('.staff-notehead')
            .classList.contains('accidental-pitch'),
          stemColor: stem.fill,
          stemStroke: stem.stroke,
          writtenLetter: note.querySelector('title').textContent[0],
          letters: letters.map((letter) => letter.textContent),
          letterColor: letters.length ? getComputedStyle(letters[0]).fill : null,
          opacity:
            Number(head.fillOpacity) *
            Number(head.opacity) *
            Number(getComputedStyle(note).opacity),
          fretColor: fret && getComputedStyle(fret).backgroundColor,
        };
      }),
    );
  for (const pitch of pitches) {
    const active = !monochromeInk && pitch.fretColor;
    const expectedInk = monochromeInk ?? pitch.fretColor;
    expect(pitch.headStroke, `notehead border at MIDI ${pitch.midi}`).toBe(
      active && pitch.accidental ? (dark ? 'rgb(34, 33, 36)' : black) : 'none',
    );
    expect(pitch.letters, `pitch label at MIDI ${pitch.midi}`).toEqual(
      active ? [pitch.writtenLetter] : [],
    );
    if (expectedInk) {
      expect(pitch.fill, `notehead color at MIDI ${pitch.midi}`).toBe(expectedInk);
      expect(pitch.stemColor, `neutral stem at MIDI ${pitch.midi}`).toBe(staffInk);
      expect(['none', staffInk], `neutral stem stroke at MIDI ${pitch.midi}`).toContain(
        pitch.stemStroke,
      );
      expect(pitch.opacity, `full opacity at MIDI ${pitch.midi}`).toBe(1);
    } else {
      expect(
        pitch.opacity,
        `inactive MIDI ${pitch.midi} remains visible`,
      ).toBeGreaterThan(0);
      expect(pitch.opacity, `inactive MIDI ${pitch.midi} is faded`).toBeLessThan(1);
    }
    if (!active) continue;
    const light = luminance(pitch.letterColor) + 0.05;
    const background = luminance(pitch.fill) + 0.05;
    const contrast = Math.max(light, background) / Math.min(light, background);
    expect(contrast, `letter contrast at MIDI ${pitch.midi}`).toBeGreaterThanOrEqual(4.5);
  }
}

test('staff covers the available fingerings and narrows to the selected pattern', async ({
  page,
}) => {
  await page.goto(url);
  await expect(page.locator('#staff-notation').getByRole('toolbar')).toBeVisible();
  const overview = await staffPitches(page);
  expect(overview.length).toBeLessThan((await boardPitches(page)).length);
  await expectStaffColors(page, black);

  const union = new Set();
  const brackets = page.locator('#board [data-pattern]');
  for (let i = 0; i < (await brackets.count()); i++) {
    await brackets.nth(i).click();
    const pitches = await boardPitches(page, ':not(.muted)');
    expect(await staffPitches(page)).toEqual(pitches);
    expect(await staffPitches(page, '.is-in-pattern')).toEqual(pitches);
    pitches.forEach((midi) => union.add(midi));
    await expectStaffColors(page);
    await brackets.nth(i).click();
  }
  expect(overview).toEqual([...union].sort((a, b) => a - b));
  expect(await staffPitches(page)).toEqual(overview);

  await page.locator('#allNotes').check();
  expect(await staffPitches(page)).toEqual(overview);
  const extra = page.locator('#board [data-midi="42"]').first();
  await extra.click();
  expect(await staffPitches(page, '.is-outside.is-selected')).toEqual([42]);
  expect(await staffPitches(page)).toHaveLength(overview.length + 1);
  await page.locator('#board [data-midi="43"]').first().click();
  expect(await staffPitches(page)).toEqual(overview);
});

test('selected patterns outline white notes and keep stems neutral in either theme', async ({
  page,
}) => {
  await page.goto(url);
  await page.getByRole('radio', { name: 'G', exact: true }).check();
  await page.locator('#allNotes').check();
  const bracket = page.locator('#board [data-pattern="caged-major-1"]');
  const sharpNote = page.locator('#staff-notation [data-staff-midi="42"]');
  const sharp = sharpNote.locator('.staff-notehead');
  const sharpFret = page.locator('#board [data-midi="42"]:not(.muted)').first();
  const sharpDot = page.locator('#formula-degrees [data-pitch="6"] .color-dot');
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
    const sharpColor = theme === 'light' ? white : 'rgb(238, 234, 228)';
    await expect(sharp).toHaveCSS('fill', sharpColor);
    await expect(sharpFret).toHaveCSS('background-color', sharpColor);
    await expect(sharpDot).toHaveCSS('background-color', sharpColor);
    if (theme === 'light') {
      await expect(sharpFret).toHaveCSS('color', 'rgb(37, 35, 35)');
      await expect(sharpFret).toHaveCSS('--rim-color', '#000');
      await expect(sharpFret).toHaveCSS('--rim-width', '1px');
      await expect(sharpDot).toHaveCSS('box-shadow', /rgb\(0, 0, 0\).*1px.*inset/);
      await expect(sharpNote.locator('.staff-pitch-letter')).toHaveCSS(
        'fill',
        'rgb(37, 35, 35)',
      );
    }
    await expect(sharpNote.locator('.staff-pitch-letter')).toHaveText('F');
    await expect(sharpNote.locator('.staff-accidental')).toHaveCount(0);
    await expect(page.locator('#staff-notation [data-staff-midi="40"]')).toHaveCount(0);
    await expectStaffColors(page);
    await bracket.click();
    await expectStaffColors(page, ink);
  }
});

test('the instrument clef aligns with its written pitch and carries the key signature', async ({
  page,
}) => {
  await page.goto(url);
  const staff = page.locator('#staff-notation');
  async function expectSignature(pitch, clef = 'treble') {
    await expect(staff.locator('.staff-key-signature')).toHaveCount(1);
    const sign = staff.locator(`.staff-key-signature[data-clef="${clef}"] [data-pitch]`);
    await expect(sign).toHaveCount(1);
    await expect(sign).toHaveAttribute('data-pitch', pitch);
    await expect(sign).toBeVisible();
  }
  async function expectClef(clef, anchorMidi) {
    const glyph = staff.locator('.staff-clef');
    await expect(glyph).toHaveCount(1);
    await expect(glyph).toHaveAttribute('data-clef', clef);
    const alignment = await staff.evaluate((element, midi) => {
      const screenY = (shape, point) => point.matrixTransform(shape.getScreenCTM()).y;
      const originY = (selector) =>
        screenY(element.querySelector(selector), new DOMPoint(0, 0));
      const headerLines = element.querySelector('.staff-clef-column .staff-lines');
      const noteLines = element.querySelector('.staff-notes-svg .staff-lines');
      return {
        lineCount: headerLines.getAttribute('d').match(/M/g).length,
        clef: originY('.staff-clef') - originY(`[data-staff-midi="${midi}"]`),
        seam:
          screenY(noteLines, noteLines.getPointAtLength(0)) -
          screenY(headerLines, headerLines.getPointAtLength(0)),
      };
    }, anchorMidi);
    expect(alignment.lineCount).toBe(5);
    expect(alignment.clef).toBeCloseTo(0, 0);
    expect(alignment.seam).toBeCloseTo(0, 0);
  }
  const inline = (midi) => staff.locator(`[data-staff-midi="${midi}"] .staff-accidental`);
  await expect(staff.locator('.staff-key-signature [data-pitch]')).toHaveCount(0);
  await expectClef('treble', 55); // Sounding G3 is written on the G4 line.
  await page.getByRole('radio', { name: 'G', exact: true }).check();
  await expectSignature('F♯');
  await expect(inline(42)).toHaveCount(0);
  await page.locator('#allNotes').check();
  await page.locator('#board [data-midi="41"]').first().click();
  await expect(inline(41)).toHaveAttribute('data-sign', '♮');
  await expect(inline(42)).toHaveAttribute('data-sign', '♯');

  await page.locator('#allNotes').uncheck();
  await page.getByRole('radio', { name: 'D', exact: true }).check();
  await page.locator('#scale-results [data-scale="harmonic-minor"]').click();
  await expectSignature('B♭');
  await expect(inline(46)).toHaveCount(0);
  await expect(inline(49)).toHaveAttribute('data-sign', '♯');
  await page.locator('#language').selectOption('es');
  await page.reload();
  await expect(staff.getByRole('toolbar')).toHaveAccessibleName(
    /Pentagrama en clave de sol/,
  );
  await expectSignature('B♭');
  await expect(inline(49)).toHaveAttribute('data-sign', '♯');
  await page.locator('#instrument-toggle').click();
  await page.locator('#instrument label:has(input[value="bass"])').click();
  await expect(staff.getByRole('toolbar')).toHaveAccessibleName(
    /Pentagrama en clave de fa/,
  );
  await expectClef('bass', 41); // Sounding F2 is written on the F3 line.
  await expectSignature('B♭', 'bass');
});

test('inspecting or playing a note marks its exact octave on the staff', async ({
  page,
}) => {
  await page.goto(url);
  const selected = page.locator('#staff-notation .is-selected');
  const visibleMarkers = page.locator('#staff-notation .staff-selection-marker:visible');
  await expect(visibleMarkers).toHaveCount(0);
  await page.locator('#board [data-midi="48"]').first().click();
  await expect(selected).toHaveAttribute('data-staff-midi', '48');
  await expect(selected.locator('title')).toHaveText('C4');
  await expect(page.locator('#staff-range')).toHaveText('C4');
  const highE = page.locator('#board [data-row="0"][data-fret="0"]');
  await highE.click();
  await expect(selected).toHaveAttribute('data-staff-midi', '64');
  await expect(visibleMarkers).toHaveCount(1);
  await expect(selected.locator('.staff-selection-marker')).toBeVisible();
  await expect(page.locator('#staff-range')).toHaveText('E5');
  await expectStaffColors(page, black);
  await highE.press('ArrowRight');
  await expect(selected).toHaveAttribute('data-staff-midi', '65');
  await expect(visibleMarkers).toHaveCount(1);
  await expect(selected.locator('.staff-selection-marker')).toBeVisible();
  await expect(page.locator('#staff-range')).toHaveText('F5');

  await page.locator('#formula-degrees [data-pitch="4"]').click();
  await expect(selected).toHaveAttribute('data-staff-midi', '52');
  await expect(page.locator('#staff-range')).toHaveText('E4');
});

test('the staff follows bass tuning and scrolls within a phone viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(url);
  await page.locator('#instrument-toggle').click();
  await page.locator('#instrument label:has(input[value="bass"])').click();
  expect(await staffPitches(page)).toEqual([36, 38, 40, 41, 43, 45, 47, 48]);
  await expect(page.locator('#staff-heading')).toHaveText('Bass staff');
  await expect(page.locator('[data-staff-midi="36"] title')).toHaveText('C3');
  await page.keyboard.press('Escape');
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

test('staff notes play their sounding octave and sync the fretboard with pointer and keyboard', async ({
  page,
}) => {
  await page.goto(url);
  const staff = page.locator('#staff-notation').getByRole('toolbar');
  const c4 = staff.getByRole('button', { name: 'C4', exact: true });
  const d4 = staff.getByRole('button', { name: 'D4', exact: true });
  await expect(staff.locator('[tabindex="0"]')).toHaveCount(1);
  await c4.locator('.staff-notehead').click();
  await expect(c4).toBeFocused();
  await expect(c4).toHaveAttribute('aria-pressed', 'true');
  await expect(c4).toHaveClass(/\bsounding\b/);
  await expect(page.locator('#board [data-midi="48"].sounding').first()).toBeVisible();
  await expect(page.locator('#board [data-midi="60"].sounding')).toHaveCount(0);
  await expect(page.locator('#formula-degrees [data-pitch="0"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await c4.press('ArrowRight');
  await expect(d4).toBeFocused();
  await expect(d4).toHaveAttribute('tabindex', '0');
  await expect(c4).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#staff-range')).toHaveText('D4');
  await expect(d4).not.toHaveClass(/\bsounding\b/);
  await d4.press('Enter');
  await expect(d4).toHaveClass(/\bsounding\b/);
  await expect(page.locator('#board [data-midi="50"].sounding').first()).toBeVisible();

  await d4.press('ArrowLeft');
  await expect(c4).toBeFocused();
  await c4.press('Space');
  await expect(c4).toHaveClass(/\bsounding\b/);
  await expect(staff.locator('[tabindex="0"]')).toHaveCount(1);
});
