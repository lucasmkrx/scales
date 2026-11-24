// SPDX-License-Identifier: MPL-2.0

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

test('older pattern links restore their fingering on the complete neck', async ({
  page,
}) => {
  for (const state of [
    { scale: 'minor-blues', root: '9', range: 'blues-1' },
    { scale: 'diminished-hw', root: '4', range: 'four-per-string-1' },
  ]) {
    await page.goto(url({ ...state, neck: 'octave' }));
    await expect(marker(page, state.range)).toHaveAttribute('aria-pressed', 'true');
    const selected = await points(page);
    await expect(page.locator('#board .fret-label').last()).toHaveText('24');
    const params = new URL(page.url()).searchParams;
    expect(params.get('pattern')).toBe(state.range);
    expect(params.has('range')).toBe(false);
    expect(params.has('neck')).toBe(false);
    await page.reload();
    await expect(marker(page, state.range)).toHaveAttribute('aria-pressed', 'true');
    expect(await points(page)).toEqual(selected);
  }
});

test('small screens open the full neck at the nut for either orientation, including shared patterns', async ({
  page,
}) => {
  for (const state of [
    { lang: 'en', hand: 'right', width: 320 },
    { lang: 'pt', hand: 'left', width: 390 },
    { lang: 'es', hand: 'left', width: 390 },
  ]) {
    await page.setViewportSize({ width: state.width, height: 844 });
    await page.goto(url({ lang: state.lang, hand: state.hand, range: 'caged-major-1' }));
    const labelLineCounts = await page
      .locator('#labels label > span')
      .evaluateAll((labels) =>
        labels.map((label) => {
          const range = document.createRange();
          range.selectNodeContents(label);
          return range.getClientRects().length;
        }),
      );
    expect(labelLineCounts).toEqual([1, 1]);
    const board = page.locator('#board');
    await expect(board.locator('.fret-label').last()).toHaveText('24');
    const nutVisible = () =>
      board.evaluate((board) => {
        const nut = board.querySelector('.board-nut').getBoundingClientRect();
        const view = board.getBoundingClientRect();
        return nut.left >= view.left && nut.right <= view.right;
      });
    await expect.poll(nutVisible).toBe(true);
    await page.setViewportSize({ width: state.width + 35, height: 720 });
    await expect.poll(nutVisible).toBe(true);
    await board.evaluate((board) => {
      board.scrollLeft = board.dir === 'rtl' ? -board.scrollWidth : board.scrollWidth;
    });
    await expect.poll(nutVisible).toBe(false);
    const lastFretVisible = await board.evaluate((board) => {
      const last = [...board.querySelectorAll('.fret-label')]
        .at(-1)
        .getBoundingClientRect();
      const view = board.getBoundingClientRect();
      return last.left >= view.left && last.right <= view.right;
    });
    expect(lastFretVisible).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
  }
});

