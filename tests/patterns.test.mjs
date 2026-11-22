import test from 'node:test';
import assert from 'node:assert/strict';
import { boardModel, selection, TUNINGS, SCALES } from '../src/music.mjs';
import { scalePatterns } from '../src/patterns.mjs';

const fretsByString = (points, strings) =>
  Array.from({ length: strings }, (_, i) =>
    points.filter((point) => point.row === strings - i - 1).map((point) => point.fret),
  );
const key = (point) => `${point.row}:${point.fret}`;
// Independently transcribed from the five diagrams in each primary lesson:
// https://appliedguitartheory.com/lessons/major-scale/
// https://appliedguitartheory.com/lessons/natural-minor-scale/
// Each nested row is a string, low E to high E. These are exact fingerings,
// including deliberate lower/upper extensions, not rectangular note windows.
const majorInG = [
  [
    [2, 3, 5],
    [2, 3, 5],
    [2, 4, 5],
    [2, 4, 5],
    [3, 5],
    [2, 3, 5],
  ],
  [
    [5, 7, 8],
    [5, 7],
    [4, 5, 7],
    [4, 5, 7],
    [5, 7, 8],
    [5, 7, 8],
  ],
  [
    [7, 8, 10],
    [7, 9, 10],
    [7, 9, 10],
    [7, 9],
    [7, 8, 10],
    [7, 8, 10],
  ],
  [
    [8, 10, 12],
    [9, 10, 12],
    [9, 10, 12],
    [9, 11, 12],
    [10, 12, 13],
    [10, 12],
  ],
  [
    [12, 14, 15],
    [12, 14, 15],
    [12, 14],
    [11, 12, 14],
    [12, 13, 15],
    [12, 14, 15],
  ],
];
const minorInG = [
  [
    [3, 5, 6],
    [3, 5, 6],
    [3, 5],
    [2, 3, 5],
    [3, 4, 6],
    [3, 5, 6],
  ],
  [
    [5, 6, 8],
    [5, 6, 8],
    [5, 7, 8],
    [5, 7, 8],
    [6, 8],
    [5, 6, 8],
  ],
  [
    [8, 10, 11],
    [8, 10],
    [7, 8, 10],
    [7, 8, 10],
    [8, 10, 11],
    [8, 10, 11],
  ],
  [
    [10, 11, 13],
    [10, 12, 13],
    [10, 12, 13],
    [10, 12],
    [10, 11, 13],
    [10, 11, 13],
  ],
  [
    [11, 13, 15],
    [12, 13, 15],
    [12, 13, 15],
    [12, 14, 15],
    [13, 15, 16],
    [13, 15],
  ],
];
const minorPentaInA = [
  [
    [5, 8],
    [5, 7],
    [5, 7],
    [5, 7],
    [5, 8],
    [5, 8],
  ],
  [
    [8, 10],
    [7, 10],
    [7, 10],
    [7, 9],
    [8, 10],
    [8, 10],
  ],
  [
    [10, 12],
    [10, 12],
    [10, 12],
    [9, 12],
    [10, 13],
    [10, 12],
  ],
  [
    [12, 15],
    [12, 15],
    [12, 14],
    [12, 14],
    [13, 15],
    [12, 15],
  ],
  [
    [15, 17],
    [15, 17],
    [14, 17],
    [14, 17],
    [15, 17],
    [15, 17],
  ],
];
const transpose = (shapes, offset) =>
  shapes.map((shape) => shape.map((string) => string.map((fret) => fret + offset)));

