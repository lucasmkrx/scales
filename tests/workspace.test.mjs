import test from 'node:test';
import assert from 'node:assert/strict';
import { selection, SCALES } from '../src/music.mjs';
import {
  restoreWorkspace,
  restoreRange,
  restoreNeckView,
  rememberWorkspace,
  readPreferences,
  changeSetup,
  exportPreview,
  scaleName,
} from '../src/workspace.mjs';

test('switching instruments keeps the current orientation and recalls each setup', () => {
  let state = restoreWorkspace({
    instrument: 'guitar',
    strings: 7,
    tuning: 'guitar-7-drop-a',
    hand: 'left',
    frets: 24,
    root: 9,
    scale: 'natural-minor',
  });
  let saved = rememberWorkspace({}, state);
  state = changeSetup(state, { instrument: 'bass' }, saved);
  assert.equal(state.strings, 4);
  assert.equal(state.frets, 20);
  assert.equal(state.hand, 'left');
  assert.equal(state.root, 9);
  assert.equal(state.scale, 'natural-minor');
  state = changeSetup(state, { tuning: 'bass-4-drop-c', hand: 'right' }, saved);
  saved = rememberWorkspace(saved, state);
  state = changeSetup(state, { instrument: 'guitar' }, saved);
  assert.equal(state.hand, 'right');
  assert.equal(state.strings, 7);
  assert.equal(state.tuning, 'guitar-7-drop-a');
  assert.equal(state.frets, 24);
  state = changeSetup(state, { strings: 6 }, saved);
  assert.equal(state.tuning, 'guitar-standard');
  state = changeSetup(state, { strings: 7 }, saved);
  assert.equal(state.tuning, 'guitar-7-drop-a');
  state = changeSetup(state, { instrument: 'bass' }, saved);
  assert.equal(state.tuning, 'bass-4-drop-c');
  assert.equal(state.hand, 'right');
});
test('partial links recall the current orientation and the tuning for the selected strings', () => {
  const six = restoreWorkspace({
    tuning: 'guitar-eb-standard',
    hand: 'right',
    frets: 21,
  });
  const seven = restoreWorkspace({
    strings: 7,
    tuning: 'guitar-7-drop-a',
    hand: 'left',
    frets: 24,
  });
  const saved = rememberWorkspace(rememberWorkspace({}, six), seven);
  const linked = restoreWorkspace({ instrument: 'guitar', strings: '6' }, saved);
  assert.equal(linked.tuning, 'guitar-eb-standard');
  assert.equal(linked.hand, 'left');
  assert.equal(linked.frets, 24);
  assert.equal(restoreWorkspace({ instrument: 'bass' }, saved).hand, 'left');
  assert.equal(restoreWorkspace({ strings: '6', hand: 'right' }, saved).hand, 'right');
});
test('older setups use the last active instrument’s orientation on either instrument', () => {
  const saved = readPreferences(
    JSON.stringify({
      version: 1,
      instrument: 'bass',
      setups: {
        guitar: { strings: 6, tuning: 'guitar-drop-d', hand: 'right' },
        bass: { strings: 4, tuning: 'bass-4-drop-c', hand: 'left' },
      },
    }),
  );
  assert.equal(restoreWorkspace({}, saved).hand, 'left');
  const guitar = restoreWorkspace({ instrument: 'guitar' }, saved);
  assert.equal(guitar.hand, 'left');
  assert.equal(guitar.tuning, 'guitar-drop-d');
  const next = rememberWorkspace(saved, changeSetup(guitar, { hand: 'right' }, saved));
  const bass = restoreWorkspace({ instrument: 'bass' }, next);
  assert.equal(bass.hand, 'right');
  assert.equal(bass.tuning, 'bass-4-drop-c');
  assert.equal(restoreWorkspace({ instrument: 'bass', hand: 'left' }, next).hand, 'left');
});
test('saved preferences survive reload, while shared links override remembered configuration', () => {
  const saved = rememberWorkspace(
    {},
    restoreWorkspace({
      instrument: 'bass',
      strings: 6,
      tuning: 'bass-6-standard',
      lang: 'pt',
      labels: 'degrees',
      spelling: 'flat',
      frets: 24,
    }),
  );
  const decoded = readPreferences(JSON.stringify(saved));
  assert.equal(restoreWorkspace({}, decoded).instrument, 'bass');
  assert.equal(restoreWorkspace({}, decoded).strings, 6);
  const linked = restoreWorkspace(
    {
      instrument: 'guitar',
      strings: '6',
      tuning: 'guitar-standard',
      lang: 'en',
      hand: 'left',
      frets: '21',
      labels: 'notes',
      spelling: 'both',
    },
    decoded,
  );
  assert.equal(linked.instrument, 'guitar');
  assert.equal(linked.strings, 6);
  assert.equal(linked.lang, 'en');
  assert.equal(linked.frets, 21);
  assert.equal(linked.spelling, 'both');
  for (const raw of [null, 'not json', 'null', '{"version":2}', '[]'])
    assert.deepEqual(readPreferences(raw), {});
});
test('custom tuning pitches are remembered for their own instrument and string count', () => {
  const original = restoreWorkspace({
      instrument: 'bass',
      strings: 4,
      tuning: 'custom',
      customTuning: 'C1 G1 C2 F2',
    }),
    saved = rememberWorkspace({}, original);
  const other = changeSetup(original, { strings: 5 }, saved);
  assert.notEqual(other.tuning, 'custom');
  const recalled = changeSetup(other, { strings: 4 }, saved);
  assert.deepEqual(selection(recalled).tuningData.notes, [24, 31, 36, 41]);
});
test('the last root, custom scale, and position resume without overriding shared music', () => {
  const original = restoreWorkspace({
    root: 9,
    scale: 'custom',
    formula: '1 b3 5 b7',
    lang: 'es',
  });
  const saved = readPreferences(
    JSON.stringify(rememberWorkspace({}, { ...original, range: 'three-per-string-3' })),
  );
  for (const query of [{}, { lang: 'pt-BR' }, { labels: 'degrees' }]) {
    const restored = restoreWorkspace(query, saved);
    assert.equal(restored.root, 9);
    assert.equal(restored.scale, 'custom');
    assert.equal(restored.formula, original.formula);
    assert.equal(restoreRange(query, saved), 'three-per-string-3');
  }
  assert.equal(restoreWorkspace({ lang: 'pt-BR' }, saved).lang, 'pt');

  const named = restoreWorkspace({ scale: 'natural-minor', root: 2 }, saved);
  assert.equal(named.root, 2);
  assert.equal(named.scale, 'natural-minor');
  assert.equal(named.formula, undefined);
  const linkedCustom = restoreWorkspace(
    { scale: 'custom', root: 5, formula: '1 2 4 5' },
    saved,
  );
  assert.equal(linkedCustom.formula, '1 2 4 5');
  assert.equal(linkedCustom.root, 5);
  assert.equal(restoreWorkspace({ root: 7 }, saved).scale, 'major');
  assert.equal(restoreWorkspace({ scale: 'custom' }, saved).scale, 'major');

  const nextSaved = rememberWorkspace(saved, { ...named, range: 'upper' });
  assert.equal(nextSaved.practice.formula, undefined);
  assert.equal(restoreWorkspace({}, nextSaved).root, 2);
  assert.equal(restoreRange({}, nextSaved), 'upper');
});
test('shared ranges, older links, and malformed saved practice have predictable fallbacks', () => {
  const original = restoreWorkspace({ root: 7, scale: 'minor-pentatonic' });
  const saved = rememberWorkspace({}, { ...original, range: '8-12' });
  assert.equal(restoreRange({ range: '3-7' }, saved), 'full');
  assert.equal(restoreRange({ frets: '24' }, saved), 'full');
  assert.equal(restoreRange({ frets: '24', range: '0-4' }, saved), 'full');
  assert.equal(restoreRange({ root: '2' }, saved), 'full');
  assert.equal(restoreRange({ scale: 'major' }, saved, { mobile: true }), 'full');
  assert.equal(restoreRange({ range: 'invalid' }, saved), 'full');
  assert.equal(restoreRange({ range: 'invalid' }, saved, { mobile: true }), 'full');

  const legacy = { ...saved };
  delete legacy.practice;
  assert.equal(restoreWorkspace({}, legacy).root, 0);
  assert.equal(restoreWorkspace({}, legacy).scale, 'major');
  assert.equal(restoreRange({}, legacy), 'full');
  assert.equal(restoreRange({}, legacy, { mobile: true }), 'full');

  const malformed = {
    ...saved,
    practice: { root: 'NaN', scale: 'custom', formula: '1 5 3', range: '99-100' },
  };
  const restored = restoreWorkspace({}, malformed);
  assert.equal(restored.root, 0);
  assert.equal(restored.scale, 'major');
  assert.equal(restoreRange({}, malformed), 'full');
  assert.equal(rememberWorkspace(saved, restored).practice.formula, undefined);
});
test('export estimates include covers, reading pages, and additional contents pages', () => {
  assert.deepEqual(exportPreview({ scale: 'major' }), { count: 1, pages: 3 });
  assert.deepEqual(exportPreview({ scale: 'major' }, { allKeys: true }), {
    count: 12,
    pages: 14,
  });
  assert.deepEqual(
    exportPreview({ scale: 'major' }, { scope: 'family', allKeys: true }),
    { count: 7, pages: 9 },
  );
  assert.deepEqual(exportPreview({ scale: 'major' }, { scope: 'catalog' }), {
    count: SCALES.length,
    pages: 70,
  });
  assert.deepEqual(
    exportPreview({ scale: 'custom', formula: '1 b3 5' }, { scope: 'family' }),
    { count: 0, pages: 0 },
  );
});
test('simple scale names retain qualifications that distinguish different scales', () => {
  assert.equal(scaleName(SCALES.find((s) => s.id === 'natural-minor')), 'Natural minor');
  assert.equal(
    scaleName(SCALES.find((s) => s.id === 'diminished-wh')),
    'Diminished (whole-half)',
  );
  assert.equal(
    scaleName(SCALES.find((s) => s.id === 'diminished-hw')),
    'Diminished (half-whole)',
  );
  assert.match(scaleName(SCALES.find((s) => s.id === 'pelog')), /approximation/);
});

