import {
  DEFAULTS,
  normalizeState,
  parseTonic,
  rootName,
  STRING_COUNTS,
} from './music.mjs';
import { restoreRange, restoreWorkspace } from './workspace.mjs';

const legacySettings = [
  'root',
  'scale',
  'tonic',
  'formula',
  'instrument',
  'strings',
  'tuning',
  'customTuning',
  'frets',
  'hand',
  'range',
  'labels',
  'allNotes',
];
const legacyFields = [...legacySettings, 'lang'];
const linkFields = new Set([
  ...legacyFields,
  'key',
  'spell',
  'pitches',
  'pattern',
  'notes',
  'spelling',
  'neck',
]);

function tuningPrefix({ instrument, strings }) {
  return instrument === 'guitar' && strings === 6
    ? 'guitar-'
    : `${instrument}-${strings}-`;
}

function asciiNotes(text) {
  return text
    .trim()
    .replaceAll('♯', '#')
    .replaceAll('♭', 'b')
    .replace(/[\s,;]+/g, ' ');
}

// A named key identifies a portable session. Missing settings use instrument defaults.
export function practiceParams(input, range = 'full') {
  const state = normalizeState(input);
  const standard = normalizeState({
    instrument: state.instrument,
    strings: state.strings,
  });
  const key = state.tonic ?? asciiNotes(rootName(state));
  const params = new URLSearchParams({ key });
  if (key.length > 1 && !state.tonic) params.set('spell', 'auto');
  if (key.length === 1 && state.tonic) params.set('spell', 'fixed');
  if (state.scale === 'custom') params.set('formula', asciiNotes(state.formula));
  else if (state.scale !== DEFAULTS.scale) params.set('scale', state.scale);
  if (state.instrument !== DEFAULTS.instrument)
    params.set('instrument', state.instrument);
  if (state.strings !== STRING_COUNTS[state.instrument][0])
    params.set('strings', state.strings);
  if (state.tuning === 'custom') params.set('pitches', asciiNotes(state.customTuning));
  else if (state.tuning !== standard.tuning)
    params.set('tuning', state.tuning.slice(tuningPrefix(state).length));
  if (state.frets !== standard.frets) params.set('frets', state.frets);
  if (state.hand !== DEFAULTS.hand) params.set('hand', state.hand);
  const pattern = restoreRange({ range });
  if (pattern !== 'full') params.set('pattern', pattern);
  if (state.labels !== DEFAULTS.labels) params.set('labels', state.labels);
  if (state.allNotes) params.set('notes', 'all');
  if (state.lang !== DEFAULTS.lang) params.set('lang', state.lang);
  return params;
}

export function readPracticeLink(params, saved = {}) {
  const query = Object.fromEntries(params);
  if (!params.has('key')) {
    const legacy = Object.fromEntries(
      legacyFields.filter((name) => params.has(name)).map((name) => [name, query[name]]),
    );
    return { state: restoreWorkspace(legacy, saved), range: restoreRange(legacy, saved) };
  }
  const key = parseTonic(query.key);
  const standard = normalizeState({
    instrument: query.instrument,
    strings: query.strings,
  });
  const setup = {
    instrument: standard.instrument,
    strings: standard.strings,
    frets: query.frets,
    hand: query.hand,
    labels: query.labels,
    allNotes: query.notes === 'all',
    lang: query.lang,
    root: key?.pitch ?? DEFAULTS.root,
    scale: query.scale,
  };
  if (key && (query.spell === 'fixed' || (key.accidental && query.spell !== 'auto')))
    setup.tonic = key.tonic;
  if (params.has('formula')) {
    setup.scale = 'custom';
    setup.formula = query.formula;
  }
  if (params.has('pitches')) {
    setup.tuning = 'custom';
    setup.customTuning = query.pitches;
  } else if (query.tuning) {
    setup.tuning = tuningPrefix(standard) + query.tuning;
  }
  return { state: normalizeState(setup), range: restoreRange({ range: query.pattern }) };
}

export function entryPracticeParams(params, state, range) {
  if (params.has('key') || legacySettings.some((name) => params.has(name))) {
    const current = practiceParams(state, range);
    for (const [name, value] of params) {
      if (!linkFields.has(name)) current.append(name, value);
    }
    return current;
  }
  // Bare and language-only visits continue to resume practice from this device.
  const current = new URLSearchParams(params);
  current.delete('neck');
  current.delete('spelling');
  return current;
}
