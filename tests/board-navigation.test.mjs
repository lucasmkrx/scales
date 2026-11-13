import test from 'node:test';
import assert from 'node:assert/strict';
import { adjacentNote } from '../src/board-navigation.mjs';
import { boardSvg } from '../src/board.mjs';
import { copy } from '../src/i18n.mjs';

test('the playable board has one tab stop and position previews contain no controls', () => {
  const state = { instrument: 'bass', hand: 'left', allNotes: true };
  const board = boardSvg(state);
  assert.equal([...board.matchAll(/tabindex="0"/g)].length, 1);
  assert.match(board, /role="button" tabindex="-1"/);
  assert.match(board, /data-hand="left"/);
  const preview = boardSvg(state, { small: true, lo: 3, hi: 7 });
  assert.match(preview, /aria-hidden="true"/);
  assert.doesNotMatch(preview, /role="button"|tabindex=|data-midi=/);
});

test('arrows follow the visible neck orientation and skip missing positions', () => {
  const notes = [
    { row: 0, fret: 1 },
    { row: 0, fret: 4 },
    { row: 0, fret: 7 },
    { row: 2, fret: 3 },
    { row: 2, fret: 6 },
    { row: 3, fret: 4 },
  ];
  const current = notes[1];
  assert.equal(adjacentNote(notes, current, 'ArrowRight', 'right'), notes[2]);
  assert.equal(adjacentNote(notes, current, 'ArrowLeft', 'right'), notes[0]);
  assert.equal(adjacentNote(notes, current, 'ArrowRight', 'left'), notes[0]);
  assert.equal(adjacentNote(notes, current, 'ArrowLeft', 'left'), notes[2]);
  for (const hand of ['left', 'right']) {
    assert.equal(adjacentNote(notes, current, 'ArrowDown', hand), notes[3]);
    assert.equal(adjacentNote(notes, notes[3], 'ArrowUp', hand), current);
    assert.equal(adjacentNote(notes, current, 'ArrowUp', hand), undefined);
  }
  assert.equal(adjacentNote(notes, notes[0], 'ArrowLeft', 'right'), undefined);
});

test('spoken note labels identify scale degrees, the root, and outside pitches in all supported languages', () => {
  for (const [lang, t] of Object.entries(copy)) {
    const board = boardSvg({ lang, allNotes: true, scale: 'major', root: 0 });
    const labels = [...board.matchAll(/role="button"[^>]*aria-label="([^"]*)"/g)].map(
      (match) => match[1],
    );
    assert.ok(labels.some((label) => label.includes(t.root) && label.includes(t.degree)));
    assert.ok(labels.some((label) => label.includes(t.outsideScale)));
    assert.doesNotMatch(board, /undefined/);
  }
});

test('pattern emphasis preserves the complete neck and dims only frets outside its bounds', () => {
  for (const hand of ['left', 'right']) {
    for (const [instrument, strings, frets] of [
      ['guitar', 7, 24],
      ['bass', 5, 20],
    ]) {
      const state = { instrument, strings, frets, hand, allNotes: true };
      const full = boardSvg(state, { width: 1200 });
      const focused = boardSvg(state, { width: 1200, focusRange: { lo: 5, hi: 9 } });
      const markers = [
        ...focused.matchAll(/<g class="([^"]*)"[^>]*data-fret="(\d+)"[^>]*>/g),
      ];
      assert.equal(markers.length, strings * (frets + 1));
      assert.equal(markers.length, [...full.matchAll(/data-fret=/g)].length);
      for (const [, classes, fret] of markers) {
        assert.equal(classes.includes('muted'), Number(fret) < 5 || Number(fret) > 9);
      }
      assert.match(focused, /tabindex="0"[^>]*data-fret="5"/);
      assert.match(focused, /fill="#d2d6d1"/);
      assert.doesNotMatch(full, /class="[^"]*muted/);
      assert.doesNotMatch(
        boardSvg(state, { focusRange: { lo: 0, hi: frets } }),
        /class="[^"]*muted/,
      );
    }
  }
});
