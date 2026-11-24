// SPDX-License-Identifier: MPL-2.0

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCALES,
  boardModel,
  layoutBoard,
  midiName,
  normalizeState,
  pitchPreference,
  rootName,
  sharedState,
  spellDegree,
  spelledMidiName,
  spellScale,
} from '../src/music.mjs';

const naturalPitch = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pitchOf = (name) => {
  const [letter, ...signs] = name.replaceAll('#', '♯').replaceAll('b', '♭');
  return (
    naturalPitch[letter] + signs.reduce((sum, sign) => sum + (sign === '♯' ? 1 : -1), 0)
  );
};
const soundingMidi = (name) => {
  const match = /^([A-G][♯♭]*)(-?\d+)$/.exec(name);
  assert.ok(match, `a spelled pitch and notated octave: ${name}`);
  return pitchOf(match[1]) + 12 * (Number(match[2]) + 1);
};
const mod = (n) => ((n % 12) + 12) % 12;

test('key spelling retains scale-degree letters in sharp and flat keys', () => {
  const fixtures = [
    [{ root: 5, scale: 'major' }, ['F', 'G', 'A', 'B♭', 'C', 'D', 'E']],
    [{ root: 6, tonic: 'F#', scale: 'major' }, ['F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯']],
    [{ root: 6, tonic: 'Gb', scale: 'major' }, ['G♭', 'A♭', 'B♭', 'C♭', 'D♭', 'E♭', 'F']],
    [
      { root: 1, tonic: 'C#', scale: 'major' },
      ['C♯', 'D♯', 'E♯', 'F♯', 'G♯', 'A♯', 'B♯'],
    ],
    [{ root: 0, scale: 'harmonic-minor' }, ['C', 'D', 'E♭', 'F', 'G', 'A♭', 'B']],
    [{ root: 0, scale: 'melodic-minor' }, ['C', 'D', 'E♭', 'F', 'G', 'A', 'B']],
  ];
  for (const [state, expected] of fixtures)
    assert.deepEqual(spellScale({ ...state, spelling: 'key' }), expected);
});

test('degree formulas distinguish repeated letters and double accidentals', () => {
  assert.equal(spellDegree('F#', '7'), 'E♯');
  assert.equal(spellDegree('Gb', '4'), 'C♭');
  assert.equal(spellDegree('G#', '7'), 'F♯♯');
  assert.equal(spellDegree('C', 'bb7'), 'B♭♭');
  assert.equal(spellDegree('C♯', '♭3'), 'E');
  for (const [scale, expected] of [
    ['major-blues', ['C', 'D', 'E♭', 'E', 'G', 'A']],
    ['minor-blues', ['C', 'E♭', 'F', 'G♭', 'G', 'B♭']],
    ['diminished-7', ['C', 'E♭', 'G♭', 'B♭♭']],
    ['whole-tone', ['C', 'D', 'E', 'F♯', 'G♯', 'B♭']],
  ])
    assert.deepEqual(spellScale({ scale, root: 0, spelling: 'key' }), expected);
  assert.throws(() => spellDegree('H', '3'), RangeError);
  assert.throws(() => spellDegree('C', '9'), RangeError);
});

test('automatic tonic spelling chooses simpler accidentals, while explicit enharmonic choices win', () => {
  assert.equal(rootName({ root: 1, scale: 'major', spelling: 'key' }), 'D♭');
  assert.equal(rootName({ root: 6, scale: 'major', spelling: 'key' }), 'F♯');
  assert.equal(rootName({ root: 8, scale: 'natural-minor', spelling: 'key' }), 'G♯');
  assert.equal(rootName({ root: 1, tonic: 'C#', scale: 'major', spelling: 'key' }), 'C♯');
  assert.equal(rootName({ root: 6, tonic: 'Gb', scale: 'major', spelling: 'key' }), 'G♭');
  assert.equal(pitchPreference({ root: 5, scale: 'major', spelling: 'key' }), 'flat');
  assert.equal(pitchPreference({ root: 6, scale: 'major', spelling: 'key' }), 'sharp');
  assert.equal(
    pitchPreference({ root: 0, scale: 'natural-minor', spelling: 'key' }),
    'flat',
  );
});