test('the mobile instrument dropdown overlays the board and keeps the current tuning on its button', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${url()}#fretboard`);
  const formula = page.locator('#fretboard').getByRole('group', { name: 'Formula' });
  await expect(formula).toBeInViewport({ ratio: 1 });
  const heading = await page.locator('#fretboard-heading').boundingBox();
  expect(heading.y).toBeGreaterThanOrEqual(0);
  expect(heading.y).toBeLessThan(300);
  const setup = page.getByRole('button', { name: /^Edit instrument/ });
  const menu = page.getByRole('dialog', { name: 'Edit instrument', includeHidden: true });
  const summary = setup.locator('#setup-summary');
  await expect(setup.getByText('Edit instrument', { exact: true })).toBeVisible();
  await expect(summary).toBeVisible();
  await expect(summary).toHaveText('Guitar · E standard');
  await expect(menu).toBeHidden();
  const boardTop = () =>
    page
      .locator('#board')
      .evaluate((board) => board.getBoundingClientRect().top + scrollY);
  const before = await boardTop();
  await setup.press('Enter');
  await expect(menu).toBeVisible();
  expect(await boardTop()).toBeCloseTo(before, 0);
  const popup = await menu.boundingBox();
  expect(popup.x).toBeGreaterThanOrEqual(0);
  expect(popup.x + popup.width).toBeLessThanOrEqual(390);
  expect(popup.y).toBeGreaterThanOrEqual(0);
  expect(popup.y + popup.height).toBeLessThanOrEqual(844);
  await page.locator('#tuning').click();
  await page.getByRole('option', { name: /^Drop D\b/ }).click();
  await expect(menu).toBeVisible();
  await expect(summary).toHaveText('Guitar · Drop D');
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(setup).toBeFocused();
  await expect(setup).toHaveAttribute('aria-expanded', 'false');
  await setup.click();
  await page.locator('#fretboard-heading').click();
  await expect(menu).toBeHidden();
  await setup.click();
  await page.locator('#board').focus();
  await expect(menu).toBeHidden();
  await expect(page.locator('#board')).toBeFocused();
  await page.goto(url({ tuning: 'custom', customTuning: 'D2 A2 D3 G3 A3 D4' }));
  await expect(setup).toHaveAttribute('aria-expanded', 'false');
  await expect(summary).toHaveText('Guitar · D2 A2 D3 G3 A3 D4');
});

test('the tuning list stays anchored on resize and Escape dismisses one dropdown at a time', async ({
  page,
}) => {
  await page.setViewportSize({ width: 960, height: 1000 });
  await page.goto(url());
  const setup = page.locator('#instrument-toggle');
  const menu = page.locator('#instrument-settings');
  const tuning = page.locator('#tuning');
  const choices = page.locator('.choice-popup');
  await setup.click();
  await tuning.press('Enter');
  await expect(choices).toBeVisible();
  const original = await tuning.boundingBox();
  await page.setViewportSize({ width: 1260, height: 900 });
  await expect
    .poll(async () => {
      const anchor = await tuning.boundingBox();
      const popup = await choices.boundingBox();
      if (!anchor || !popup || Math.abs(anchor.x - original.x) < 10) return false;
      const gap = Math.max(
        anchor.y - (popup.y + popup.height),
        popup.y - (anchor.y + anchor.height),
      );
      return (
        Math.abs(anchor.x - popup.x) <= 2 &&
        gap >= 0 &&
        gap <= 12 &&
        popup.x >= 0 &&
        popup.x + popup.width <= 1260 &&
        popup.y >= 0 &&
        popup.y + popup.height <= 900
      );
    })
    .toBe(true);
  await page.keyboard.press('Escape');
  await expect(choices).toBeHidden();
  await expect(menu).toBeVisible();
  await expect(tuning).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(setup).toBeFocused();
});

