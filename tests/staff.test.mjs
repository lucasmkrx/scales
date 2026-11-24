// SPDX-License-Identifier: MPL-2.0

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  practiceStaffPoints,
  staffLayout,
  staffMarkup,
  staffPitchName,
} from '../src/staff.mjs';
import { boardModel, PALETTE, selection } from '../src/music.mjs';
import { scalePatterns } from '../src/patterns.mjs';

function layoutFor(midis, input = {}) {
  return staffLayout({
    state: selection(input),
    points: midis.map((midi) => ({
      midi,
      inScale: true,
      fill: PALETTE[midi % 12] ?? '#ffffff',
    })),
  });
}

test('the staff uses only distinct pitches used by the available or selected fingerings', () => {
  for (const instrument of ['guitar', 'bass']) {
    const input = { instrument, frets: 24, allNotes: true };
    const model = boardModel(input);
    const { patterns } = scalePatterns(input);
    const selected = patterns[0];
    function layout(patterns, selected, board = model) {
      const points = practiceStaffPoints(board, patterns);
      return staffLayout({ state: board.state, points }, selected);
    }
    function soundingPitches(patterns) {
      return [
        ...new Set(patterns.flatMap((pattern) => pattern.points.map(({ midi }) => midi))),
      ].sort((a, b) => a - b);
    }
    const overview = layout(patterns);
    assert.deepEqual(
      overview.notes.map(({ midi }) => midi),
      soundingPitches(patterns),
    );
    assert.ok(overview.notes.length < new Set(model.points.map(({ midi }) => midi)).size);
    assert.doesNotMatch(
      staffMarkup(overview, 'en'),
      /is-muted|is-outside|is-in-pattern|staff-pitch-letter/,
    );
    const focus = layout([selected], selected);
    assert.deepEqual(
      focus.notes.map(({ midi }) => midi),
      soundingPitches([selected]),
    );
    assert.ok(focus.notes.every((note) => note.inPattern && !note.muted));
    assert.deepEqual(
      layout(
        patterns,
        undefined,
        boardModel({ ...input, hand: 'left', allNotes: false }),
      ),
      overview,
    );
    const markup = staffMarkup(focus, 'es');
    assert.match(markup, new RegExp(`Patrón ${selected.number}"`));
    assert.deepEqual(
      [...markup.matchAll(/class="staff-pitch-letter"[^>]*>([A-G])<\/text>/g)].map(
        ([, letter]) => letter,
      ),
      focus.notes.map((note) => note.name[0]),
    );
    assert.equal(
      (markup.match(/class="staff-selection-marker"/g) ?? []).length,
      focus.notes.length,
    );
  }
});

test('setups without fingerings show one playable scale, even in a restricted custom tuning', () => {
  const model = boardModel({ tuning: 'guitar-drop-d', root: 2, allNotes: true });
  const points = practiceStaffPoints(model, []);
  const pitches = [...new Set(points.map(({ midi }) => midi))].sort((a, b) => a - b);
  assert.deepEqual(pitches, [38, 40, 42, 43, 45, 47, 49, 50]);
  const restricted = boardModel({
    tuning: 'custom',
    customTuning: 'C-1 C1 C3 C5 C7 C9',
    frets: 20,
    root: 11,
    allNotes: true,
  });
  const fallback = practiceStaffPoints(restricted, []);
  assert.ok(fallback.every((point) => point.inScale));
  assert.deepEqual(
    [...new Set(fallback.map(({ midi }) => midi))].sort((a, b) => a - b),
    [1, 3, 4, 6, 8, 10, 11],
  );
});

test('guitar uses treble and bass uses bass, both an octave above the sounding pitch', () => {
  const guitar = layoutFor([40, 48, 50, 52, 67, 69]);
  const bass = layoutFor([28, 29, 31, 45, 47, 48], { instrument: 'bass' });
  for (const [layout, clef, expected] of [
    [
      guitar,
      'treble',
      [
        ['E3', [-20, -12, -4]],
        ['C4', [0]],
        ['D4', []],
        ['E4', []],
        ['G5', []],
        ['A5', [0]],
      ],
    ],
    [
      bass,
      'bass',
      [
        ['E2', [0]],
        ['F2', []],
        ['G2', []],
        ['A3', []],
        ['B3', []],
        ['C4', [0]],
      ],
    ],
  ]) {
    assert.equal(layout.clef.id, clef);
    assert.deepEqual(
      layout.notes.map(({ name, ledger }) => [name, ledger]),
      expected,
    );
    assert.ok(layout.notes.every((note, i, notes) => !i || notes[i - 1].y > note.y));
    const markup = staffMarkup(layout, 'en');
    assert.deepEqual(
      [...markup.matchAll(/class="staff-clef" data-clef="([^"]+)"/g)].map(([, id]) => id),
      [clef],
    );
  }
  const [, c4, d4, e4] = guitar.notes;
  assert.equal(c4.y - d4.y, d4.y - e4.y);
});