test('pattern identifiers survive links and saved state without accepting invalid systems or numbers', () => {
  for (const range of [
    'caged-major-1',
    'caged-minor-5',
    'three-per-string-7',
    'four-per-string-8',
    'two-per-string-5',
    'blues-5',
    'octave-3',
  ]) {
    const saved = rememberWorkspace({}, { scale: 'major', range });
    assert.equal(restoreRange({}, saved), range);
    assert.equal(restoreRange({ range }, {}), range);
  }
  for (const range of [
    'caged-major-6',
    'caged-minor-0',
    'three-per-string-8',
    'four-per-string-9',
    'two-per-string-6',
    'blues-6',
    'octave-6',
    '5-9',
  ])
    assert.equal(restoreRange({ range }), 'full');
});

test('neck view defaults to 0–12, remembers an explicit choice, and respects shared links', () => {
  assert.equal(restoreNeckView(), 'octave');
  const saved = rememberWorkspace({}, { neckView: 'full' });
  assert.equal(saved.preferences.neckView, 'full');
  assert.equal(restoreNeckView({}, saved), 'full');
  assert.equal(restoreNeckView({ neck: 'octave' }, saved), 'octave');
  assert.equal(restoreNeckView({ neck: 'full' }), 'full');
  assert.equal(restoreNeckView({ neck: 'invalid' }, saved), 'octave');
  assert.equal(restoreNeckView({}, { preferences: { neckView: 'broken' } }), 'octave');
});

test('explicit enharmonic tonics survive saved practice and musical links', () => {
  const state = { root: 6, tonic: 'Gb', scale: 'major', spelling: 'key' };
  const saved = rememberWorkspace({}, state);
  assert.equal(restoreWorkspace({}, saved).tonic, 'Gb');
  assert.equal(
    restoreWorkspace({ root: 6, tonic: 'F#', scale: 'major', spelling: 'key' }, saved)
      .tonic,
    'F#',
  );
  assert.equal(restoreWorkspace({ root: 9, scale: 'major' }, saved).tonic, undefined);
});
