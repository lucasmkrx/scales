import { SCALES, TUNINGS, mod } from './catalog.mjs';
import { normalizeLanguage } from './locales.mjs';
export { SCALES, TUNINGS, mod };
export const PALETTE = {
  0: '#cf3039',
  2: '#ed7d1a',
  4: '#f7d038',
  5: '#16834b',
  7: '#1b6fc2',
  9: '#5852bc',
  11: '#963dbc',
};
export const SHARPS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const FLATS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const LETTERS = 'CDEFGAB';
const NATURALS = [0, 2, 4, 5, 7, 9, 11];
function spellingParts(value) {
  const match = /^([A-G])((?:#{1,2}|b{1,2})?)$/.exec(
    String(value).trim().replaceAll('♯', '#').replaceAll('♭', 'b'),
  );
  if (!match) return null;
  return {
    letter: LETTERS.indexOf(match[1]),
    accidental: match[2].length * (match[2].startsWith('b') ? -1 : 1),
    tonic: match[1] + match[2],
  };
}
// A degree fixes its letter as well as its pitch. For example, the seventh of
// F# is E#, and the diminished seventh of C is Bbb rather than A.
export function spellDegree(tonic, degree) {
  const root = spellingParts(tonic);
  const match = /^([b#]{0,2})([1-7])$/.exec(
    String(degree).replaceAll('♯', '#').replaceAll('♭', 'b'),
  );
  if (!root || !match) throw new RangeError('Invalid tonic or scale degree');
  const index = Number(match[2]) - 1;
  const alteration = [...match[1]].reduce((n, sign) => n + (sign === '#' ? 1 : -1), 0);
  const letter = (root.letter + index) % 7;
  const natural = NATURALS[letter] + 12 * Math.floor((root.letter + index) / 7);
  const pitch = NATURALS[root.letter] + root.accidental + NATURALS[index] + alteration;
  const accidental = pitch - natural;
  return `${LETTERS[letter]}${(accidental < 0 ? '♭' : '♯').repeat(Math.abs(accidental))}`;
}
function keySpellings(state) {
  const explicit = spellingParts(state.tonic);
  const candidates =
    explicit && mod(NATURALS[explicit.letter] + explicit.accidental) === state.root
      ? [explicit.tonic]
      : [...new Set([SHARPS[state.root], FLATS[state.root]])];
  // Prefer fewer and simpler accidentals when a shared numeric root does not
  // specify an enharmonic tonic. A tie keeps the sharp spelling; an explicit
  // tonic always wins. This is a display convention, not an inferred key signature.
  return candidates
    .map((tonic) => {
      const names = state.scaleData.formula.map((degree) => spellDegree(tonic, degree));
      const cost = names.reduce((sum, name) => sum + (name.length - 1) ** 2, 0);
      return { tonic: prettyDegree(tonic), names, cost };
    })
    .reduce((best, candidate) => (candidate.cost < best.cost ? candidate : best));
}
export const DEFAULT_FRETS = { guitar: 21, bass: 20 };
export const DEFAULTS = {
  instrument: 'guitar',
  strings: 6,
  tuning: 'guitar-standard',
  hand: 'right',
  lang: 'en',
  root: 0,
  spelling: 'both',
  scale: 'major',
  frets: DEFAULT_FRETS.guitar,
  labels: 'notes',
  allNotes: false,
};
export const prettyDegree = (s) => s.replaceAll('b', '♭').replaceAll('#', '♯');
export function noteName(pc, preference = 'sharp') {
  const index = mod(pc);
  return preference === 'both' && SHARPS[index] !== FLATS[index]
    ? `${SHARPS[index]}/${FLATS[index]}`
    : (preference === 'flat' ? FLATS : SHARPS)[index];
}
export const midiName = (midi, prefer = 'sharp') =>
  noteName(midi, prefer)
    .split('/')
    .map((name) => `${name}${Math.floor(midi / 12) - 1}`)
    .join('/');
export function parseNote(value) {
  const m = /^([A-Ga-g])([#♯b♭]{0,2})(-?\d)$/.exec(value.trim());
  if (!m) throw new Error(`Invalid note: ${value}`);
  const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1].toUpperCase()];
  const offset = [...m[2]].reduce((v, s) => v + (s === '#' || s === '♯' ? 1 : -1), 0);
  const midi = (Number(m[3]) + 1) * 12 + natural + offset;
  if (midi < 0 || midi > 127) throw new Error('Pitch out of range');
  return midi;
}
export function parseTuning(text, strings) {
  const notes = text
    .trim()
    .split(/[\s,;]+/)
    .map(parseNote);
  if (notes.length !== strings) throw new Error(`Expected ${strings} notes`);
  if (notes.some((m, i) => i && m <= notes[i - 1]))
    throw new Error('Enter notes from lowest to highest pitch');
  return notes;
}
export function parseFormula(value) {
  const formula = value
    .trim()
    .replaceAll('♭', 'b')
    .replaceAll('♯', '#')
    .split(/[\s,;]+/);
  const intervals = formula.map((d) => {
    const m = /^([b#]{0,2})([1-7])$/.exec(d);
    if (!m) throw new Error('Use degrees such as 1 2 b3 4 5 b6 b7');
    return mod(
      [0, 2, 4, 5, 7, 9, 11][Number(m[2]) - 1] +
        [...m[1]].reduce((n, a) => n + (a === '#' ? 1 : -1), 0),
    );
  });
  if (
    formula[0] !== '1' ||
    new Set(intervals).size !== intervals.length ||
    intervals.some((n, i) => i && n <= intervals[i - 1])
  )
    throw new Error('Start with 1 and list distinct degrees in ascending pitch order');
  return {
    id: 'custom',
    name: { en: 'Custom scale', pt: 'Escala personalizada', es: 'Escala personalizada' },
    family: 'custom',
    intervals,
    formula,
  };
}
export function normalizeState(input = {}) {
  const s = { ...DEFAULTS, ...input };
  s.instrument = s.instrument === 'bass' ? 'bass' : 'guitar';
  const counts = s.instrument === 'guitar' ? [6, 7] : [4, 5, 6];
  s.strings = counts.includes(Number(input.strings)) ? Number(input.strings) : counts[0];
  s.lang = normalizeLanguage(s.lang);
  s.hand = s.hand === 'left' ? 'left' : 'right';
  s.labels = s.labels === 'degrees' ? 'degrees' : 'notes';
  s.spelling = ['both', 'sharp', 'flat', 'key'].includes(s.spelling)
    ? s.spelling
    : 'both';
  s.root = Number(s.root);
  if (!Number.isInteger(s.root) || s.root < 0 || s.root > 11) s.root = 0;
  const tonic = spellingParts(s.tonic);
  if (tonic && mod(NATURALS[tonic.letter] + tonic.accidental) === s.root)
    s.tonic = tonic.tonic;
  else delete s.tonic;
  s.frets = [20, 21, 22, 24].includes(Number(input.frets))
    ? Number(input.frets)
    : DEFAULT_FRETS[s.instrument];
  s.allNotes = s.allNotes === true || s.allNotes === 'true';
  if (s.tuning === 'custom') {
    try {
      s.customNotes = parseTuning(s.customTuning ?? '', s.strings);
    } catch {
      s.tuning = '';
      delete s.customNotes;
    }
  }
  if (
    s.tuning !== 'custom' &&
    !TUNINGS.some(
      (t) =>
        t.id === s.tuning && t.instrument === s.instrument && t.strings === s.strings,
    )
  )
    s.tuning = TUNINGS.find(
      (t) => t.instrument === s.instrument && t.strings === s.strings,
    ).id;
  if (s.scale === 'custom') {
    try {
      parseFormula(s.formula ?? '');
    } catch {
      s.scale = 'major';
    }
  }
  if (s.scale !== 'custom' && !SCALES.some((t) => t.id === s.scale)) s.scale = 'major';
  return s;
}
export function selection(input) {
  const s = normalizeState(input);
  const tuning =
    s.tuning === 'custom'
      ? {
          id: 'custom',
          name: { en: 'Custom', pt: 'Personalizada', es: 'Personalizada' }[s.lang],
          notes: s.customNotes,
          instrument: s.instrument,
          strings: s.strings,
          preferred: 'sharp',
        }
      : TUNINGS.find((t) => t.id === s.tuning);
  const scale =
    s.scale === 'custom' ? parseFormula(s.formula) : SCALES.find((t) => t.id === s.scale);
  return { ...s, tuningData: tuning, scaleData: scale };
}
export function rootName(state) {
  if (state.spelling === 'key')
    return keySpellings(state.scaleData ? state : selection(state)).tonic;
  return noteName(state.root, pitchPreference(state));
}
export function pitchPreference(input) {
  if (input.spelling === 'key') {
    const { names } = keySpellings(input.scaleData ? input : selection(input));
    const count = (sign) =>
      names.reduce((sum, name) => sum + name.split(sign).length - 1, 0);
    return count('♭') > count('♯') ? 'flat' : 'sharp';
  }
  return ['sharp', 'flat'].includes(input.spelling) ? input.spelling : 'both';
}
export function spellScale(input) {
  const state = input.scaleData ? input : selection(input);
  if (state.spelling === 'key') return keySpellings(state).names;
  return state.scaleData.intervals.map((interval) =>
    noteName(state.root + interval, pitchPreference(state)),
  );
}
export function spelledMidiName(midi, input) {
  if (input.spelling !== 'key') return midiName(midi, pitchPreference(input));
  const state = input.scaleData ? input : selection(input);
  const index = state.scaleData.intervals.indexOf(mod(midi - state.root));
  if (index < 0) return midiName(midi, pitchPreference(state));
  const name = keySpellings(state).names[index];
  const letter = LETTERS.indexOf(name[0]);
  const accidental = [...name.slice(1)].reduce(
    (n, sign) => n + (sign === '♭' ? -1 : 1),
    0,
  );
  // Notated octaves follow the letter C boundary, not the enharmonic piano key:
  // sounding C4 can be B#3, and sounding B3 can be Cb4.
  const octave = (midi - NATURALS[letter] - accidental) / 12 - 1;
  return `${name}${octave}`;
}
const printFretColors = {
  open: '#eff3f5',
  octave: '#dde6ed',
  marker: '#e8eef3',
  upper: '#f0f4f7',
  lower: '#fafbfc',
};
export function fretFill(fret, colors = printFretColors) {
  if (fret === 0) return colors.open;
  if (fret % 12 === 0) return colors.octave;
  if ([3, 5, 7, 9].includes(fret % 12)) return colors.marker;
  return fret >= 12 ? colors.upper : colors.lower;
}
export function boardModel(input, { lo = 0, hi, all = false } = {}) {
  const s = selection(input);
  hi = hi ?? s.frets;
  const rows = [...s.tuningData.notes].reverse();
  const spellings = spellScale(s);
  const points = [];
  rows.forEach((open, row) => {
    for (let fret = lo; fret <= hi; fret++) {
      const midi = open + fret;
      const pc = mod(midi);
      const index = s.scaleData.intervals.indexOf(mod(pc - s.root));
      if (index < 0 && !all && !s.allNotes) continue;
      points.push({
        row,
        string: row + 1,
        fret,
        midi,
        pc,
        root: pc === s.root,
        inScale: index >= 0,
        name: index >= 0 ? spellings[index] : noteName(pc, pitchPreference(s)),
        degree: index >= 0 ? prettyDegree(s.scaleData.formula[index]) : '',
        fill: PALETTE[pc] ?? '#ffffff',
        lightText: [0, 5, 7, 9, 11].includes(pc),
        active: index >= 0,
      });
    }
  });
  return { state: s, rows, lo, hi, points };
}
export function layoutBoard(model, { width = 1100, height = 270, small = false } = {}) {
  const { lo, hi, rows, state } = model;
  const margin = small ? 22 : 40;
  const labelMargin = small ? 26 : 48;
  const left = state.hand === 'left' ? margin : labelMargin;
  const right = state.hand === 'left' ? width - labelMargin : width - margin;
  const top = small ? 25 : 35;
  const bottom = height - (small ? 25 : 42);
  const start = left + (lo === 0 ? 28 : 0);
  const count = hi - Math.max(1, lo) + 1;
  // Real equal-tempered fret spacing; mirror geometry, never the text or row order.
  const ratios = Array.from(
    { length: Math.max(0, count) + 1 },
    (_, i) => 1 - 2 ** (-i / 12),
  );
  const denominator = ratios.at(-1) || 1;
  const rawBound = (i) => start + ((right - start) * ratios[i]) / denominator;
  const mirror = (x) => (state.hand === 'left' ? left + right - x : x);
  const center = (f) =>
    mirror(
      f === 0
        ? left + 12
        : (rawBound(f - Math.max(1, lo)) + rawBound(f - Math.max(1, lo) + 1)) / 2,
    );
  const y = (row) =>
    top + (bottom - top) * (rows.length === 1 ? 0.5 : row / (rows.length - 1));
  const edges = (f) => {
    const a = f === 0 ? left : rawBound(f - Math.max(1, lo));
    const z = f === 0 ? start : rawBound(f - Math.max(1, lo) + 1);
    return [Math.min(mirror(a), mirror(z)), Math.max(mirror(a), mirror(z))];
  };
  return {
    width,
    height,
    left,
    right,
    top,
    bottom,
    center,
    y,
    edges,
    nut: lo === 0 ? mirror(start) : null,
    labelX: state.hand === 'left' ? right + 20 : left - 20,
  };
}
export function scaleMidiSequence(input) {
  const s = selection(input);
  const lowest = s.tuningData.notes[0];
  const root = lowest + mod(s.root - lowest);
  const up = s.scaleData.intervals.map((i) => root + i).concat(root + 12);
  return up.concat(up.slice(0, -1).reverse());
}
export function sharedState(s) {
  const clean = normalizeState(s);
  const params = new URLSearchParams();
  for (const k of Object.keys(DEFAULTS)) params.set(k, String(clean[k]));
  if (clean.tonic) params.set('tonic', clean.tonic);
  if (clean.tuning === 'custom') params.set('customTuning', clean.customTuning);
  if (clean.scale === 'custom') params.set('formula', clean.formula);
  return params.toString();
}