test('enharmonic notation respects the scale, written octave, and spelling controls', () => {
  const sharp = { root: 1, tonic: 'C#', scale: 'major' };
  const flat = { root: 6, tonic: 'Gb', scale: 'major' };
  const [b4, c5] = layoutFor([59, 60]).notes;
  for (const spelling of ['both', 'key']) {
    const [bSharp] = layoutFor([60], { ...sharp, spelling }).notes;
    const [cFlat] = layoutFor([59], { ...flat, spelling }).notes;
    assert.deepEqual([bSharp.name, bSharp.y, bSharp.ledger], ['B♯4', b4.y, []]);
    assert.deepEqual([cFlat.name, cFlat.y, cFlat.ledger], ['C♭5', c5.y, []]);
  }
  assert.equal(staffPitchName(61, selection({ spelling: 'flat' })), 'D♭5');
  assert.equal(staffPitchName(61, selection({ spelling: 'sharp' })), 'C♯5');
  assert.deepEqual(layoutFor([69], { scale: 'diminished-7' }).notes[0].glyphs, [
    '♭',
    '♭',
  ]);
  assert.deepEqual(layoutFor([67], { root: 8, tonic: 'G#' }).notes[0].glyphs, ['𝄪']);
  const blues = layoutFor([63, 64, 76], { scale: 'major-blues' }).notes;
  assert.deepEqual(
    blues.map(({ name, glyphs }) => [name, glyphs]),
    [
      ['E♭5', ['♭']],
      ['E5', ['♮']],
      ['E6', []],
    ],
  );
});

test('the seven signature signs sit at their conventional written pitches in each clef', () => {
  for (const [root, tonic, instrument, pitches] of [
    [1, 'C#', 'guitar', 'F5 C5 G5 D5 A4 E5 B4'],
    [1, 'C#', 'bass', 'F3 C3 G3 D3 A2 E3 B2'],
    [11, 'Cb', 'guitar', 'B4 E5 A4 D5 G4 C5 F4'],
    [11, 'Cb', 'bass', 'B2 E3 A2 D3 G2 C3 F2'],
  ]) {
    const reference = layoutFor(
      Array.from({ length: 60 }, (_, i) => 20 + i),
      { instrument },
    );
    const heightOf = new Map(reference.notes.map(({ name, y }) => [name, y]));
    const layout = layoutFor([60], { root, tonic, instrument });
    const markup = staffMarkup(layout, 'en');
    const signs = [
      ...markup.matchAll(
        /<path data-pitch="([A-G])[♭♯]"[^>]*transform="translate\(([\d.]+) ([\d.]+)\)"/g,
      ),
    ];
    const positions = pitches.split(' ');
    assert.equal(signs.length, positions.length);
    signs.forEach(([, letter, x, y], i) => {
      assert.equal(letter, positions[i][0]);
      assert.equal(Number(y), heightOf.get(positions[i]));
      assert.ok(Number(x) + 4 < layout.headerWidth);
    });
  }
});

test('quarter notes use filled tilted heads and change stem direction at each middle line', () => {
  // The middle lines are D3 in bass and B4 in treble.
  const bass = layoutFor([36, 38, 40], { instrument: 'bass' });
  const layout = layoutFor([57, 59, 60]);
  assert.deepEqual(
    [...bass.notes, ...layout.notes].map(({ name, stemEnd }) => [name, stemEnd]),
    [
      ['C3', -28],
      ['D3', 28],
      ['E3', 28],
      ['A4', -28],
      ['B4', 28],
      ['C5', 28],
    ],
  );
  const markup = staffMarkup(layout, 'en');
  assert.equal(
    (
      markup.match(
        /<ellipse class="staff-notehead"[^>]+transform="rotate\(-[\d.]+\)"[^>]+fill="currentColor"/g,
      ) ?? []
    ).length,
    layout.notes.length,
  );
  const stems = [
    ...markup.matchAll(
      /class="staff-stem" x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g,
    ),
  ];
  assert.equal(stems.length, layout.notes.length);
  stems.forEach(([, x, y, width, height], i) => {
    const { stemEnd } = layout.notes[i];
    assert.ok(stemEnd < 0 ? Number(x) > 0 : Number(x) + Number(width) < 0);
    assert.equal(Number(y), Math.min(0, stemEnd));
    assert.equal(Number(height), Math.abs(stemEnd));
  });
});

test('custom tuning extremes and the highest fret fit within the SVG bounds', () => {
  const model = boardModel({
    tuning: 'custom',
    customTuning: 'C-1 D-1 E-1 F-1 G-1 G9',
    frets: 24,
    allNotes: true,
  });
  const { notes, height, top, width } = staffLayout(model);
  assert.deepEqual([notes[0].name, notes.at(-1).name], ['C0', 'G12']);
  const [trebleMiddle] = layoutFor([59]).notes;
  assert.equal(notes[0].y + notes[0].stemEnd, trebleMiddle.y);
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