test.describe('touch workspace', () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 675 } });

  test('all twelve roots can be tapped on the phone ring', async ({ page }) => {
    await page.goto(url());
    const wheel = page.locator('#root-wheel');
    const buttons = wheel.locator('label');
    const firstNotes = ['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'D♭', 'A♭', 'E♭', 'B♭', 'F'];
    await expect(buttons).toHaveCount(firstNotes.length);
    for (const [index, note] of firstNotes.entries()) {
      const button = buttons.nth(index);
      await button.tap();
      await expect(button.getByRole('radio')).toBeChecked();
      await expect(wheel.locator('#root-wheel-note')).toHaveText(note);
      await expect(page.locator('#fretboard-heading')).toHaveText(`${note} Major`);
    }
    await page.setViewportSize({ width: 667, height: 320 });
    await buttons.first().tap();
    await expect(wheel.locator('#root-wheel-note')).toHaveText('C');
  });

  test('a phone can rotate with settings open, change tuning and play the retuned string', async ({
    page,
  }) => {
    await page.goto(`${url()}#fretboard`);
    const setup = page.locator('#instrument-toggle');
    const menu = page.locator('#instrument-settings');
    await setup.tap();
    await expect(menu).toBeVisible();
    await page.setViewportSize({ width: 667, height: 320 });
    await expect(menu).toBeInViewport({ ratio: 1 });
    const pageScroll = await page.evaluate(() => scrollY);
    const tuning = page.locator('#tuning');
    await tuning.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => scrollY)).toBeCloseTo(pageScroll, 0);
    await tuning.tap();
    const choices = page.getByRole('listbox', { name: 'Tuning' });
    await expect(choices).toBeInViewport({ ratio: 1 });
    await choices.getByRole('option', { name: /^Drop D\b/ }).tap();
    await expect(setup.locator('#setup-summary')).toHaveText('Guitar · Drop D');
    await setup.tap();
    await expect(menu).toBeHidden();

    await page.setViewportSize({ width: 320, height: 667 });
    const openString = page.locator('#board .note[data-row="5"][data-fret="0"]');
    await openString.tap();
    await expect(page.locator('#note-readout')).toContainText('D2');
    expect(new URL(page.url()).searchParams.get('tuning')).toBe('drop-d');
  });

  test('a custom pitch stays visible above the phone keyboard and can be applied', async ({
    page,
  }) => {
    await page.goto(`${url()}#fretboard`);
    const setup = page.locator('#instrument-toggle');
    await setup.tap();
    await page.locator('#tuning').tap();
    await page.getByRole('option', { name: 'Custom', exact: true }).tap();
    const lowString = page.locator('#string-pitch-0');
    await lowString.tap();
    await expect(lowString).toHaveCSS('font-size', '16px');
    for (const control of [
      lowString,
      page.locator('#apply-tuning'),
      page.locator('#cancel-tuning'),
    ]) {
      expect((await control.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    // A software keyboard can shrink and pan the visual viewport without a window resize.
    await setup.evaluate((trigger) => {
      const anchor = trigger.getBoundingClientRect();
      const offsetTop =
        anchor.bottom < innerHeight - 260 ? Math.ceil(anchor.bottom) + 12 : 12;
      Object.defineProperties(visualViewport, {
        offsetTop: { configurable: true, value: offsetTop },
        height: { configurable: true, value: 230 },
      });
      visualViewport.dispatchEvent(new Event('resize'));
      visualViewport.dispatchEvent(new Event('scroll'));
    });
    await expect(lowString).toBeFocused();
    await expect
      .poll(() =>
        lowString.evaluate((field) => {
          const menu = field.closest('[role="dialog"]').getBoundingClientRect();
          const input = field.getBoundingClientRect();
          const top = visualViewport.offsetTop;
          const bottom = top + visualViewport.height;
          return (
            menu.top >= top - 1 &&
            menu.bottom <= bottom + 1 &&
            input.top >= menu.top &&
            input.bottom <= menu.bottom
          );
        }),
      )
      .toBe(true);
    await lowString.fill('C2');
    await page.evaluate(() => {
      delete visualViewport.offsetTop;
      delete visualViewport.height;
      visualViewport.dispatchEvent(new Event('resize'));
      visualViewport.dispatchEvent(new Event('scroll'));
    });
    await page.locator('#apply-tuning').tap();
    await expect(page.locator('#instrument-settings')).toBeVisible();
    await expect(setup.locator('#setup-summary')).toHaveText(
      'Guitar · C2 A2 D3 G3 B3 E4',
    );
    await setup.tap();
    await expect(page.locator('#instrument-settings')).toBeHidden();
    expect(new URL(page.url()).searchParams.get('pitches')).toBe('C2 A2 D3 G3 B3 E4');
  });
});

test('workspace card headings follow the selected scale and language', async ({
  page,
}) => {
  await page.goto(url({ root: '5', scale: 'minor-blues' }));
  for (const [language, scale, selection, pdf] of [
    ['en', 'Scale', 'F Minor blues', 'PDF downloads'],
    ['pt', 'Escala', 'F Blues menor', 'Downloads em PDF'],
    ['es', 'Escala', 'F Blues menor', 'Descargas en PDF'],
  ]) {
    await page.locator('#language').selectOption(language);
    const heading = (card, name) =>
      page.locator(card).getByRole('heading', { level: 2, name, exact: true });
    const scaleTitle = heading('.scale-settings-card', scale);
    const pdfTitle = heading('#pdf-export', pdf);
    const fretboardTitle = heading('#fretboard', selection);
    await expect(scaleTitle.locator('.icon[aria-hidden="true"]')).toBeVisible();
    await expect(pdfTitle.locator('.fa-file-pdf[aria-hidden="true"]')).toBeVisible();
    await expect(fretboardTitle).toBeVisible();
    const fontSize = (element) => parseFloat(getComputedStyle(element).fontSize);
    expect(await fretboardTitle.evaluate(fontSize)).toBeGreaterThan(
      await scaleTitle.evaluate(fontSize),
    );
    expect(await scaleTitle.evaluate(fontSize)).toBe(await pdfTitle.evaluate(fontSize));
  }
});

test('browse a family, choose a scale, and restore the selected family from a shared URL', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(url());
  const selected = page.locator('#fretboard-heading');
  const degrees = page.locator('#formula-degrees .formula-degree');
  const results = page.locator('#scale-results');
  const family = page.locator('#scale-family-trigger');
  const popup = page.getByRole('listbox');
  await expect(selected).toHaveText('C Major');
  await expect(family).toHaveAccessibleName('Scale family Common scales');
  const common = results.locator('[data-scale]');
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

test('the checkmark follows the scale chosen by keyboard or pointer', async ({
  page,
}) => {
  await page.goto('/?key=F&hand=left');
  const results = page.locator('#scale-results');
  const major = results.getByRole('button', { name: 'Major (Ionian)', exact: true });
  const expectSelection = async (name) => {
    const selected = results.getByRole('button', { pressed: true });
    await expect(selected).toHaveAccessibleName(name);
    await expect(results.locator('.scale-choice-check')).toHaveCount(1);
    await expect(selected.locator('.scale-choice-check')).toBeVisible();
  };
  await expect(results.getByRole('button')).toHaveCount(8);
  await expectSelection('Major (Ionian)');

  await major.press('ArrowRight');
  await expect(
    results.getByRole('button', { name: 'Natural minor (Aeolian)', exact: true }),
  ).toBeFocused();
  await expectSelection('Major (Ionian)');
  await page.keyboard.press('Space');
  await expectSelection('Natural minor (Aeolian)');

  await results.getByRole('button', { name: 'Minor pentatonic', exact: true }).click();
  await expectSelection('Minor pentatonic');
  await expect(page.locator('#fretboard-heading')).toHaveText('F Minor pentatonic');
});

test('shared and saved custom formulas can still be played and replaced by a named scale', async ({
  page,
}) => {
  await page.goto(url({ scale: 'custom', formula: '1 2 b3 4 5 6 b7', hand: 'left' }));
  const degrees = page.locator('#formula-degrees .formula-degree');
  await expect(page.locator('#edit-formula, #formula-editor')).toHaveCount(0);
  await expect(degrees).toHaveText(['1', '2', '♭3', '4', '5', '6', '♭7']);
  await page.locator('#formula-degrees button').first().click();
  await expect(page.locator('#formula-degrees button').first()).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('radio', { name: 'A', exact: true }).check();
  await page.goto('/');
  await page.locator('#instrument-toggle').click();
  await expect(page.getByRole('radio', { name: 'Left-handed' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'A', exact: true })).toBeChecked();
  await expect(degrees).toHaveText(['1', '2', '♭3', '4', '5', '6', '♭7']);
  await expect(page.locator('#scale-family')).toHaveValue('custom');
  await page.locator('#scale-family-trigger').click();
  await page.getByRole('option', { name: 'Pentatonic', exact: true }).click();
  await expect(page.locator('#fretboard-heading')).toHaveText('A Custom scale');
  await page.locator('[data-scale="minor-pentatonic"]').click();
  await expect(page).toHaveURL(/scale=minor-pentatonic/);
  await expect(page.locator('#scale-family option[value="custom"]')).toHaveCount(0);
});

test('key spelling is automatic and keeps all twelve root choices stable', async ({
  page,
}) => {
  await page.goto(url({ root: '6' }));
  await expect(page.locator('#fretboard-heading')).toHaveText('F♯ Major');
  await expect(
    page.locator('#formula-degrees button[data-pitch="5"] .formula-note'),
  ).toHaveText('E♯');
  const before = await points(page);
  await page.goto(url({ root: '6', tonic: 'Gb', spelling: 'sharp' }));
  await expect(page.locator('#spelling, #spelling-trigger, #key-tonic')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has('spelling')).toBe(false);
  const roots = page.getByRole('group', { name: 'Root note', exact: true });
  const names = roots.getByRole('radio');
  const wheelNote = roots.locator('#root-wheel-note');
  const wheelScale = roots.locator('#root-wheel-scale');
  await expect(names).toHaveCount(12);
  const rootLabels = page.locator('#root-notes label');
  const rootNames = [
    'C',
    'G',
    'D',
    'A',
    'E',
    'B',
    'F♯G♭',
    'D♭C♯',
    'A♭G♯',
    'E♭D♯',
    'B♭A♯',
    'F',
  ];
  const chosen = roots.getByRole('radio', { name: 'F♯ / G♭', exact: true });
  const tones = page.locator('#formula-degrees');
  await expect(rootLabels).toHaveText(rootNames);
  await expect(chosen).toBeChecked();
  await expect(wheelNote).toHaveText('G♭');
  await expect(wheelScale).toHaveText('Major');
  await expect(page.locator('#fretboard-heading')).toHaveText('G♭ Major');
  expect(new URL(page.url()).searchParams.get('key')).toBe('Gb');
  await expect(tones.locator('button[data-pitch="6"] .formula-note')).toHaveText('G♭');
  await expect(tones.locator('button[data-pitch="11"] .formula-note')).toHaveText('C♭');
  expect(await points(page)).toEqual(before);
  await page.reload();
  await expect(chosen).toBeChecked();
  await expect(wheelNote).toHaveText('G♭');
  await roots.getByRole('radio', { name: 'D♭ / C♯', exact: true }).check();
  await expect(wheelNote).toHaveText('D♭');
  await expect(page.locator('#fretboard-heading')).toHaveText('D♭ Major');
  expect(new URL(page.url()).searchParams.get('key')).toBe('Db');
  await page.locator('#scale-results [data-scale="natural-minor"]').click();
  await expect(wheelNote).toHaveText('C♯');
  await expect(wheelScale).toHaveText('Natural minor');
  await expect(page.locator('#fretboard-heading')).toHaveText('C♯ Natural minor');

  await page.goto(url({ root: '11', tonic: 'Cb' }));
  await expect(names).toHaveCount(12);
  const b = roots.getByRole('radio', { name: 'B', exact: true });
  await expect(b).toBeChecked();
  await expect(wheelNote).toHaveText('C♭');
  await expect(page.locator('#fretboard-heading')).toHaveText('C♭ Major');
  await b.press('ArrowRight');
  await expect(chosen).toBeFocused();
  await expect(chosen).toBeChecked();
  await expect(wheelNote).toHaveText('F♯');
  await chosen.press('ArrowLeft');
  await expect(b).toBeFocused();
  await expect(wheelNote).toHaveText('B');
  await expect(page.locator('#fretboard-heading')).toHaveText('B Major');
});

test('auditioning a note highlights its pitch on the fretboard and in the formula', async ({
  page,
}) => {
  await page.goto(url());
  const referenceNote = page.locator('#formula-degrees button[data-pitch="0"]');
  const soundingTone = page.locator('#formula-degrees button.sounding');
  await referenceNote.click();
  await expect(soundingTone).toHaveAttribute('data-pitch', '0');
  await expect(page.locator('#board .note.sounding').first()).toBeVisible();
  await expect(page.locator('#note-readout')).toContainText('unison');
  await expect(soundingTone).toHaveCount(0);
  await expect(referenceNote).toHaveAttribute('aria-pressed', 'true');
});

test('the formula ascends from the root even when the selected pattern starts lower', async ({
  page,
}) => {
  await page.goto(url({ scale: 'minor-blues', range: 'blues-4' }));
  const tones = page.locator('#formula-degrees button');
  const sequence = [48, 51, 53, 54, 55, 58];
  await expect(tones).toHaveCount(sequence.length);
  for (const [index, midi] of sequence.entries()) {
    const tone = tones.nth(index);
    await tone.click();
    await expect(tone).toHaveClass(/\bsounding\b/);
    await expect(page.locator('#staff-notation .is-selected')).toHaveAttribute(
      'data-staff-midi',
      String(midi),
    );
    await expect(
      page.locator(`#board .note.sounding[data-midi="${midi}"]`).first(),
    ).toBeVisible();
  }
});

test('PDF downloads share a saved paper size and support cancellation', async ({
  page,
}) => {
  let release;
  const libraryGate = new Promise((resolve) => (release = resolve));
  await page.route('**/vendor/fontkit.umd.min.js', async (route) => {
    await libraryGate;
    await route.continue();
  });
  await page.goto(url({ lang: 'es', scale: 'harmonic-minor', root: '9' }));
  await expect(page.getByRole('button', { name: /^Editar instrumento/ })).toBeVisible();
  const heading = page.getByRole('heading', { name: 'Descargas en PDF' });
  await expect(heading.locator('.fa-file-pdf[aria-hidden="true"]')).toBeVisible();
  const sheet = page.locator('[data-export="selected"]');
  const family = page.locator('[data-export="family"]');
  const catalog = page.locator('[data-export="catalog"]');
  const paper = page.getByRole('group', { name: 'Tamaño del papel' });
  await expect(paper.getByRole('radio', { name: 'A4' })).toBeChecked();
  await paper.getByText('Carta (EE. UU.)').click();
  await page.reload();
  await expect(paper.getByRole('radio', { name: 'Carta (EE. UU.)' })).toBeChecked();
  await expect(page.locator('#pdf-export button:visible')).toHaveCount(3);
  await expect(sheet).toContainText('1 página');
  await expect(sheet).toContainText('A Menor armónica');
  await expect(family).toContainText('9 páginas');
  await expect(catalog).toContainText('70 páginas');
  await family.click();
  await expect(family).toContainText('Cancelar');
  await expect(catalog).toBeDisabled();
  await expect(paper.getByRole('radio', { name: 'A4' })).toBeDisabled();
  await family.click();
  release();
  await expect(page.locator('#export-status')).toContainText('cancel');
  await expect(catalog).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent('download'), family.click()]);
  expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toMatch(
    /family-harmonic-minor-A-right-letter-es\.pdf$/,
  );
  const bytes = await readFile(await download.path());
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  const inspect = (bytes) =>
    page.evaluate(async (base64) => {
      const doc = await window.PDFLib.PDFDocument.load(base64);
      return { pages: doc.getPageCount(), ...doc.getPage(0).getSize() };
    }, bytes.toString('base64'));
  expect(await inspect(bytes)).toEqual({ pages: 9, width: 792, height: 612 });
  await paper.getByText('A4', { exact: true }).click();
  await marker(page, 'three-per-string-1').click();
  await expect(sheet).toContainText('Patrón 1');
  const [chart] = await Promise.all([page.waitForEvent('download'), sheet.click()]);
  expect(chart.suggestedFilename()).toMatch(
    /chart-harmonic-minor-A-three-per-string-1-right-a4-es\.pdf$/,
  );
  expect(await inspect(await readFile(await chart.path()))).toEqual({
    pages: 1,
    width: 841.89,
    height: 595.28,
  });
  await page.goto(url({ scale: 'custom', formula: '1 b3 5' }));
  await expect(family).toBeHidden();
  await expect(sheet).toBeEnabled();
  await expect(catalog).toBeEnabled();
});
