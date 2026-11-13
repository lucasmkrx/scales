import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boardModel,
  mod,
  prettyDegree,
  selection,
  SCALES,
  TUNINGS,
} from '../src/music.mjs';
import { scalePatterns } from '../src/patterns.mjs';

const heptatonic = SCALES.filter((scale) =>
  ['major', 'harmonic-minor', 'melodic-minor'].includes(scale.family),
);
const symmetric = ['whole-tone', 'diminished-wh', 'diminished-hw'];
const blues = ['major-blues', 'minor-blues'];
const main = [...heptatonic.map((scale) => scale.id), ...symmetric, ...blues];
const coordinate = (point) => `${point.row}:${point.fret}`;
const stringsOf = (pattern, strings) =>
  Array.from({ length: strings }, (_, index) =>
    pattern.points
      .filter((point) => point.row === strings - index - 1)
      .map((point) => point.fret),
  );

// Validate a fingering against the instrument pitches and scale formula rather
// than reconstructing the fingering algorithm. Conventional blues boxes can
// deliberately omit an intermediate blue note in some octaves.
function assertMusicalPattern(input, pattern, { consecutive = true } = {}) {
  const state = selection(input);
  const points = new Map(
    boardModel({ ...state, allNotes: false }).points.map((point) => [
      coordinate(point),
      point,
    ]),
  );
  const selected = new Set(pattern.points.map(coordinate));
  assert.equal(selected.size, pattern.points.length, 'no duplicated string/fret');
  assert.equal(pattern.lo, Math.min(...pattern.points.map((point) => point.fret)));
  assert.equal(pattern.hi, Math.max(...pattern.points.map((point) => point.fret)));
  assert.deepEqual(
    new Set(pattern.points.map((point) => mod(point.midi - state.root))),
    new Set(state.scaleData.intervals),
    'the fingering contains every scale pitch class',
  );
  for (const [index, point] of pattern.points.entries()) {
    assert.deepEqual(point, points.get(coordinate(point)), 'actual instrument pitch');
    assert.ok(point.fret >= 0 && point.fret <= state.frets);
    if (!index) continue;
    const previous = pattern.points[index - 1];
    assert.ok(point.midi > previous.midi, 'fingering ascends in sounding pitch');
    if (consecutive)
      for (let pitch = previous.midi + 1; pitch < point.midi; pitch++)
        assert.ok(
          !state.scaleData.intervals.includes(mod(pitch - state.root)),
          'a notes-per-string route does not skip scale tones',
        );
  }
  assert.equal(pattern.sequence[0].root, true, 'playback begins on the tonic');
  assert.deepEqual(pattern.sequence[0], pattern.sequence.at(-1));
  assert.deepEqual(new Set(pattern.sequence.map(coordinate)), selected);
  for (let index = 1; index < pattern.sequence.length; index++) {
    const before = pattern.points.findIndex(
      (point) => coordinate(point) === coordinate(pattern.sequence[index - 1]),
    );
    const after = pattern.points.findIndex(
      (point) => coordinate(point) === coordinate(pattern.sequence[index]),
    );
    assert.equal(
      Math.abs(after - before),
      1,
      'playback visits neighboring selected notes',
    );
  }
}

test('A harmonic minor and A Dorian first 3NPS fingerings match independent note spellings', () => {
  // Low E through high E. A harmonic minor: A B C / D E F / G# A B /
  // C D E / F G# A / B C D. A Dorian replaces F and G# with F# and G.
  const fixtures = {
    'harmonic-minor': [
      [5, 7, 8],
      [5, 7, 8],
      [6, 7, 9],
      [5, 7, 9],
      [6, 9, 10],
      [7, 8, 10],
    ],
    dorian: [
      [5, 7, 8],
      [5, 7, 9],
      [5, 7, 9],
      [5, 7, 9],
      [7, 8, 10],
      [7, 8, 10],
    ],
  };
  for (const [scale, expected] of Object.entries(fixtures)) {
    const state = { root: 9, scale, frets: 24 };
    const result = scalePatterns(state);
    assert.equal(result.system, 'three-per-string');
    const first = result.patterns.find((pattern) => pattern.number === 1);
    assert.ok(first);
    assert.deepEqual(stringsOf(first, 6), expected);
    assertMusicalPattern(state, first);
  }
});

