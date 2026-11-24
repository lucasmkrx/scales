// SPDX-License-Identifier: MPL-2.0

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  guideBoardLayout,
  guidePatternLayout,
  bassRoute,
  guidePlan,
} from '../src/guide-layout.mjs';
import {
  boardDimensions,
  boardModel,
  layoutBoard,
  selection,
  TUNINGS,
  SCALES,
} from '../src/music.mjs';
import { practicePatterns } from '../src/patterns.mjs';

const close = (actual, expected) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-8,
    `expected ${actual} to equal ${expected}`,
  );
function fretWidth(board, fret) {
  const [a, b] = board.edges(fret);
  return Math.abs(b - a);
}

test('guided-book geometry mirrors frets, fans strings continuously, and keeps every note inside the neck', () => {
  for (const instrument of ['guitar', 'bass'])
    for (const strings of instrument === 'guitar' ? [6, 7] : [4, 5, 6])
      for (const frets of [20, 21, 22, 24])
        for (const small of [false, true]) {
          const args = { instrument, strings, frets },
            options = {
              small,
              ...(small ? { width: 142, height: 82, lo: 0, hi: 4 } : {}),
            };
          const r = guideBoardLayout(args, options),
            l = guideBoardLayout({ ...args, hand: 'left' }, options);
          for (let f = 0; f <= (small ? 4 : frets); f++)
            for (let row = 0; row < strings; row++) {
              assert.ok(Math.abs(r.center(f) + l.center(f) - (2 * r.x + r.width)) < 1e-8);
              assert.equal(r.y(row, f), l.y(row, f));
              assert.ok(
                r.y(row, f) > r.edgeY(r.center(f)) &&
                  r.y(row, f) < r.edgeY(r.center(f), true),
              );
              assert.equal(r.y(row, f), r.stringY(row, r.center(f)));
            }
          if (!small) {
            assert.ok(r.edgeY(r.end) < r.edgeY(r.nut));
            assert.ok(r.edgeY(r.end, true) > r.edgeY(r.nut, true));
          }
        }
  const mini = guideBoardLayout(
    { instrument: 'bass', strings: 6 },
    { width: 214, height: 54 },
  );
  assert.ok(mini.rowGap > 4.8);
});
test('printed full necks preserve the main fretboard taper from nut to last fret', () => {
  for (const frets of [20, 21, 22, 24]) {
    const state = selection({ frets });
    const screen = layoutBoard(boardModel(state), boardDimensions(state));
    for (const width of [753.89, 704]) {
      const print = guideBoardLayout(state, { width });
      const scale = fretWidth(print, 1) / fretWidth(screen, 1);
      close(print.edges(0)[1], print.nut);
      close(print.edges(1)[0], print.nut);
      close(fretWidth(print, 0), fretWidth(screen, 0) * scale);
      for (let fret = 1; fret <= frets; fret++) {
        close(print.center(fret) - print.nut, (screen.center(fret) - screen.nut) * scale);
        close(fretWidth(print, fret), fretWidth(screen, fret) * scale);
        if (fret < frets)
          close(fretWidth(print, fret + 1) / fretWidth(print, fret), 2 ** (-1 / 12));
      }
    }
  }
});
test('every printed fingering uses the exact widths of its page’s main neck', () => {
  for (const { single, ...params } of [
    { instrument: 'guitar', strings: 6, scale: 'major', root: 0 },
    { instrument: 'guitar', strings: 7, scale: 'diminished-hw', root: 9 },
    { instrument: 'bass', strings: 4, scale: 'minor-blues', root: 9 },
    { instrument: 'bass', strings: 5, scale: 'minor-pentatonic', root: 7, single: true },
    // The first octave route for this open tuning uses only the four open strings.
    {
      instrument: 'bass',
      strings: 4,
      scale: 'major-triad',
      root: 0,
      tuning: 'custom',
      customTuning: 'C1 E1 G1 C2',
    },
  ]) {
    const state = selection({ ...params, frets: 24 });
    const { strings } = state;
    const screen = layoutBoard(boardModel(state), boardDimensions(state));
    const available = practicePatterns(state).patterns;
    const patterns = single ? available.slice(0, 1) : available;
    assert.ok(patterns.length > 0);
    for (const [width, height] of [
      [753.89, 166],
      [704, 180],
      [753.89, 217.28],
      [704, 234],
    ]) {
      const { boxes, neckWidth } = guidePatternLayout(patterns, {
        strings,
        width,
        height,
        neck: guideBoardLayout(state, { width, height: 120 }),
      });
      const leftLayout = guidePatternLayout(patterns, {
        strings,
        width,
        height,
        neck: guideBoardLayout({ ...state, hand: 'left' }, { width, height: 120 }),
      });
      assert.ok(neckWidth > 0 && neckWidth <= width + 1e-8);
      if (single) close(neckWidth, width);
      if (strings === 7 && height >= 217)
        assert.equal(new Set(boxes.map((box) => box.top)).size, 3);
      close(leftLayout.neckWidth, neckWidth);
      const neck = guideBoardLayout(state, { width: neckWidth, height: 120 });
      assert.equal(boxes.length, patterns.length);
      let printScale, stringSpacing;
      const occupied = [];
      for (const [i, box] of boxes.entries()) {
        const { lo, hi } = patterns[i];
        close(box.x, leftLayout.boxes[i].x);
        close(box.width, leftLayout.boxes[i].width);
        // Include vertical room for the caption above and fret labels below each grid.
        const bounds = {
          left: box.x,
          right: box.x + Math.max(box.width, box.captionWidth),
          top: box.top - 15,
          bottom: box.top + box.height + 12,
        };
        assert.ok(bounds.left >= -1e-8 && bounds.right <= width + 1e-8);
        assert.ok(bounds.top >= -1e-8 && bounds.bottom <= height + 1e-8);
        assert.ok(box.captionWidth > 0 && box.captionWidth <= width);
        for (const other of occupied)
          assert.ok(
            bounds.left >= other.right ||
              bounds.right <= other.left ||
              bounds.top >= other.bottom ||
              bounds.bottom <= other.top,
          );
        occupied.push(bounds);

        const options = { ...box, x: 44 + box.x, small: true, lo, hi };
        const right = guideBoardLayout(state, options);
        const left = guideBoardLayout({ ...state, hand: 'left' }, options);
        const stringGap = right.y(1, lo) - right.y(0, lo);
        stringSpacing ??= stringGap;
        assert.ok(stringGap > 0);
        close(stringGap, stringSpacing);
        if (lo === 0) {
          close(right.edges(0)[1], right.nut);
          assert.ok(right.center(0) > right.edges(0)[0] && right.center(0) < right.nut);
          if (hi > 0) {
            close(right.edges(1)[0], right.nut);
            assert.ok(fretWidth(right, 0) < fretWidth(right, 1));
          }
        } else assert.equal(right.nut, null);
        for (let fret = lo; fret <= hi; fret++) {
          close(left.center(fret) + right.center(fret), 2 * options.x + box.width);
          close(left.y(strings - 1, fret), right.y(strings - 1, fret));
          printScale ??= fretWidth(right, fret) / fretWidth(screen, fret);
          assert.ok(printScale > 0);
          close(fretWidth(right, fret), fretWidth(screen, fret) * printScale);
          close(fretWidth(right, fret), fretWidth(neck, fret));
          close(fretWidth(left, fret), fretWidth(right, fret));
        }
      }
    }
  }
});
test('bass octave routes contain the selected scale in pitch order for every tuning and key', () => {
  const verify = (args, row) => {
    const s = selection(args),
      route = bassRoute(s, row),
      notes = [...s.tuningData.notes].reverse();
    assert.equal(route.points[0].row, row);
    assert.equal(route.points[0].midi % 12, s.root);
    assert.deepEqual(
      route.points.map((p) => p.midi - route.points[0].midi),
      s.scaleData.intervals.concat(12),
    );
    route.points.forEach((p, i) => {
      assert.equal(notes[p.row] + p.fret, p.midi);
      assert.ok(p.fret >= 0 && p.fret <= s.frets);
      if (i) assert.ok(p.row <= route.points[i - 1].row);
    });
    assert.equal(route.points.at(-1).midi - route.points[0].midi, 12);
  };
  for (const tuning of TUNINGS.filter((t) => t.instrument === 'bass'))
    for (let root = 0; root < 12; root++)
      for (const row of [tuning.strings - 1, tuning.strings - 2])
        verify(
          {
            instrument: 'bass',
            strings: tuning.strings,
            tuning: tuning.id,
            root,
            scale: 'minor-pentatonic',
          },
          row,
        );
  for (const scale of SCALES)
    for (const row of [3, 2])
      verify({ instrument: 'bass', root: 9, scale: scale.id }, row);
});
test('a custom tuning with no reachable octave returns a position-map fallback', () => {
  assert.equal(
    bassRoute(
      {
        instrument: 'bass',
        tuning: 'custom',
        customTuning: 'C0 C4 C5 C6',
        strings: 4,
        frets: 20,
        root: 11,
      },
      3,
    ),
    null,
  );
});
test('contents planning paginates a full catalog without losing titles or destinations', () => {
  const titles = { coverTitle: 'Cover', readTitle: 'Read', contentsTitle: 'Contents' };
  const chart = guidePlan([{ title: 'C major' }], titles);
  assert.equal(chart.entries.length, 1);
  assert.equal(chart.entries[0].type, 'scale');
  assert.equal(chart.readingPage, null);
  for (const count of [1, 7, 12, 30, 31, 67, 120]) {
    const variants = Array.from({ length: count }, (_, i) => ({ title: `Scale ${i}` })),
      plan = guidePlan(variants, { ...titles, scope: 'family' });
    assert.equal(plan.entries.length, count + 2 + plan.extra);
    assert.equal(plan.entries[plan.readingPage - 1].type, 'reading');
    assert.equal(plan.entries[plan.firstScalePage - 1].type, 'scale');
    assert.deepEqual(
      plan.entries.filter((e) => e.type === 'scale').map((e) => e.title),
      variants.map((s) => s.title),
    );
    assert.ok(plan.entries.length <= 32 + 48 * plan.extra);
    assert.deepEqual(
      plan.entries.map((e) => e.number),
      Array.from({ length: plan.entries.length }, (_, i) => i + 1),
    );
  }
});