function assertPattern(state, pattern) {
  const s = selection(state);
  const lookup = new Map(
    boardModel({ ...s, allNotes: false }).points.map((point) => [key(point), point]),
  );
  for (const point of pattern.points) {
    assert.deepEqual(point, lookup.get(key(point)));
    assert.ok(point.fret >= 0 && point.fret <= s.frets);
  }
  assert.equal(new Set(pattern.points.map(key)).size, pattern.points.length);
  assert.equal(pattern.lo, Math.min(...pattern.points.map((point) => point.fret)));
  assert.equal(pattern.hi, Math.max(...pattern.points.map((point) => point.fret)));
  for (let i = 1; i < pattern.points.length; i++) {
    assert.ok(pattern.points[i].midi > pattern.points[i - 1].midi);
    for (let midi = pattern.points[i - 1].midi + 1; midi < pattern.points[i].midi; midi++)
      assert.ok(!s.scaleData.intervals.includes((((midi - s.root) % 12) + 12) % 12));
  }
}

test('all five G and C major CAGED shapes match the independently checked E-D-C-A-G diagrams', () => {
  for (const [root, offset] of [
    [7, 0],
    [0, 5],
  ]) {
    const state = { scale: 'major', root, frets: 24 };
    const result = scalePatterns(state);
    assert.equal(result.system, 'caged-major');
    assert.equal(result.patterns.length, 5);
    assert.deepEqual(
      result.patterns.map((pattern) => pattern.shape),
      ['E', 'D', 'C', 'A', 'G'],
    );
    assert.deepEqual(
      result.patterns.map((pattern) => fretsByString(pattern.points, 6)),
      transpose(majorInG, offset),
    );
    for (const pattern of result.patterns) assertPattern(state, pattern);
  }
});

test('C major first pattern includes high E fret 8, excludes fret 12, and fits frets 7–10', () => {
  const state = { scale: 'major', root: 0 };
  const pattern = scalePatterns(state, { lo: 0, hi: 12 }).patterns.find(
    (pattern) => pattern.number === 1,
  );
  assert.equal(pattern.id, 'caged-major-1');
  assert.deepEqual([pattern.lo, pattern.hi], [7, 10]);
  assert.ok(
    pattern.points.some((point) => point.row === 0 && point.fret === 8 && point.root),
  );
  assert.ok(pattern.points.every((point) => point.fret !== 12));
  assert.equal(pattern.points.length, 17);
  assert.equal(
    pattern.points[0].degree,
    '7',
    'the checked shape includes its lower leading tone',
  );
  assertPattern(state, pattern);
});

test('all five G and A natural-minor positions match the independently checked minor chord forms', () => {
  for (const [root, offset] of [
    [7, 0],
    [9, 2],
  ]) {
    const state = { scale: 'natural-minor', root, frets: 24 };
    const result = scalePatterns(state);
    assert.equal(result.system, 'caged-minor');
    assert.equal(result.patterns.length, 5);
    assert.deepEqual(
      result.patterns.map((pattern) => pattern.shape),
      ['Em', 'Dm', 'Cm', 'Am', 'Gm'],
    );
    assert.deepEqual(
      result.patterns.map((pattern) => fretsByString(pattern.points, 6)),
      transpose(minorInG, offset),
    );
    for (const pattern of result.patterns) assertPattern(state, pattern);
  }
});

test('A minor pentatonic preserves its five familiar two-note-per-string shapes', () => {
  const state = { scale: 'minor-pentatonic', root: 9 };
  const result = scalePatterns(state);
  assert.equal(result.system, 'two-per-string');
  assert.deepEqual(
    result.patterns.map((pattern) => fretsByString(pattern.points, 6)),
    minorPentaInA,
  );
  assert.deepEqual(
    result.patterns.map((pattern) => pattern.startDegree),
    ['1', '♭3', '4', '5', '♭7'],
  );
  for (const pattern of result.patterns) assertPattern(state, pattern);
});

test('major/minor templates transpose in every key and standard-interval six-string tuning without inventing notes', () => {
  const tunings = TUNINGS.filter(
    (tuning) =>
      tuning.instrument === 'guitar' &&
      tuning.strings === 6 &&
      [5, 5, 5, 4, 5].every((gap, i) => tuning.notes[i + 1] - tuning.notes[i] === gap),
  );
  assert.ok(tunings.length > 2);
  for (const tuning of tunings)
    for (let root = 0; root < 12; root++)
      for (const scale of [
        'major',
        'natural-minor',
        'major-pentatonic',
        'minor-pentatonic',
      ]) {
        const state = {
          instrument: 'guitar',
          strings: 6,
          tuning: tuning.id,
          root,
          scale,
          frets: 20,
        };
        const result = scalePatterns(state);
        assert.equal(result.patterns.length, 5, JSON.stringify(state));
        for (const pattern of result.patterns) assertPattern(state, pattern);
        assert.deepEqual(scalePatterns({ ...state, hand: 'left' }), result);
      }
});

