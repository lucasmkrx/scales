// SPDX-License-Identifier: MPL-2.0

import { SCALES, noteName, rootName, selection, spellDegree } from './music.mjs';

// Each letter's position on the circle of fifths, measured from C major.
const naturalFifths = { C: 0, D: 2, E: 4, F: -1, G: 1, A: 3, B: 5 };
const parentOffsets = {
  major: 0,
  'harmonic-minor': -3,
  'melodic-minor': -3,
  'harmonic-major': 0,
  'double-harmonic': 0,
};
const collectionOffsets = {
  'major-pentatonic': 0,
  'minor-pentatonic': -3,
  'major-blues': 0,
  'minor-blues': -3,
  'bebop-major': 0,
  'bebop-dominant': -1, // Mixolydian plus the major seventh.
  'bebop-dorian': -2, // Dorian plus the major third.
};

export function staffSpellingState(input) {
  const state = selection(input);
  const forced = state.spelling === 'sharp' || state.spelling === 'flat';
  const tonic =
    state.tonic ?? (forced ? noteName(state.root, state.spelling) : rootName(state));
  return {
    ...state,
    spelling: 'key',
    tonic: tonic.replaceAll('♯', '#').replaceAll('♭', 'b'),
  };
}

function orderedSignature(tonic, offset) {
  const alteration = tonic.slice(1);
  const fifths =
    naturalFifths[tonic[0]] +
    offset +
    alteration.length * (/[b♭]/.test(alteration) ? -7 : 7);
  if (Math.abs(fifths) > 7) return [];
  const order = fifths < 0 ? 'BEADGCF' : 'FCGDAEB';
  return [...order.slice(0, Math.abs(fifths))].map(
    (letter) => letter + (fifths < 0 ? '♭' : '♯'),
  );
}

export function staffKeySignature({ tonic, scaleData }) {
  let scale = scaleData;
  if (scale.family === 'custom') {
    const degrees = scale.formula.join(' ');
    const matches = SCALES.filter((candidate) => candidate.formula.join(' ') === degrees);
    if (matches.length !== 1) return [];
    [scale] = matches;
  }
  if (scale.modeIndex !== undefined) {
    // The parent tonic occurs within the rotated scale. Its written degree
    // preserves the letter and any alteration, including in seventh modes.
    const parentIndex = (7 - scale.modeIndex) % 7;
    const parentTonic = spellDegree(tonic, scale.formula[parentIndex]);
    return orderedSignature(parentTonic, parentOffsets[scale.family]);
  }
  const offset = collectionOffsets[scale.id];
  return offset === undefined ? [] : orderedSignature(tonic, offset);
}
