import { SCALES } from './catalog.mjs';

const COMMON_SCALES = Object.freeze([
  'major',
  'natural-minor',
  'major-pentatonic',
  'minor-pentatonic',
  'major-blues',
  'minor-blues',
  'harmonic-minor',
  'melodic-minor',
]);

export function initialScaleFamily(id) {
  if (id === 'custom') return 'custom';
  if (COMMON_SCALES.includes(id)) return 'common';
  return SCALES.find((scale) => scale.id === id)?.family ?? 'common';
}

export function scalesInFamily(family) {
  if (family === 'common')
    return COMMON_SCALES.map((id) => SCALES.find((scale) => scale.id === id));
  return SCALES.filter((scale) => scale.family === family);
}