test('seven-string pentatonics use five shapes and major/minor use seven 3NPS fingerings', () => {
  for (const scale of ['major-pentatonic', 'minor-pentatonic']) {
    const state = { strings: 7, scale, root: 9 };
    const result = scalePatterns(state);
    assert.equal(result.patterns.length, 5);
    assert.ok(result.patterns.every((pattern) => pattern.points.length === 14));
    for (const pattern of result.patterns) assertPattern(state, pattern);
  }
  for (const scale of ['major', 'natural-minor']) {
    const state = { strings: 7, scale };
    const result = scalePatterns(state);
    assert.equal(result.system, 'three-per-string');
    assert.equal(result.patterns.length, 7);
    assert.ok(result.patterns.every((pattern) => pattern.points.length === 21));
    for (const pattern of result.patterns) assertPattern(state, pattern);
  }
});

test('exotic seven-note collections keep a fallback, and familiar custom signatures retain checked CAGED shapes', () => {
  for (const scale of SCALES.filter(
    (scale) =>
      scale.intervals.length === 7 &&
      !['major', 'harmonic-minor', 'melodic-minor'].includes(scale.family),
  )) {
    assert.deepEqual(scalePatterns({ scale: scale.id }), {
      system: null,
      patterns: [],
      reason: 'unsupported-scale',
    });
  }
  assert.equal(
    scalePatterns({ scale: 'custom', formula: '1 2 3 4 5 6 7' }).system,
    'caged-major',
  );
  assert.equal(
    scalePatterns({ scale: 'custom', formula: '1 2 b3 4 5 b6 b7' }).system,
    'caged-minor',
  );
});

test('unsupported scales and altered tuning intervals return an honest note-map fallback', () => {
  for (const state of [
    { scale: 'chromatic' },
    { scale: 'custom', formula: '1 b2 3 #4 6' },
  ])
    assert.deepEqual(scalePatterns(state), {
      system: null,
      patterns: [],
      reason: 'unsupported-scale',
    });
  assert.deepEqual(
    scalePatterns({
      tuning: 'custom',
      customTuning: 'D2 A2 D3 G3 B3 E4',
      scale: 'major',
    }),
    { system: null, patterns: [], reason: 'unsupported-tuning' },
  );
  assert.equal(
    scalePatterns({ tuning: 'custom', customTuning: 'D2 G2 C3 F3 A3 D4', scale: 'major' })
      .system,
    'caged-major',
  );
});

test('bass patterns remain compact root-to-octave routes on actual strings', () => {
  for (const strings of [4, 5, 6]) {
    const state = { instrument: 'bass', strings, scale: 'major', root: 7 };
    const result = scalePatterns(state);
    assert.equal(result.system, 'octave');
    assert.ok(result.patterns.length > 0);
    for (const pattern of result.patterns) {
      assertPattern(state, pattern);
      assert.equal(pattern.points.length, 8);
      assert.equal(pattern.points.at(-1).midi - pattern.points[0].midi, 12);
      assert.ok(pattern.hi - pattern.lo <= 5);
    }
  }
  assert.deepEqual(
    scalePatterns({
      instrument: 'bass',
      strings: 4,
      tuning: 'custom',
      customTuning: 'C0 C3 C5 C8',
      scale: 'major',
    }),
    { system: 'octave', patterns: [], reason: 'no-fit' },
  );
});

