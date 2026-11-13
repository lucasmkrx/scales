import { boardModel, mod, prettyDegree, spellScale } from './music.mjs';
import { normalizeLanguage } from './locales.mjs';

function positionNotes(input, bounds) {
  const model = boardModel({ ...input, allNotes: false }, bounds);
  const notes = [...new Set(model.points.map((point) => point.midi))].sort(
    (a, b) => a - b,
  );
  return { state: model.state, notes };
}

// Prefer one complete octave. A partial route still uses only visible scale notes.
export function positionSequence(input, bounds = {}) {
  const { state, notes } = positionNotes(input, bounds);
  const available = new Set(notes);
  for (const root of notes.filter((note) => mod(note) === state.root)) {
    const up = state.scaleData.intervals.map((interval) => root + interval);
    up.push(root + 12);
    if (up.every((note) => available.has(note)))
      return { notes: up.concat(up.slice(0, -1).reverse()), complete: true };
  }
  const up = notes.filter((note) => note <= notes[0] + 12);
  return { notes: up.concat(up.slice(0, -1).reverse()), complete: false };
}

export function practiceExercise(input, bounds = {}) {
  const { state, notes } = positionNotes(input, bounds);
  const visible = new Set(notes.map((note) => mod(note - state.root)));
  const { intervals, formula } = state.scaleData;
  const available = intervals.filter((interval) => visible.has(interval));
  if (!available.length) return [];
  const third = formula.findIndex((degree) => degree === '3' || degree === 'b3');
  const fifth = formula.findIndex((degree) => ['5', 'b5', '#5'].includes(degree));
  const triad = [0, intervals[third], intervals[fifth]];
  const phrase = triad.every((interval) => visible.has(interval))
    ? triad
    : available.slice(0, 3);
  const names = spellScale(state);
  const exercise = phrase.map((interval) => names[intervals.indexOf(interval)]);
  return exercise.length > 1 ? exercise.concat(exercise[0]) : exercise;
}

// Name the written interval, so ♭♭7 stays a diminished seventh rather than a sixth.
const intervalNames = {
  1: { en: 'unison', pt: 'uníssono', es: 'unísono' },
  b2: { en: 'minor second', pt: 'segunda menor', es: 'segunda menor' },
  2: { en: 'major second', pt: 'segunda maior', es: 'segunda mayor' },
  '#2': { en: 'augmented second', pt: 'segunda aumentada', es: 'segunda aumentada' },
  bb3: { en: 'diminished third', pt: 'terça diminuta', es: 'tercera disminuida' },
  b3: { en: 'minor third', pt: 'terça menor', es: 'tercera menor' },
  3: { en: 'major third', pt: 'terça maior', es: 'tercera mayor' },
  b4: { en: 'diminished fourth', pt: 'quarta diminuta', es: 'cuarta disminuida' },
  4: { en: 'perfect fourth', pt: 'quarta justa', es: 'cuarta justa' },
  '#4': { en: 'augmented fourth', pt: 'quarta aumentada', es: 'cuarta aumentada' },
  b5: { en: 'diminished fifth', pt: 'quinta diminuta', es: 'quinta disminuida' },
  5: { en: 'perfect fifth', pt: 'quinta justa', es: 'quinta justa' },
  '#5': { en: 'augmented fifth', pt: 'quinta aumentada', es: 'quinta aumentada' },
  b6: { en: 'minor sixth', pt: 'sexta menor', es: 'sexta menor' },
  6: { en: 'major sixth', pt: 'sexta maior', es: 'sexta mayor' },
  '#6': { en: 'augmented sixth', pt: 'sexta aumentada', es: 'sexta aumentada' },
  bb7: { en: 'diminished seventh', pt: 'sétima diminuta', es: 'séptima disminuida' },
  b7: { en: 'minor seventh', pt: 'sétima menor', es: 'séptima menor' },
  7: { en: 'major seventh', pt: 'sétima maior', es: 'séptima mayor' },
};
export function intervalName(degree, lang = 'en') {
  const language = normalizeLanguage(lang);
  const normalized = String(degree).replaceAll('♭', 'b').replaceAll('♯', '#');
  return (
    intervalNames[normalized]?.[language] ??
    `${{ en: 'degree', pt: 'grau', es: 'grado' }[language]} ${prettyDegree(normalized)}`
  );
}
