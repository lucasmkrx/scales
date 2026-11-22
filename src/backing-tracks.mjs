import { rootName, SCALES, selection } from './music.mjs';

export const BACKING_STYLES = ['any', 'blues', 'rock', 'funk', 'jazz', 'metal'];
export const BACKING_TEMPOS = ['any', 'slow', 'medium', 'fast'];

function harmonyFor(scale, style) {
  if (scale.id === 'custom') {
    // A tonic drone leaves an uncommon formula free of an assumed chord quality.
    const match = SCALES.find(
      (candidate) => candidate.intervals.join() === scale.intervals.join(),
    );
    if (!match) return 'tonic drone';
    scale = match;
  }
  switch (scale.id) {
    case 'major':
    case 'major-pentatonic':
      return 'major';
    case 'natural-minor':
    case 'minor-pentatonic':
      return 'minor';
    case 'major-blues':
      return style === 'blues' ? 'major' : 'major blues';
    case 'minor-blues':
      return style === 'blues' ? 'minor' : 'minor blues';
    default:
      return scale.name.en.split(/\s*[(\/]/)[0].trim();
  }
}

export function backingTrackQuery(state, { style = 'any', tempo = 'any' } = {}) {
  const music = selection(state);
  const root = rootName(music).replaceAll('♯', '#').replaceAll('♭', 'b');
  const genre = BACKING_STYLES.includes(style) && style !== 'any' ? style : '';
  const speed = BACKING_TEMPOS.includes(tempo) && tempo !== 'any' ? `${tempo} tempo` : '';
  const accompaniment =
    music.instrument === 'bass'
      ? 'bassless backing track'
      : 'backing track for lead guitar';
  return [root, harmonyFor(music.scaleData, genre), genre, accompaniment, speed]
    .filter(Boolean)
    .join(' ');
}
