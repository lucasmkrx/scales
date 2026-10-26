import { normalizeState, selection, SCALES, DEFAULT_FRETS } from './music.mjs';
import { guidePlan } from './guide-layout.mjs';

const setupKeys = ['instrument', 'strings', 'tuning', 'customTuning', 'hand', 'frets'];
const preferenceKeys = ['lang', 'spelling', 'labels', 'allNotes'];
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
  const setup = saved.stringSetups?.[`${instrument}:${strings}`] ?? remembered;
  return normalizeState({
    ...pick(saved.preferences, preferenceKeys),
    ...pick(setup, setupKeys),
    instrument,
    ...query,
  });
}
export function rememberWorkspace(saved, state) {
  const s = normalizeState(state),
    setup = pick(s, setupKeys);
  return {
    version: 1,
    instrument: s.instrument,
    preferences: pick(s, preferenceKeys),
    setups: { ...saved.setups, [s.instrument]: setup },
    stringSetups: { ...saved.stringSetups, [`${s.instrument}:${s.strings}`]: setup },
  };
}
export function changeSetup(state, changes, saved = {}) {
  const instrument = changes.instrument ?? state.instrument;
  if (instrument !== state.instrument) {
    const fallback = {
      instrument,
      strings: instrument === 'guitar' ? 6 : 4,
      tuning: '',
      hand: state.hand,
      frets: DEFAULT_FRETS[instrument],
    };
    return normalizeState({
      ...state,
      ...fallback,
      ...pick(saved.setups?.[instrument], setupKeys),
      ...changes,
    });
  }
  if (changes.strings !== undefined && Number(changes.strings) !== state.strings) {
    const recalled = saved.stringSetups?.[`${instrument}:${changes.strings}`];
    return normalizeState({
      ...state,
      tuning: '',
      ...pick(recalled, ['tuning', 'customTuning']),
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