test('CAGED shapes only shift by whole octaves and never clip to fit a view', () => {
  const state = { scale: 'major', root: 0, frets: 24 };
  const full = scalePatterns(state);
  const limited = scalePatterns(state, { lo: 0, hi: 12 });
  assert.deepEqual(
    limited.patterns.map((pattern) => pattern.number),
    [1, 3, 4, 5],
  );
  const high = full.patterns.find((pattern) => pattern.number === 3);
  const low = limited.patterns.find((pattern) => pattern.number === 3);
  assert.equal(high.startFret, 12);
  assert.equal(low.startFret, 0);
  assert.equal(low.id, high.id);
  for (let i = 0; i < high.points.length; i++) {
    assert.equal(high.points[i].row, low.points[i].row);
    assert.equal(high.points[i].fret - low.points[i].fret, 12);
    assert.equal(high.points[i].midi - low.points[i].midi, 12);
  }
  assert.deepEqual(
    scalePatterns(state, { lo: 3, hi: 12 }).patterns.map((pattern) => pattern.number),
    [1, 5],
  );
  const openRoot = scalePatterns({ root: 4, scale: 'major' }).patterns[0];
  assert.equal(
    openRoot.lo,
    11,
    'the complete E-shape shifts up instead of clipping the low-string leading tone at fret -1',
  );
  assert.equal(openRoot.hi, 14);
});

test('bounded patterns keep complete source geometry and identities across keys, scales, and guitar string counts', () => {
  for (const strings of [6, 7])
    for (let root = 0; root < 12; root++)
      for (const scale of [
        'major',
        'natural-minor',
        'major-pentatonic',
        'minor-pentatonic',
      ]) {
        const state = { strings, root, scale, frets: 24 };
        const full = scalePatterns(state);
        const limited = scalePatterns(state, { lo: 0, hi: 12 });
        for (const pattern of limited.patterns) {
          assertPattern(state, pattern);
          assert.ok(pattern.points.every((point) => point.fret >= 0 && point.fret <= 12));
          const original = full.patterns.find((other) => other.id === pattern.id);
          assert.ok(original);
          assert.equal(pattern.points.length, original.points.length);
          const shift = original.points[0].fret - pattern.points[0].fret;
          assert.equal(shift % 12, 0);
          for (let i = 0; i < original.points.length; i++) {
            assert.equal(original.points[i].row, pattern.points[i].row);
            assert.equal(original.points[i].fret - pattern.points[i].fret, shift);
            assert.equal(original.points[i].midi - pattern.points[i].midi, shift);
          }
        }
      }
});

test('bounded bass routes retain complete existing fingerings and stable IDs/numbers', () => {
  for (const strings of [4, 5, 6])
    for (let root = 0; root < 12; root++) {
      const state = { instrument: 'bass', strings, root, scale: 'major' };
      const full = scalePatterns(state);
      for (const bounds of [
        { lo: 0, hi: 12 },
        { lo: 3, hi: 8 },
      ]) {
        const limited = scalePatterns(state, bounds);
        assert.deepEqual(
          limited.patterns,
          full.patterns.filter((pattern) =>
            pattern.points.every(
              (point) => point.fret >= bounds.lo && point.fret <= bounds.hi,
            ),
          ),
        );
        for (const pattern of limited.patterns) assertPattern(state, pattern);
      }
    }
});

test('invalid or too-small bounds cannot produce clipped fingerings', () => {
  for (const bounds of [
    { lo: -1, hi: 12 },
    { lo: 12, hi: 0 },
    { lo: 0, hi: 25 },
    { lo: 0.5, hi: 12 },
    { lo: 0, hi: NaN },
    { lo: 0, hi: Infinity },
    { lo: null, hi: 12 },
    { lo: 0, hi: null },
  ])
    assert.deepEqual(scalePatterns({ root: 0, scale: 'major', frets: 24 }, bounds), {
      system: null,
      patterns: [],
      reason: 'no-fit',
    });
  assert.deepEqual(scalePatterns({ scale: 'major' }, { lo: 0, hi: 0 }), {
    system: 'caged-major',
    patterns: [],
    reason: 'no-fit',
  });
});
