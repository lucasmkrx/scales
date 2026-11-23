import { backingCatalog, rootDrones } from './backing-track-catalog.mjs';
import { SCALES, rootName, selection } from './music.mjs';
import { scaleName } from './workspace.mjs';

// Conventional tonic-chord practice settings. A single chord gives the player
// room to supply the characteristic scale tones, even when there is no modal arrangement.
const practiceChords = [
  [
    'dominant-7',
    '7',
    [
      'bebop-dominant',
      'lydian-dominant',
      'mixolydian-flat-6',
      'phrygian-dominant',
      'diminished-hw',
    ],
  ],
  [
    'major-7',
    'maj7',
    ['bebop-major', 'harmonic-major', 'double-harmonic', 'lydian-sharp-2'],
  ],
  ['minor-7', 'm7', ['bebop-dorian', 'dorian-flat-2', 'dorian-sharp-4']],
  [
    'augmented-triad',
    'aug',
    ['whole-tone', 'augmented', 'ionian-augmented', 'lydian-augmented'],
  ],
  ['diminished-7', 'dim7', ['diminished-wh', 'ultralocrian']],
  ['diminished-triad', 'dim', ['locrian-natural-2', 'locrian-natural-6']],
  ['sus4', 'sus4', ['egyptian', 'in-sen', 'ritusen']],
];

function namedScale(scaleData) {
  return scaleData.id === 'custom'
    ? SCALES.find(
        (candidate) => candidate.intervals.join() === scaleData.intervals.join(),
      )
    : scaleData;
}

export function backingSearchUrl(input) {
  const state = input.scaleData ? input : selection(input);
  const { scaleData, instrument } = state;
  const scale = namedScale(scaleData);
  const name = scale ? scaleName(scale, 'en') : scaleData.formula.join(' ');
  const root = rootName(state).replaceAll('♯', '#').replaceAll('♭', 'b');
  const mix = instrument === 'bass' ? 'bassless backing track' : 'guitar backing track';
  const url = new URL('https://www.youtube.com/results');
  url.searchParams.set('search_query', `${root} ${name} ${mix}`);
  return url.href;
}

export function backingTrackChoices(state) {
  const { root, instrument, scaleData } = selection(state);
  const scale = namedScale(scaleData);
  const matches = backingCatalog.filter(
    (track) =>
      track.root === root &&
      (track.instrument === instrument || track.instrument === 'both') &&
      track.scales.includes(scale?.id),
  );
  if (matches.length) {
    return matches.map((track) =>
      track.instrument === 'both' ? { ...track, instrument } : track,
    );
  }
  const drone = {
    videoId: rootDrones[root],
    root,
    title: 'Tonic drone',
    creator: 'BoneZone Studio',
    style: 'drone',
  };
  const chord = practiceChords.find(([, , scales]) => scales.includes(scale?.id));
  if (chord) {
    const [arpeggio, symbol] = chord;
    const piano = backingCatalog.find(
      (track) =>
        track.tonicVamp && track.root === root && track.scales.includes(arpeggio),
    );
    if (piano) return [{ ...piano, instrument, chordSymbol: symbol }, drone];
  }
  return [drone];
}