test('the main seven-note families have complete, correctly numbered fingerings in every key', () => {
  for (const strings of [6, 7])
    for (let root = 0; root < 12; root++)
      for (const scale of heptatonic) {
        const state = { strings, root, scale: scale.id, frets: 24 };
        const result = scalePatterns(state);
        const compact = strings === 6 && ['major', 'natural-minor'].includes(scale.id);
        assert.equal(
          result.system,
          compact
            ? scale.id === 'major'
              ? 'caged-major'
              : 'caged-minor'
            : 'three-per-string',
          JSON.stringify(state),
        );
        assert.deepEqual(
          result.patterns.map((pattern) => pattern.number),
          Array.from({ length: compact ? 5 : 7 }, (_, index) => index + 1),
          JSON.stringify(state),
        );
        for (const pattern of result.patterns) {
          assertMusicalPattern(state, pattern);
          if (!compact) {
            assert.equal(pattern.points.length, strings * 3);
            assert.equal(
              pattern.shape,
              undefined,
              'derived modes have no CAGED chord label',
            );
            assert.equal(
              pattern.startDegree,
              prettyDegree(scale.formula[pattern.number - 1]),
            );
            assert.ok(stringsOf(pattern, strings).every((frets) => frets.length === 3));
          }
        }
        assert.deepEqual(scalePatterns({ ...state, hand: 'left' }), result);
      }
});

test('whole-tone and diminished routes preserve their scale steps on six and seven strings', () => {
  for (const strings of [6, 7])
    for (let root = 0; root < 12; root++)
      for (const scale of symmetric) {
        const state = { strings, root, scale, frets: 24 };
        const result = scalePatterns(state);
        const wholeTone = scale === 'whole-tone';
        const perString = wholeTone ? 3 : 4;
        const count = wholeTone ? 6 : 8;
        assert.equal(result.system, wholeTone ? 'three-per-string' : 'four-per-string');
        assert.deepEqual(
          result.patterns.map((pattern) => pattern.number),
          Array.from({ length: count }, (_, index) => index + 1),
          JSON.stringify(state),
        );
        for (const pattern of result.patterns) {
          assertMusicalPattern(state, pattern);
          assert.equal(pattern.points.length, strings * perString);
          assert.ok(
            stringsOf(pattern, strings).every((frets) => frets.length === perString),
          );
        }
        assert.deepEqual(scalePatterns({ ...state, hand: 'left' }), result);
      }
});

test('A major and minor blues first boxes match the checked conventional diagrams', () => {
  // Independently checked six-string diagrams. The minor box adds Eb at
  // A-string fret 6 and G-string fret 8; the major box adds C at low/high E
  // fret 8 and G-string fret 5.
  const fixtures = {
    'minor-blues': [
      [5, 8],
      [5, 6, 7],
      [5, 7],
      [5, 7, 8],
      [5, 8],
      [5, 8],
    ],
    'major-blues': [
      [5, 7, 8],
      [4, 7],
      [4, 7],
      [4, 5, 6],
      [5, 7],
      [5, 7, 8],
    ],
  };
  for (const [scale, expected] of Object.entries(fixtures)) {
    const state = { scale, root: 9, frets: 24 };
    const result = scalePatterns(state);
    assert.equal(result.system, 'blues');
    const first = result.patterns.find((pattern) => pattern.number === 1);
    assert.ok(first);
    assert.deepEqual(stringsOf(first, 6), expected);
    assertMusicalPattern(state, first, { consecutive: false });
  }
});

