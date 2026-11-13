import test from 'node:test';
import assert from 'node:assert/strict';
import { selection, SCALES } from '../src/music.mjs';
import {
  restoreWorkspace,
  restoreRange,
  rememberWorkspace,
  readPreferences,
  changeSetup,
  exportPreview,
  scaleName,
} from '../src/workspace.mjs';

test('instrument and string setups are recalled without changing the selected music', () => {
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
  state = changeSetup(state, { tuning: 'bass-4-drop-c' }, saved);
  saved = rememberWorkspace(saved, state);
  state = changeSetup(state, { instrument: 'guitar' }, saved);
  assert.equal(state.strings, 7);
  assert.equal(state.tuning, 'guitar-7-drop-a');
  assert.equal(state.frets, 24);
  state = changeSetup(state, { strings: 6 }, saved);
  assert.equal(state.tuning, 'guitar-standard');
  state = changeSetup(state, { strings: 7 }, saved);
  assert.equal(state.tuning, 'guitar-7-drop-a');
  state = changeSetup(state, { instrument: 'bass' }, saved);
  assert.equal(state.tuning, 'bass-4-drop-c');
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
    JSON.stringify(rememberWorkspace({}, { ...original, range: '5-9' })),
  );
  for (const query of [{}, { lang: 'pt-BR' }, { labels: 'degrees' }]) {
    const restored = restoreWorkspace(query, saved);
    assert.equal(restored.root, 9);
    assert.equal(restored.scale, 'custom');
    assert.equal(restored.formula, original.formula);
    assert.equal(restoreRange(query, saved), '5-9');
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
  assert.equal(restoreRange({ range: '3-7' }, saved), '3-7');
  assert.equal(restoreRange({ frets: '24' }, saved), 'full');
  assert.equal(restoreRange({ frets: '24', range: '0-4' }, saved), '0-4');
  assert.equal(restoreRange({ root: '2' }, saved), 'lower');
  assert.equal(restoreRange({ scale: 'major' }, saved, { mobile: true }), '0-4');
  assert.equal(restoreRange({ range: 'invalid' }, saved), 'lower');
  assert.equal(restoreRange({ range: 'invalid' }, saved, { mobile: true }), '0-4');

  const legacy = { ...saved };
  delete legacy.practice;
  assert.equal(restoreWorkspace({}, legacy).root, 0);
  assert.equal(restoreWorkspace({}, legacy).scale, 'major');
  assert.equal(restoreRange({}, legacy), 'lower');
  assert.equal(restoreRange({}, legacy, { mobile: true }), '0-4');

  const malformed = {
    ...saved,
    practice: { root: 'NaN', scale: 'custom', formula: '1 5 3', range: '99-100' },
  };
  const restored = restoreWorkspace({}, malformed);
  assert.equal(restored.root, 0);
  assert.equal(restored.scale, 'major');
  assert.equal(restoreRange({}, malformed), 'lower');
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
