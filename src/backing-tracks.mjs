import { rootName, SCALES, selection } from './music.mjs';

export const BACKING_STYLES = ['any', 'blues', 'rock', 'funk', 'jazz', 'metal'];
const tempoTerms = new Map([
  ['slow', 'slow'],
  ['medium', 'mid tempo'],
  ['fast', 'fast'],
]);

function harmonyFor(scale) {
  switch (scale.id) {
    case 'major':
    case 'major-pentatonic':
    case 'major-blues':
      return 'major';
    case 'natural-minor':
    case 'minor-pentatonic':
    case 'minor-blues':
      return 'minor';
    case 'diminished-hw':
      return 'half whole diminished';
    case 'diminished-wh':
      return 'whole half diminished';
    case 'egyptian':
      return 'Egyptian pentatonic';
    case 'altered':
      return 'altered scale';
    default:
      return scale.name.en
        .split(/\s*[(\/]/)[0]
        .trim()
        .replace(' · ', ' ')
        .replace(/sharp (?=\d)/, '#')
        .replace(/flat (?=\d)/, 'b');
  }
}

export function backingTrackQuery(state, { style = 'any', tempo = 'any' } = {}) {
  const music = selection(state);
  const root = rootName(music).replaceAll('♯', '#').replaceAll('♭', 'b');
  const scale =
    music.scaleData.id === 'custom'
      ? SCALES.find(
          (candidate) => candidate.intervals.join() === music.scaleData.intervals.join(),
        )
      : music.scaleData;
  // A drone leaves an unfamiliar formula free of an assumed chord quality or tempo.
  if (!scale) return `${root} drone for improvisation`;

  const genre = BACKING_STYLES.includes(style) && style !== 'any' ? style : '';
  const blues = scale.family === 'blues' && genre !== 'blues' ? 'blues' : '';
  const bass = music.instrument === 'bass';
  return [
    tempoTerms.get(tempo),
    blues,
    genre,
    bass ? 'backing track in' : 'guitar backing track in',
    root,
    harmonyFor(scale),
    bass ? 'no bass' : '',
  ]
    .filter(Boolean)
    .join(' ');
}
