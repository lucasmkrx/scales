import { DEFAULTS, normalizeState, selection, SCALES } from './music.mjs';
import { guidePlan } from './guide-layout.mjs';

const tuningKeys = ['tuning', 'customTuning'];
const setupKeys = ['instrument', 'strings', 'frets', ...tuningKeys];
const preferenceKeys = ['hand', 'lang', 'labels', 'allNotes'];
const musicKeys = ['root', 'tonic', 'scale', 'formula'];
const ranges = ['full', 'lower', 'upper'];
const validRange = (id) =>
  ranges.includes(id) ||
  /^(?:caged-major-[1-5]|caged-minor-[1-5]|three-per-string-[1-7]|four-per-string-[1-8]|two-per-string-[1-5]|blues-[1-5]|octave-[0-5])$/.test(
    id,
  );
const hasMusic = (query) => musicKeys.some((key) => query[key] !== undefined);
const pick = (value, keys) =>
  Object.fromEntries(
    keys.filter((key) => value?.[key] !== undefined).map((key) => [key, value[key]]),
  );
export function readPreferences(raw) {
  try {
    const value = JSON.parse(raw);
    return value && value.version === 1 && typeof value.setups === 'object' ? value : {};
  } catch {
    return {};
  }
}
// Normalize at the boundary; explicit URL fields override device preferences.
export function restoreWorkspace(query = {}, saved = {}) {
  const instrument =
    (query.instrument ?? saved.instrument) === 'bass' ? 'bass' : 'guitar';
  const remembered = saved.setups?.[instrument] ?? {};
  const strings = query.strings ?? remembered.strings;
  const tuning = saved.stringSetups?.[`${instrument}:${strings}`] ?? remembered;
  return normalizeState({
    // Older saves kept handedness on each instrument. Carry forward the last one used.
    hand: saved.setups?.[saved.instrument]?.hand ?? remembered.hand,
    ...pick(saved.preferences, preferenceKeys),
    ...pick(remembered, ['frets']),
    ...pick(tuning, tuningKeys),
    ...(!hasMusic(query) ? pick(saved.practice, musicKeys) : {}),
    instrument,
    strings,
    ...query,
    spelling: DEFAULTS.spelling,
  });
}
export function restoreRange(query = {}, saved = {}) {
  const fallback = 'full';
  if (query.range !== undefined) return validRange(query.range) ? query.range : fallback;
  // Earlier shared URLs described the whole neck without a separate range field.
  if (query.frets !== undefined) return 'full';
  if (hasMusic(query)) return fallback;
  return validRange(saved.practice?.range) ? saved.practice.range : fallback;
}
export function restoreNeckView(query = {}, saved = {}) {
  if (query.neck !== undefined) return query.neck === 'full' ? 'full' : 'octave';
  return saved.preferences?.neckView === 'full' ? 'full' : 'octave';
}
export function rememberWorkspace(saved, state) {
  const s = normalizeState(state),
    setup = pick(s, setupKeys);
  return {
    version: 1,
    instrument: s.instrument,
    preferences: {
      ...pick(s, preferenceKeys),
      neckView: state.neckView === 'full' ? 'full' : 'octave',
    },
    practice: {
      ...pick(s, ['root', 'tonic', 'scale']),
      ...(s.scale === 'custom' ? { formula: s.formula } : {}),
      ...(validRange(state.range) ? { range: state.range } : {}),
    },
    setups: { ...saved.setups, [s.instrument]: setup },
    stringSetups: { ...saved.stringSetups, [`${s.instrument}:${s.strings}`]: setup },
  };
}
export function changeSetup(state, changes, saved = {}) {
  const instrument = changes.instrument ?? state.instrument;
  if (instrument !== state.instrument) {
    return restoreWorkspace(
      {
        ...pick(state, preferenceKeys),
        ...pick(state, musicKeys),
        ...changes,
      },
      saved,
    );
  }
  if (changes.strings !== undefined && Number(changes.strings) !== state.strings) {
    const recalled = saved.stringSetups?.[`${instrument}:${changes.strings}`];
    return normalizeState({
      ...state,
      tuning: '',
      ...pick(recalled, tuningKeys),
      ...changes,
    });
  }
  return normalizeState({ ...state, ...changes });
}
// Reuse the PDF contents planner so the estimate includes every navigation page.
export function exportPreview(input, { scope = 'selected', allKeys = false } = {}) {
  const s = selection(input);
  const count =
    scope === 'catalog'
      ? SCALES.length
      : scope === 'family'
        ? SCALES.filter((scale) => scale.family === s.scaleData.family).length
        : allKeys
          ? 12
          : 1;
  if (!count) return { count: 0, pages: 0 };
  const plan = guidePlan(
    Array.from({ length: count }, () => ({ title: '' })),
    { coverTitle: '', readTitle: '', contentsTitle: '' },
  );
  return { count, pages: plan.entries.length };
}
export function scaleName(scale, lang = 'en') {
  return ['major', 'natural-minor'].includes(scale.id)
    ? scale.name[lang].replace(/\s*\([^)]*\)/g, '').trim()
    : scale.name[lang];
}
