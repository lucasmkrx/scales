import assert from 'node:assert/strict';
import test from 'node:test';
import { boardModel, rootName, SCALES, spelledMidiName } from '../src/music.mjs';
import { staffLayout } from '../src/staff.mjs';
import { staffKeySignature, staffSpellingState } from '../src/staff-key.mjs';

const signature = (input) => staffKeySignature(staffSpellingState(input));

test('notation honors the chosen tonic and spells every degree from its letter', () => {
  const explicit = staffSpellingState({ root: 1, tonic: 'C#', spelling: 'flat' });
  assert.equal(explicit.spelling, 'key');
  assert.equal(rootName(explicit), 'C♯');
  assert.equal(spelledMidiName(60, explicit), 'B♯3');
  assert.deepEqual(staffKeySignature(explicit), [
    'F♯',
    'C♯',
    'G♯',
    'D♯',
    'A♯',
    'E♯',
    'B♯',
  ]);

  const flat = staffSpellingState({ root: 6, spelling: 'flat' });
  assert.equal(rootName(flat), 'G♭');
  assert.equal(spelledMidiName(59, flat), 'C♭4');
  assert.deepEqual(staffKeySignature(flat), ['B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭']);
  assert.equal(rootName(staffSpellingState({ root: 6, spelling: 'sharp' })), 'F♯');
  assert.deepEqual(signature({ root: 11, tonic: 'Cb' }), [
    'B♭',
    'E♭',
    'A♭',
    'D♭',
    'G♭',
    'C♭',
    'F♭',
  ]);
  assert.deepEqual(signature({ root: 8, tonic: 'G#' }), []);
});

test('each diatonic mode uses the written signature of its parent major scale', () => {
  for (const [scale, root] of [
    ['major', 7],
    ['dorian', 9],
    ['phrygian', 11],
    ['lydian', 0],
    ['mixolydian', 2],
    ['natural-minor', 4],
    ['locrian', 6],
  ]) {
    assert.deepEqual(signature({ root, scale, spelling: 'sharp' }), ['F♯'], scale);
  }
});

test('harmonic and melodic variants preserve the signature of the unaltered parent', () => {
  for (const [scale, root, tonic, expected] of [
    ['harmonic-minor', 7, 'G', ['B♭', 'E♭']],
    ['melodic-minor', 7, 'G', ['B♭', 'E♭']],
    ['ultralocrian', 1, 'C#', ['B♭']], // raised seventh of D harmonic minor
    ['altered', 6, 'F#', ['B♭', 'E♭']], // raised seventh of G melodic minor
    ['harmonic-major-mode-6', 10, 'Bb', ['F♯', 'C♯']], // lowered sixth of D major
    ['double-harmonic-mode-2', 6, 'Gb', ['B♭']], // lowered second of F major
  ]) {
    assert.deepEqual(signature({ root, tonic, scale }), expected, scale);
  }
});

test('named scale subsets and passing-note scales inherit their parent signature', () => {
  for (const [scale, expected] of [
    ['major-pentatonic', ['F♯', 'C♯']],
    ['major-blues', ['F♯', 'C♯']],
    ['minor-pentatonic', ['B♭']],
    ['minor-blues', ['B♭']],
    ['bebop-major', ['F♯', 'C♯']],
    ['bebop-dominant', ['F♯']],
    ['bebop-dorian', []],
  ]) {
    assert.deepEqual(signature({ root: 2, scale }), expected, scale);
  }
});

test('custom formulas reuse exact degree spellings and ambiguous collections stay open', () => {
  assert.deepEqual(signature({ root: 2, scale: 'custom', formula: '1 2 3 4 5 6 7' }), [
    'F♯',
    'C♯',
  ]);
  // The same pitches, with degree five spelled as a doubly augmented fourth.
  assert.deepEqual(
    signature({ root: 2, scale: 'custom', formula: '1 2 3 4 ##4 6 7' }),
    [],
  );
  for (const scale of [
    'whole-tone',
    'chromatic',
    'egyptian',
    'major-triad',
    'dominant-7',
  ])
    assert.deepEqual(signature({ root: 2, scale }), [], scale);
});

test('reading the signature and printed accidentals recovers every fretboard pitch in all catalog scales and roots', () => {
  const naturals = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const offsets = { '♭': -1, '♯': 1, '♮': 0, '𝄪': 2 };
  for (const scale of SCALES) {
    for (let root = 0; root < 12; root++) {
      const model = boardModel({ scale: scale.id, root, allNotes: true }, { hi: 12 });
      const { notes, signature } = staffLayout(model);
      const expected = [...new Set(model.points.map(({ midi }) => midi))].sort(
        (a, b) => a - b,
      );
      assert.deepEqual(
        notes.map(({ midi }) => midi),
        expected,
      );
      const byLetter = new Map(
        signature.map(([letter, sign]) => [letter, offsets[sign]]),
      );
      const byPosition = new Map();
      for (const { name, glyphs, midi } of notes) {
        // Read the letter and octave only. The visible symbols must supply
        // the entire alteration, independently of the note name's spelling.
        const [, letter, octave] = /^([A-G])[♯♭]*(-?\d+)$/.exec(name);
        const position = letter + octave;
        if (glyphs.length) {
          byPosition.set(
            position,
            glyphs.reduce((sum, sign) => sum + offsets[sign], 0),
          );
        }
        const alteration = byPosition.get(position) ?? byLetter.get(letter) ?? 0;
        const writtenPitch = 12 * (Number(octave) + 1) + naturals[letter] + alteration;
        assert.equal(writtenPitch - 12, midi, `${scale.id} at root ${root}: ${name}`);
      }
    }
  }
});

test('an inline natural cancels the signature only at its written octave', () => {
  const board = boardModel({ root: 7, allNotes: true }, { hi: 24 });
  const phrase = [53, 54, 65, 78]; // F3, F♯3, F4, F♯5
  const { signature, notes } = staffLayout({
    ...board,
    points: board.points.filter(({ midi }) => phrase.includes(midi)),
  });
  assert.deepEqual(signature, ['F♯']);
  assert.deepEqual(
    notes.map(({ glyphs }) => glyphs),
    [['♮'], ['♯'], ['♮'], []],
  );
});