test('key-aware MIDI labels keep the correct notated octave around B-sharp and C-flat', () => {
  const sharp = { root: 1, tonic: 'C#', scale: 'major', spelling: 'key' };
  const flat = { root: 6, tonic: 'Gb', scale: 'major', spelling: 'key' };
  assert.equal(spelledMidiName(60, sharp), 'B♯3');
  assert.equal(spelledMidiName(59, flat), 'C♭4');
  assert.equal(spelledMidiName(59, { root: 6, tonic: 'Gb' }), 'C♭4');
  assert.equal(
    spelledMidiName(69, { root: 0, scale: 'diminished-7', spelling: 'key' }),
    'B♭♭4',
  );
  for (const state of [
    sharp,
    flat,
    { root: 5, tonic: 'E#', scale: 'major', spelling: 'key' },
    { root: 11, tonic: 'Cb', scale: 'ultralocrian', spelling: 'key' },
  ])
    for (let midi = 0; midi < 128; midi++)
      assert.equal(soundingMidi(spelledMidiName(midi, state)), midi);
  assert.equal(spelledMidiName(60, { spelling: 'both' }), midiName(60, 'both'));
  assert.equal(spelledMidiName(61, { spelling: 'flat' }), 'D♭4');
});

test('every named scale and enharmonic tonic preserves actual pitches and declared degree letters', () => {
  const tonics = [
    'C',
    'C#',
    'Db',
    'D',
    'D#',
    'Eb',
    'E',
    'F',
    'F#',
    'Gb',
    'G',
    'G#',
    'Ab',
    'A',
    'A#',
    'Bb',
    'B',
  ];
  const letters = 'CDEFGAB';
  for (const scale of SCALES) {
    for (const tonic of tonics) {
      const root = mod(pitchOf(tonic));
      const names = spellScale({ root, tonic, scale: scale.id, spelling: 'key' });
      assert.equal(names.length, scale.intervals.length);
      names.forEach((name, index) => {
        assert.equal(mod(pitchOf(name)), mod(root + scale.intervals[index]));
        const degree = Number(scale.formula[index].match(/[1-7]$/)[0]);
        assert.equal(name[0], letters[(letters.indexOf(tonic[0]) + degree - 1) % 7]);
      });
    }
    for (let root = 0; root < 12; root++)
      spellScale({ root, scale: scale.id, spelling: 'key' }).forEach((name, index) =>
        assert.equal(mod(pitchOf(name)), mod(root + scale.intervals[index])),
      );
  }
});

test('key spelling changes labels without changing fret geometry or membership', () => {
  const input = { root: 6, scale: 'major', allNotes: true, tonic: 'Gb' };
  const both = boardModel(input);
  const key = boardModel({ ...input, spelling: 'key' });
  assert.equal(key.points.find((point) => point.inScale && point.pc === 11).name, 'C♭');
  assert.deepEqual(
    both.points.map(({ name, ...point }) => point),
    key.points.map(({ name, ...point }) => point),
  );
  const bothLayout = layoutBoard(both);
  const keyLayout = layoutBoard(key);
  assert.equal(bothLayout.center(8), keyLayout.center(8));
});

test('optional tonic names normalize safely and survive shared links', () => {
  const state = normalizeState({ root: 6, tonic: 'G♭', spelling: 'key' });
  assert.equal(state.tonic, 'Gb');
  assert.equal(state.spelling, 'key');
  assert.deepEqual(
    normalizeState(Object.fromEntries(new URLSearchParams(sharedState(state)))),
    state,
  );
  for (const tonic of ['F', 'H', 'Gbbb', 'C#b', '<script>', ''])
    assert.equal(normalizeState({ root: 6, tonic }).tonic, undefined);
  assert.equal(normalizeState({ ...state, root: 7 }).tonic, undefined);
  assert.equal(new URLSearchParams(sharedState(state)).has('spelling'), false);
  assert.equal(new URLSearchParams(sharedState({ root: 6 })).has('tonic'), false);
  for (const spelling of ['both', 'sharp', 'flat'])
    assert.equal(normalizeState({ spelling }).spelling, spelling);
});
