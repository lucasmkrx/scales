import test from 'node:test';
import assert from 'node:assert/strict';
import { SCALES, TUNINGS, boardModel, parseNote, selection } from '../src/music.mjs';
import { positionSequence, practiceExercise, intervalName } from '../src/practice.mjs';

test('position playback stays inside the shown region for every tuning and catalog collection', () => {
  for (const tuning of TUNINGS)
    for (const [index, scale] of SCALES.entries())
      for (const bounds of [
        { lo: 0, hi: 4 },
        { lo: 8, hi: 12 },
      ]) {
        const state = {
          instrument: tuning.instrument,
          strings: tuning.strings,
          tuning: tuning.id,
          scale: scale.id,
          root: index % 12,
          allNotes: true,
        };
        const visible = new Set(
          boardModel({ ...state, allNotes: false }, bounds).points.map(
            (point) => point.midi,
          ),
        );
        const route = positionSequence(state, bounds);
        assert.ok(
          route.notes.every((note) => visible.has(note)),
          `${tuning.id} ${scale.id}`,
        );
        assert.equal(route.notes.length > 0, visible.size > 0);
        assert.deepEqual(
          positionSequence({ ...state, hand: 'left' }, bounds),
          route,
          'handedness changes coordinates without changing sounding notes',
        );
        if (route.complete) {
          const up = route.notes.slice(0, scale.intervals.length + 1);
          assert.equal(up[0] % 12, state.root);
          assert.deepEqual(
            up.map((note) => note - up[0]),
            scale.intervals.concat(12),
          );
          assert.deepEqual(route.notes.slice(up.length), up.slice(0, -1).reverse());
        }
      }
});

test('a higher region shifts the demonstration into its visible register', () => {
  const low = positionSequence({ root: 0, scale: 'major' }, { lo: 0, hi: 4 });
  const high = positionSequence({ root: 0, scale: 'major' }, { lo: 13, hi: 17 });
  assert.equal(low.complete, true);
  assert.equal(high.complete, true);
  assert.ok(high.notes[0] > low.notes[0]);
});

test('empty and incomplete custom positions cannot play hidden or out-of-scale notes', () => {
  const state = {
    instrument: 'bass',
    strings: 4,
    tuning: 'custom',
    customTuning: 'C0 C3 C5 C8',
    scale: 'custom',
    formula: '1 2 3 4 5 6 7',
    root: 0,
  };
  assert.deepEqual(positionSequence(state, { lo: 0, hi: 0 }), {
    notes: [12],
    complete: false,
  });
  assert.deepEqual(
    positionSequence({ ...state, root: 1, formula: '1' }, { lo: 0, hi: 0 }),
    {
      notes: [],
      complete: false,
    },
  );
  assert.deepEqual(
    practiceExercise({ ...state, root: 1, formula: '1' }, { lo: 0, hi: 0 }),
    [],
  );
});

test('short exercises name only visible selected notes, including sparse custom scales', () => {
  assert.deepEqual(practiceExercise({ root: 0, scale: 'major' }, { lo: 0, hi: 4 }), [
    'C',
    'E',
    'G',
    'C',
  ]);
  const states = [
    ...SCALES.map((scale) => ({ scale: scale.id, root: 1, spelling: 'both' })),
    { scale: 'custom', formula: '1 b2 #4', root: 9 },
    { scale: 'custom', formula: '1', root: 0 },
    {
      instrument: 'bass',
      strings: 4,
      tuning: 'custom',
      customTuning: 'C0 C3 C5 C8',
      scale: 'custom',
      formula: '1 b3 5',
      root: 1,
    },
  ];
  for (const state of states) {
    const bounds = { lo: 0, hi: 4 };
    const selected = selection(state);
    const visible = new Set(
      boardModel({ ...state, allNotes: false }, bounds).points.map((point) => point.pc),
    );
    const phrase = practiceExercise(state, bounds);
    assert.ok(phrase.length <= 4);
    for (const note of phrase)
      for (const spelling of note.split('/'))
        assert.ok(visible.has(parseNote(`${spelling}4`) % 12), selected.scaleData.id);
    if (phrase.length > 1) assert.equal(phrase.at(-1), phrase[0]);
  }
});

test('interval names preserve the written degree and support all three locales', () => {
  assert.equal(intervalName('5'), 'perfect fifth');
  assert.equal(intervalName('5', 'pt-BR'), 'quinta justa');
  assert.equal(intervalName('5', 'es-419'), 'quinta justa');
  assert.equal(intervalName('♭♭7'), 'diminished seventh');
  assert.equal(intervalName('6'), 'major sixth');
  assert.equal(intervalName('♯2', 'es'), 'segunda aumentada');
  assert.equal(intervalName('♭3', 'es'), 'tercera menor');
  assert.equal(intervalName('##1', 'pt'), 'grau ♯♯1');
  for (const scale of SCALES)
    for (const degree of scale.formula)
      for (const lang of ['en', 'pt', 'es'])
        assert.doesNotMatch(intervalName(degree, lang), /^(degree|grau|grado) /);
});

test('exercise and octave previews use exact coordinates when given a pattern point set', () => {
  const state = { root: 0, scale: 'major' };
  const points = boardModel(state).points;
  const root = points.find((point) => point.midi === 48);
  const fifth = points.find((point) => point.midi === 55);
  const focus = { points: [root, fifth] };
  assert.deepEqual(practiceExercise(state, focus), ['C', 'G', 'C']);
  assert.deepEqual(positionSequence(state, focus), {
    notes: [48, 55, 48],
    complete: false,
  });
});
