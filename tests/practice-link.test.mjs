import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, normalizeState, TUNINGS } from '../src/music.mjs';
import { rememberWorkspace } from '../src/workspace.mjs';
import { practiceParams, readPracticeLink } from '../src/practice-link.mjs';

const saved = rememberWorkspace(
  {},
  {
    instrument: 'bass',
    strings: 5,
    tuning: 'bass-5-drop-a',
    frets: 24,
    hand: 'left',
    labels: 'degrees',
    allNotes: true,
    lang: 'pt',
    root: 6,
    tonic: 'Gb',
    scale: 'minor-blues',
    range: 'octave-1',
  },
);

function assertPortable(input, range = 'full') {
  const expected = normalizeState(input);
  const params = practiceParams(expected, range);
  const restored = readPracticeLink(params, saved);
  for (const field of [...Object.keys(DEFAULTS), 'tonic']) {
    assert.equal(restored.state[field], expected[field], `${field} in ${params}`);
  }
  if (expected.scale === 'custom') assert.equal(restored.state.formula, expected.formula);
  if (expected.tuning === 'custom')
    assert.deepEqual(restored.state.customNotes, expected.customNotes);
  assert.equal(restored.range, range);
  assert.equal(
    practiceParams(restored.state, restored.range).toString(),
    params.toString(),
  );
  return params;
}

test('a shared link names the key and omits default settings, even on another device', () => {
  assert.equal(assertPortable({}).toString(), 'key=C');
  assert.equal(
    assertPortable({ root: 5, scale: 'minor-blues', hand: 'left' }).toString(),
    'key=F&scale=minor-blues&hand=left',
  );
  assert.equal(
    assertPortable({ instrument: 'bass' }).toString(),
    'key=C&instrument=bass',
  );
});

test('each preset reopens under the correct instrument and string count', () => {
  for (const { instrument, strings, id } of TUNINGS) {
    const params = assertPortable({ instrument, strings, tuning: id });
    const defaultTuning = normalizeState({ instrument, strings }).tuning;
    assert.equal(params.has('tuning'), id !== defaultTuning, id);
    assert.equal(
      params.has('strings'),
      strings !== normalizeState({ instrument }).strings,
      id,
    );
    assert.equal(params.has('frets'), false, id);
    if (id === 'guitar-drop-d' || id === 'bass-4-drop-d') {
      assert.equal(params.get('tuning'), 'drop-d', id);
    }
  }
});

test('named keys distinguish pinned tonic spellings from automatic ones', () => {
  for (const [root, tonic] of [
    [6, 'F#'],
    [6, 'Gb'],
    [0, 'B#'],
    [11, 'Cb'],
    [2, 'C##'],
  ]) {
    const params = assertPortable({ root, tonic });
    assert.equal(params.get('key'), tonic);
    assert.equal(params.has('spell'), false);
    if (tonic.includes('#')) assert.ok(params.toString().includes('%23'));
  }
  assert.equal(assertPortable({ root: 5, tonic: 'F' }).get('spell'), 'fixed');
  for (const root of [1, 3, 6, 8, 10])
    assert.equal(assertPortable({ root, scale: 'locrian' }).get('spell'), 'auto');
});

test('custom pitches, scale degrees, and nondefault display options round-trip', () => {
  const input = {
    instrument: 'bass',
    strings: 5,
    tuning: 'custom',
    customTuning: 'C1 G1 C2 F2 A#2',
    scale: 'custom',
    formula: '1 b3 #4 5 b7',
    root: 9,
    frets: 22,
    labels: 'degrees',
    allNotes: true,
    lang: 'de',
  };
  const params = assertPortable(input);
  assert.equal(params.get('pitches'), input.customTuning);
  assert.equal(params.get('formula'), input.formula);
  assert.equal(params.get('notes'), 'all');
  assert.equal(params.get('labels'), 'degrees');
  assert.equal(params.get('frets'), '22');
  assert.equal(params.get('lang'), 'de');
  assert.equal(params.has('scale'), false);
  assert.equal(params.has('tuning'), false);
  const highlighted = assertPortable({ scale: 'major', root: 7 }, 'caged-major-2');
  assert.equal(highlighted.get('pattern'), 'caged-major-2');
});

test('legacy practice links retain their setup and locale-only links resume saved practice', () => {
  const legacy = new URLSearchParams({
    root: '6',
    tonic: 'Gb',
    instrument: 'bass',
    strings: '4',
    tuning: 'custom',
    customTuning: 'C1 G1 C2 F2',
    scale: 'custom',
    formula: '1 b3 5',
    range: 'full',
    spelling: 'both',
    neck: 'octave',
    hand: 'right',
    labels: 'notes',
    frets: '20',
    allNotes: 'false',
    lang: 'en',
  });
  const { state, range } = readPracticeLink(legacy, saved);
  assert.equal(state.tonic, 'Gb');
  assert.equal(state.spelling, 'key');
  assert.equal(state.customTuning, 'C1 G1 C2 F2');
  assert.equal(state.formula, '1 b3 5');
  assert.equal(range, 'full');
  assertPortable(state, range);
  for (const query of ['', 'lang=fr-FR']) {
    const resumed = readPracticeLink(new URLSearchParams(query), saved);
    assert.equal(resumed.state.lang, query ? 'fr' : 'pt');
    assert.equal(resumed.state.tuning, 'bass-5-drop-a');
    assert.equal(resumed.state.tonic, 'Gb');
    assert.equal(resumed.range, 'octave-1');
  }
});

test('malformed compact fields fall back without inheriting another device’s selection', () => {
  const params = new URLSearchParams({
    key: 'not-a-note',
    formula: '1 5 3',
    pitches: 'C4',
    instrument: 'bass',
    strings: '8',
    pattern: 'unknown',
    lang: 'invalid',
    frets: '0',
  });
  const { state, range } = readPracticeLink(params, saved);
  assert.equal(state.root, 0);
  assert.equal(state.tuning, 'bass-4-standard');
  assert.equal(state.scale, 'major');
  assert.equal(state.frets, 20);
  assert.equal(state.lang, 'en');
  assert.equal(range, 'full');
  assert.equal(practiceParams(state, range).toString(), 'key=C&instrument=bass');
});