test('major and minor blues offer five complete fingerings in every key on six and seven strings', () => {
  for (const strings of [6, 7])
    for (const scale of blues)
      for (let root = 0; root < 12; root++) {
        const state = { scale, root, strings, frets: 24 };
        const result = scalePatterns(state);
        assert.equal(result.system, 'blues');
        assert.deepEqual(
          result.patterns.map((pattern) => pattern.number),
          [1, 2, 3, 4, 5],
        );
        for (const pattern of result.patterns) {
          assertMusicalPattern(state, pattern, { consecutive: false });
          assert.ok(
            stringsOf(pattern, strings).every(
              (frets) => frets.length >= 2 && frets.length <= 3,
            ),
          );
        }
        assert.deepEqual(scalePatterns({ ...state, hand: 'left' }), result);
      }
});

test('every main scale offers at least one complete pattern in the default octave view', () => {
  for (const strings of [6, 7])
    for (let root = 0; root < 12; root++)
      for (const scale of main) {
        const state = { strings, root, scale };
        const result = scalePatterns(state, { lo: 0, hi: 12 });
        assert.ok(result.patterns.length > 0, JSON.stringify(state));
        for (const pattern of result.patterns)
          assert.ok(pattern.points.every((point) => point.fret <= 12));
      }
});

test('bounded new fingerings keep the full shape and only move by a whole octave', () => {
  for (const strings of [6, 7])
    for (let root = 0; root < 12; root++)
      for (const scale of main) {
        const state = { strings, root, scale, frets: 24 };
        const complete = scalePatterns(state);
        for (const bounds of [
          { lo: 0, hi: 12 },
          { lo: 3, hi: 12 },
        ]) {
          const limited = scalePatterns(state, bounds);
          for (const pattern of limited.patterns) {
            assertMusicalPattern(state, pattern, { consecutive: !blues.includes(scale) });
            assert.ok(
              pattern.points.every(
                (point) => point.fret >= bounds.lo && point.fret <= bounds.hi,
              ),
            );
            const original = complete.patterns.find((other) => other.id === pattern.id);
            assert.ok(original, 'a bounded pattern retains its musical identity');
            assert.equal(pattern.points.length, original.points.length);
            const shift = original.points[0].fret - pattern.points[0].fret;
            assert.equal(mod(shift), 0);
            pattern.points.forEach((point, index) => {
              assert.equal(point.row, original.points[index].row);
              assert.equal(original.points[index].fret - point.fret, shift);
              assert.equal(original.points[index].midi - point.midi, shift);
            });
          }
        }
      }
});

test('uniformly detuned instruments retain the fingering geometry of the transposed key', () => {
  const expected = { 6: [5, 5, 5, 4, 5], 7: [5, 5, 5, 5, 4, 5] };
  const tunings = TUNINGS.filter(
    (tuning) =>
      tuning.instrument === 'guitar' &&
      expected[tuning.strings]?.every(
        (gap, index) => tuning.notes[index + 1] - tuning.notes[index] === gap,
      ),
  );
  assert.ok(tunings.length > 4);
  for (const tuning of tunings) {
    const standard = TUNINGS.find(
      (other) =>
        other.id === (tuning.strings === 6 ? 'guitar-standard' : 'guitar-7-standard'),
    );
    const delta = tuning.notes[0] - standard.notes[0];
    for (const scale of main) {
      const state = { strings: tuning.strings, scale, frets: 24 };
      const reference = scalePatterns({ ...state, tuning: standard.id, root: 3 });
      const transposed = scalePatterns({
        ...state,
        tuning: tuning.id,
        root: mod(3 + delta),
      });
      assert.equal(transposed.system, reference.system);
      assert.deepEqual(
        transposed.patterns.map((pattern) => stringsOf(pattern, tuning.strings)),
        reference.patterns.map((pattern) => stringsOf(pattern, tuning.strings)),
        `${tuning.id}: ${scale}`,
      );
      for (const pattern of transposed.patterns)
        assertMusicalPattern(
          { ...state, tuning: tuning.id, root: mod(3 + delta) },
          pattern,
          { consecutive: !blues.includes(scale) },
        );
    }
  }
});
