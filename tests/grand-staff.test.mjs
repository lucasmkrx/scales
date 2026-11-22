import test from 'node:test';
import assert from 'node:assert/strict';
import {
  grandStaffLayout,
  grandStaffMarkup,
  staffPitchName,
} from '../src/grand-staff.mjs';
import { boardModel, PALETTE, selection } from '../src/music.mjs';
import { scalePatterns } from '../src/patterns.mjs';

function layoutFor(midis, input = {}) {
  return grandStaffLayout({
    state: selection(input),
    points: midis.map((midi) => ({
      midi,
      inScale: true,
      fill: PALETTE[midi % 12] ?? '#ffffff',
    })),
  });
}

test('the staff uses every visible sounding pitch once in ascending order, in either hand', () => {
  const input = { allNotes: true };
  const model = boardModel(input, { hi: 12 });
  const pattern = scalePatterns(input, { hi: 12 }).patterns[0];
  const layout = grandStaffLayout(model, pattern);
  const { notes } = layout;
  const midis = [...new Set(model.points.map(({ midi }) => midi))].sort((a, b) => a - b);
  assert.deepEqual(
    notes.map(({ midi }) => midi),
    midis,
  );
  assert.ok(notes.length < model.points.length);
  assert.deepEqual(
    notes.filter((note) => !note.muted).map(({ midi }) => midi),
    [...new Set(pattern.points.map(({ midi }) => midi))].sort((a, b) => a - b),
  );
  assert.ok(notes.some((note) => note.muted && note.inScale));
  assert.ok(notes.some((note) => note.muted && !note.inScale));
  assert.deepEqual(
    grandStaffLayout(boardModel({ ...input, hand: 'left' }, { hi: 12 }), pattern).notes,
    notes,
  );
  const markup = grandStaffMarkup(layout, model.state.lang);
  const marked = [
    ...markup.matchAll(/class="staff-note is-in-pattern" data-staff-midi="(\d+)"/g),
  ];
  assert.deepEqual(
    marked.map((match) => Number(match[1])),
    [...new Set(pattern.points.map(({ midi }) => midi))].sort((a, b) => a - b),
  );
  const patternNames = notes.filter((note) => note.inPattern).map(({ name }) => name);
  assert.ok(
    grandStaffMarkup(layout, 'es').includes(
      `Patrón ${pattern.number} · ${patternNames.join(' · ')}"`,
    ),
  );
  assert.equal(
    (markup.match(/class="staff-selection-ring"/g) ?? []).length,
    midis.length,
  );
  assert.match(markup, /class="staff-note is-muted is-outside" data-staff-midi=/);
  assert.match(markup, /<title>E2<\/title>/);
  assert.doesNotMatch(
    grandStaffMarkup(grandStaffLayout(boardModel({})), 'en'),
    /is-muted|is-outside|is-in-pattern|staff-pattern-halo/,
  );
});

test('written staff steps place middle C and ledger lines on both clefs at concert pitch', () => {
  const [lowE, e2, g2, f3, a3, b3, c4, d4, e4, f5, g5, a5] = layoutFor([
    28, 40, 43, 53, 57, 59, 60, 62, 64, 77, 79, 81,
  ]).notes;
  assert.ok(
    [lowE, e2, g2, f3, a3, b3, c4, d4, e4, f5, g5, a5].every(
      (note, i, array) => !i || array[i - 1].y > note.y,
    ),
  );
  assert.equal(lowE.name, 'E1');
  assert.deepEqual(lowE.ledger, [-28, -20, -12, -4]);
  for (const note of [e2, c4, a5]) assert.deepEqual(note.ledger, [0]);
  for (const note of [g2, f3, a3, b3, d4, e4, f5, g5]) assert.deepEqual(note.ledger, []);
  assert.equal(f3.y - a3.y, e2.y - g2.y);
  assert.equal(f5.y - a5.y, 2 * (d4.y - e4.y));
});

test('enharmonic notation respects the scale, written octave, and spelling controls', () => {
  const sharp = { root: 1, tonic: 'C#', scale: 'major' };
  const flat = { root: 6, tonic: 'Gb', scale: 'major' };
  const [b3, c4] = layoutFor([59, 60]).notes;
  for (const spelling of ['both', 'key']) {
    const [bSharp] = layoutFor([60], { ...sharp, spelling }).notes;
    const [cFlat] = layoutFor([59], { ...flat, spelling }).notes;
    assert.deepEqual([bSharp.name, bSharp.y, bSharp.ledger], ['B♯3', b3.y, []]);
    assert.deepEqual([cFlat.name, cFlat.y, cFlat.ledger], ['C♭4', c4.y, [0]]);
  }
  assert.equal(staffPitchName(61, selection({ spelling: 'flat' })), 'D♭4');
  assert.equal(staffPitchName(61, selection({ spelling: 'sharp' })), 'C♯4');
  assert.deepEqual(layoutFor([69], { scale: 'diminished-7' }).notes[0].glyphs, [
    '♭',
    '♭',
  ]);
  assert.deepEqual(layoutFor([67], { root: 8, tonic: 'G#' }).notes[0].glyphs, ['𝄪']);
  const blues = layoutFor([63, 64, 76], { scale: 'major-blues' }).notes;
  assert.deepEqual(
    blues.map(({ name, glyphs }) => [name, glyphs]),
    [
      ['E♭4', ['♭']],
      ['E4', ['♮']],
      ['E5', []],
    ],
  );
});

test('quarter notes use filled tilted heads and change stem direction at each middle line', () => {
  const layout = layoutFor([48, 50, 52, 69, 71, 72]);
  // The middle lines are D3 in bass and B4 in treble.
  assert.deepEqual(
    layout.notes.map(({ name, stemEnd }) => [name, stemEnd]),
    [
      ['C3', -28],
      ['D3', 28],
      ['E3', 28],
      ['A4', -28],
      ['B4', 28],
      ['C5', 28],
    ],
  );
  const markup = grandStaffMarkup(layout, 'en');
  assert.equal(
    (
      markup.match(
        /<ellipse class="staff-notehead"[^>]+transform="rotate\(-[\d.]+\)"[^>]+fill="currentColor"/g,
      ) ?? []
    ).length,
    layout.notes.length,
  );
  assert.equal((markup.match(/class="staff-stem" d="M4\.5 -1V-28"/g) ?? []).length, 2);
  assert.equal((markup.match(/class="staff-stem" d="M-4\.5 1V28"/g) ?? []).length, 4);
});

test('custom tuning extremes and the highest fret fit within the SVG bounds', () => {
  const model = boardModel({
    tuning: 'custom',
    customTuning: 'C-1 D-1 E-1 F-1 G-1 G9',
    frets: 24,
    allNotes: true,
  });
  const { notes, height, top, width } = grandStaffLayout(model);
  assert.deepEqual([notes[0].name, notes.at(-1).name], ['C-1', 'G11']);
  const [bassMiddle, trebleMiddle] = layoutFor([50, 71]).notes;
  assert.equal(notes[0].y + notes[0].stemEnd, bassMiddle.y);
  assert.equal(notes.at(-1).y + notes.at(-1).stemEnd, trebleMiddle.y);
  for (const { x, y, stemEnd, ledger } of notes) {
    assert.ok(x - 12 > 0 && x + 12 < width);
    for (const offset of [0, ...ledger]) {
      assert.ok(y + offset > top && y + offset < top + height);
    }
    assert.ok(y - 10 > top && y + 10 < top + height);
    assert.ok(y + stemEnd > top && y + stemEnd < top + height);
  }
});
