import {
  TUNINGS,
  STRING_COUNTS,
  FRET_COUNTS,
  selection,
  rootName,
  spellScale,
  prettyDegree,
  midiName,
  spelledMidiName,
  SHARPS,
  FLATS,
  parseNote,
  parseTuning,
  sharedState,
  boardModel,
  pitchPreference,
} from './music.mjs';
import { PluckedStringPlayer } from './string-audio.mjs';
import { scalesInFamily, initialScaleFamily } from './scale-picker.mjs';
import { chooseNextIndex } from './choice-navigation.mjs';
import {
  readPreferences,
  rememberWorkspace,
  changeSetup,
  exportPreview,
  scaleName,
} from './workspace.mjs';
import { FAMILIES } from './catalog.mjs';
import { copy } from './i18n.mjs';
import { explorerPath, syncExplorerPage } from './site.mjs';
import { LANGUAGES, tuningName as localizedTuningName } from './locales.mjs';
import { boardMarkup, escape, isAccidentalPitch, pitchColor } from './board.mjs';
import {
  practiceStaffPoints,
  staffLayout,
  staffMarkup,
  staffPitchName,
} from './staff.mjs';
import { enableBackingTracks } from './backing-track-finder.mjs';
import { enableBoardNavigation } from './board-navigation.mjs';
import { enableSlideSwitch } from './slide-switch.mjs';
import { createDropdowns, enableInstrumentDropdown } from './dropdown.mjs';
import { createAtlas } from './pdf.mjs';
import { intervalName } from './intervals.mjs';
import { scalePatterns } from './patterns.mjs';
import { patternSummary } from './pattern-summary.mjs';
import {
  entryPracticeParams,
  practiceParams,
  readPracticeLink,
} from './practice-link.mjs';
const STORAGE_KEY = 'scales.preferences.v1';
let saved = {};
try {
  saved = readPreferences(localStorage.getItem(STORAGE_KEY));
} catch {}
const projectRoot = new URL('../', import.meta.url);
const routeLanguage = document.documentElement.dataset.pageLanguage;
const entryParams = new URLSearchParams(location.search);
const setupParams = new URLSearchParams(entryParams);
if (routeLanguage !== 'en' && !setupParams.has('lang'))
  setupParams.set('lang', routeLanguage);
let { state, range } = readPracticeLink(setupParams, saved);
let renderedLanguage;
let patternInfo = { system: null, patterns: [] },
  patternKey;
let boardNotes = [];

let family = initialScaleFamily(state.scale),
  instrumentAudio,
  inspectedNote = null,
  inspectedPitch = null,
  noteAudioVersion = 0,
  soundingMidi = null,
  exporting,
  pdfLibraries,
  tuningDraft = false;
const $ = (id) => document.getElementById(id);
const dropdowns = createDropdowns();
const renderBackingTracks = enableBackingTracks(() => state);
const options = (items, current) =>
  items
    .map(
      ([value, label]) =>
        `<option value="${escape(value)}" ${String(value) === String(current) ? 'selected' : ''}>${escape(label)}</option>`,
    )
    .join('');
function numberKeys(name, counts) {
  return counts
    .map(
      (count) =>
        `<label><input type="radio" name="${name}" value="${count}"><span>${count}</span></label>`,
    )
    .join('');
}
$('root-notes').innerHTML = SHARPS.map((sharp, pitch) => {
  const flat = FLATS[pitch];
  const name = sharp === flat ? sharp : `${sharp} / ${flat}`;
  return `<label><input type="radio" name="root" value="${pitch}" aria-label="${name}"><span>${sharp}${sharp === flat ? '' : `<small>${flat}</small>`}</span></label>`;
}).join('');

function renderKeyTonic(s) {
  const control = $('key-tonic-control');
  const names = new Set([SHARPS[s.root], FLATS[s.root]]);
  // Keep uncommon enharmonic spellings from shared links and saved practice.
  if (s.tonic) names.add(prettyDegree(s.tonic));
  const show = names.size > 1;
  if (!show && control.contains(document.activeElement))
    $('root-notes').querySelector('input:checked')?.focus({ preventScroll: true });
  control.hidden = !show;
  if (show) {
    $('key-tonic').innerHTML = options(
      [['', copy[s.lang].automaticTonic], ...Array.from(names, (name) => [name, name])],
      s.tonic ? prettyDegree(s.tonic) : '',
    );
  }
}
$('fret-counts').innerHTML = numberKeys('frets', FRET_COUNTS);
const tuningName = (tuning) => localizedTuningName(tuning, state.lang);
function tuningSummary(s) {
  if (s.tuning !== 'custom') return tuningName(s.tuningData);
  const preference = pitchPreference(s);
  return s.tuningData.notes.map((midi) => midiName(midi, preference)).join(' ');
}
function persist() {
  saved = rememberWorkspace(saved, { ...state, range });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {}
}
function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
function renderAppearance() {
  const theme = window.tukanyTheme;
  if (!theme) return;
  const t = copy[state.lang];
  const label = t.themeLabel
    .replace('{current}', t.themeModes[theme.preference])
    .replace('{next}', t.themeModes[theme.nextPreference]);
  $('theme-toggle').setAttribute('aria-label', label);
  $('theme-toggle').title = label;
  $('theme-toggle').setAttribute('aria-checked', String(theme.preference === 'dark'));
}
function replaceExplorerURL(params) {
  const url = new URL(explorerPath(routeLanguage), projectRoot);
  if (routeLanguage !== 'en') {
    if (state.lang === routeLanguage) params.delete('lang');
    else params.set('lang', state.lang);
  }
  url.search = params.toString();
  url.hash = location.hash;
  if (url.href !== location.href) history.replaceState(null, '', url);
}
function saveURL() {
  replaceExplorerURL(practiceParams(state, range));
}
function scaleChoiceMarkup(scale) {
  const id = scale.id;
  const selected = state.scale === id;
  const check = selected
    ? '<span class="scale-choice-check" aria-hidden="true"><i class="fa-solid fa-check"></i></span>'
    : '';
  return `<button type="button" class="scale-choice" data-scale="${id}" aria-pressed="${selected}"
      aria-labelledby="scale-name-${id}" aria-describedby="scale-formula-${id}">
      <span class="scale-choice-name" id="scale-name-${id}">${escape(scale.name[state.lang])}</span>
      <span class="scale-choice-formula" id="scale-formula-${id}">${escape(scale.formula.map(prettyDegree).join(' '))}</span>
      ${check}
    </button>`;
}

function renderScalePicker() {
  const results = $('scale-results');
  const focused =
    results.contains(document.activeElement) && document.activeElement.dataset.scale;
  const choices =
    family === 'custom' ? [selection(state).scaleData] : scalesInFamily(family);
  results.setAttribute('aria-label', copy[state.lang].scale);
  results.innerHTML = choices.map(scaleChoiceMarkup).join('');
  const buttons = [...results.querySelectorAll('[data-scale]')];
  const entry =
    buttons.find((button) => button.dataset.scale === focused) ??
    buttons.find((button) => button.dataset.scale === state.scale) ??
    buttons[0];
  buttons.forEach((button) => (button.tabIndex = button === entry ? 0 : -1));
  if (focused) entry?.focus({ preventScroll: true });
}
function currentPattern(id = range) {
  return patternInfo.patterns.find((pattern) => pattern.id === id);
}
function syncPatterns() {
  const key = sharedState(state);
  if (key !== patternKey) {
    patternInfo = scalePatterns(state);
    // Prefer the lower-octave fingering when a complete shape fits in two places.
    const lower = scalePatterns(state, { hi: 12 }).patterns;
    const byId = new Map(lower.map((pattern) => [pattern.id, pattern]));
    patternInfo.patterns = patternInfo.patterns.map(
      (pattern) => byId.get(pattern.id) ?? pattern,
    );
    patternKey = key;
  }
  if (range !== 'full' && !currentPattern()) {
    range = 'full';
    persist();
  }
}
function isHighlighted(point) {
  const pattern = currentPattern();
  return (
    !pattern ||
    pattern.points.some((note) => note.row === point.row && note.fret === point.fret)
  );
}
function revealPattern() {
  const board = $('board');
  const notes = [...board.querySelectorAll('.note:not(.muted)')].map((note) =>
    note.getBoundingClientRect(),
  );
  if (!notes.length) return;
  const left = Math.min(...notes.map((note) => note.left));
  const right = Math.max(...notes.map((note) => note.right));
  board.scrollLeft +=
    (left + right - board.clientWidth) / 2 - board.getBoundingClientRect().left;
}
const staff = $('staff-notation');
let staffPoints = [];
let extraStaffMidi;

function renderStaff() {
  const focusedMidi = staff.contains(document.activeElement)
    ? document.activeElement.dataset.staffMidi
    : undefined;
  const extra =
    inspectedNote && !staffPoints.some(({ midi }) => midi === inspectedNote.midi);
  extraStaffMidi = extra ? inspectedNote.midi : undefined;
  const points = extra ? [...staffPoints, inspectedNote] : staffPoints;
  const layout = staffLayout({ state, points }, currentPattern());
  const { lang } = state;
  $('staff-heading').textContent = copy[lang][layout.clef.label];
  staff.innerHTML = staffMarkup(layout, lang);
  const low = layout.notes[0]?.name ?? '';
  const high = layout.notes.at(-1)?.name ?? '';
  $('staff-range').textContent = low === high ? low : `${low} – ${high}`;
  if (focusedMidi !== undefined) {
    const note =
      staff.querySelector(`[data-staff-midi="${focusedMidi}"]`) ??
      staff.querySelector('[data-staff-midi][tabindex="0"]');
    note?.focus({ preventScroll: true });
  }
}
// Keep the note between the pinned clef and the right edge of the staff.
function revealStaffNote(note, align = 'nearest') {
  if (!note || staff.scrollWidth <= staff.clientWidth) return;
  const left = staff.querySelector('.staff-clef-column').getBoundingClientRect().right;
  const right = staff.getBoundingClientRect().right;
  const bounds = note.getBoundingClientRect();
  if (align === 'start' || bounds.left < left + 4)
    staff.scrollLeft += bounds.left - left - 4;
  else if (bounds.right > right - 4) staff.scrollLeft += bounds.right - right + 4;
}
function selectStaffNote(midi) {
  // Keep the current SVG button mounted during staff keyboard/pointer interaction.
  // A new fretboard or formula selection replaces any temporary extra note.
  if (
    !staff.querySelector(`[data-staff-midi="${midi}"]`) ||
    (extraStaffMidi !== undefined &&
      extraStaffMidi !== midi &&
      !staff.contains(document.activeElement))
  )
    renderStaff();
  const note = staff.querySelector(`[data-staff-midi="${midi}"]`);
  if (!note) return;
  const previous = staff.querySelector('.is-selected');
  if (note !== previous) {
    previous?.classList.remove('is-selected');
    previous?.setAttribute('aria-pressed', 'false');
    staff
      .querySelector('[data-staff-midi][tabindex="0"]')
      ?.setAttribute('tabindex', '-1');
    note.classList.add('is-selected');
    note.setAttribute('aria-pressed', 'true');
    note.setAttribute('tabindex', '0');
    $('staff-range').textContent = staffPitchName(midi, state);
  }
  revealStaffNote(note);
}
function renderBoard() {
  const board = $('board');
  const width = 72 + (state.frets + 1) * 45;
  const height = 74 + (state.strings - 1) * 31;
  const setup = [
    state.instrument,
    state.strings,
    state.tuning,
    state.customTuning,
    state.hand,
    state.frets,
  ].join('|');
  const reset = board.dataset.setup !== setup;
  const focus = [
    range,
    ...(currentPattern()?.points.map((point) => `${point.row}:${point.fret}`) ?? []),
  ].join('|');
  const rangeChanged = board.dataset.focus !== focus;
  const scroll = board.scrollLeft;
  const active = board.contains(document.activeElement)
    ? document.activeElement.dataset
    : null;
  board.dir = state.hand === 'left' ? 'rtl' : 'ltr';
  const model = boardModel(state);
  boardNotes = model.points;
  board.innerHTML = boardMarkup(state, {
    model,
    width,
    height,
    focusPoints: currentPattern()?.points,
    patterns: patternInfo.patterns,
    selectedPattern: currentPattern()?.id,
  });
  const pattern = currentPattern();
  staffPoints = practiceStaffPoints(model, pattern ? [pattern] : patternInfo.patterns);
  renderStaff();
  if (reset || rangeChanged)
    revealStaffNote(staff.querySelector('.is-in-pattern'), 'start');
  highlightSelection();
  if (soundingMidi !== null) highlightSoundingNote(soundingMidi);
  board.dataset.setup = setup;
  // The scroll container starts from the nut side in either orientation.
  board.scrollLeft = reset ? 0 : scroll;
  if (!reset && rangeChanged && range !== 'full' && width > board.clientWidth) {
    revealPattern();
  }
  board.dataset.focus = focus;
  if (active?.fret) {
    const note =
      board.querySelector(`[data-row="${active.row}"][data-fret="${active.fret}"]`) ??
      board.querySelector('[data-midi][tabindex="0"]');
    note?.focus({ preventScroll: true });
  }
  if (active?.pattern)
    board
      .querySelector(`[data-pattern="${active.pattern}"]`)
      ?.focus({ preventScroll: true });
  $('scroll-hint').hidden = width <= board.clientWidth;
  renderNoteReadout();
}
function renderContent() {
  syncPatterns();
  const s = selection(state),
    t = copy[state.lang],
    names = spellScale(s);
  $('family-label').textContent = FAMILIES[s.scaleData.family]?.[s.lang] ?? t.custom;
  $('note-count').textContent =
    `${names.length} ${names.length === 1 ? t.singleNote : t.noteCount}`;
  $('setup-summary').textContent = `${t[s.instrument]} · ${tuningSummary(s)}`;
  const tones = $('formula-degrees');
  tones.innerHTML = names
    .map((name, index) => {
      const pitch = (s.root + s.scaleData.intervals[index]) % 12;
      const degree = s.scaleData.formula[index];
      const symbol = prettyDegree(degree);
      const description = `${t.degree} ${symbol}, ${name}, ${intervalName(degree, s.lang)}`;
      return `<button type="button" class="tone-button" data-pitch="${pitch}" aria-pressed="false" aria-label="${escape(description)}"><span class="formula-degree">${escape(symbol)}</span><span class="formula-note"><i aria-hidden="true" class="color-dot${isAccidentalPitch(pitch) ? ' accidental-pitch' : ''}" style="background:${pitchColor(pitch)}"></i>${escape(name)}</span></button>`;
    })
    .join('');
  $('orientation').textContent = s.hand === 'left' ? t.nutRight : t.nutLeft;
  $('pattern-info').textContent = patternInfo.patterns.length
    ? `${t.patterns} · ${t.patternSystems[patternInfo.system]} · ${t.patternToggleHint}`
    : t.patternUnavailable;
  $('pattern-system').textContent = patternInfo.patterns.length
    ? t.patternLabels[patternInfo.system]
    : t.patternUnavailable;
  const summary = patternSummary(s, currentPattern());
  $('pattern-summary').hidden = !summary;
  $('pattern-summary').innerHTML = summary
    ? `<strong>${escape(summary.title)}</strong><span>${escape(summary.detail)}</span>`
    : '';
  renderBoard();
  $('degrees-hint').hidden = s.labels !== 'degrees';
}
function changeRange(id) {
  range = id;
  inspectedNote = inspectedPitch = null;
  stopNoteAudio();
  persist();
  status('');
  $('share-fallback').hidden = true;
  renderContent();
  saveURL();
}
function togglePattern(id) {
  if (!currentPattern(id)) return;
  changeRange(range === id ? 'full' : id);
  $('board').querySelector(`[data-pattern="${id}"]`)?.focus({ preventScroll: true });
}
enableInstrumentDropdown($('instrument-toggle'), $('instrument-settings'));
$('board').addEventListener('click', (event) => {
  const marker = event.target.closest('[data-pattern]');
  if (marker) togglePattern(marker.dataset.pattern);
});
$('board').addEventListener('keydown', (event) => {
  const marker = event.target.closest('[data-pattern]');
  if (
    !marker ||
    !['Enter', ' '].includes(event.key) ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  )
    return;
  event.preventDefault();
  if (!event.repeat) togglePattern(marker.dataset.pattern);
});
new ResizeObserver(() => {
  const board = $('board');
  $('scroll-hint').hidden = board.scrollWidth <= board.clientWidth;
}).observe($('board'));
function validationMessage(id, key) {
  const element = $(id);
  element.textContent = key ? copy[state.lang][key] : '';
  if (key) element.dataset.i18n = key;
  else delete element.dataset.i18n;
}
function renderTuningLabels() {
  const t = copy[state.lang];
  $('tuning-fields')
    .querySelectorAll('label')
    .forEach((label, i) => {
      const name = `${t.string} ${state.strings - i}`;
      const end = i === 0 ? t.lowest : i === state.strings - 1 ? t.highest : '';
      label.querySelector('span').textContent = `${name}${end ? ` · ${end}` : ''}`;
      label
        .querySelector('input')
        .setAttribute('aria-label', `${name}${end ? `, ${end}` : ''}`);
    });
}
function renderTuningFields() {
  const s = selection(state);
  $('tuning-fields').innerHTML = s.tuningData.notes
    .map(
      (m, i) =>
        `<label><span></span><input id="string-pitch-${i}" data-string-pitch value="${midiName(m)}" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="done" aria-describedby="tuning-error"></label>`,
    )
    .join('');
  renderTuningLabels();
}
const exportCards = [...document.querySelectorAll('[data-export]')];

function atlasScope(cardScope, input) {
  // A custom formula has one map and no named catalog family.
  return cardScope === 'family' && input.scale === 'custom' ? 'selected' : cardScope;
}

function renderExport({ resetStatus = true } = {}) {
  if (!exporting && resetStatus) $('export-status').textContent = '';
  for (const card of exportCards) {
    const active = exporting?.card === card;
    const s = selection(active ? exporting.snapshot : state);
    const t = copy[state.lang];
    const scope = atlasScope(card.dataset.export, s);
    const { count, pages } = exportPreview(s, { scope });
    if (card.dataset.export === 'family') {
      card.querySelector('.export-scope span').textContent =
        scope === 'selected' ? t.selected : t.familyScope;
      card.querySelector('.export-title').textContent =
        FAMILIES[s.scaleData.family]?.[state.lang] ?? t.customScaleTitle;
    }
    card.querySelector('.export-estimate').textContent = [
      `${count} ${count === 1 ? t.scaleMap : t.scaleMaps}`,
      `${pages} ${t.pages}`,
      t.pdfFormat,
      LANGUAGES[s.lang].label,
    ].join(' · ');
    card.querySelector('.export-setup').textContent = [
      `${t.root} ${rootName(s)}`,
      `${t[s.instrument]} (${s.strings} ${t.strings.toLowerCase()})`,
      tuningSummary(s),
      `${s.frets} ${t.frets.toLowerCase()}`,
      t[s.hand],
      t[s.labels],
    ].join(' · ');
    card.querySelector('.export-action span').textContent = active ? t.cancel : t.pdf;
    card.querySelector('.export-action i').className =
      `icon fa-solid fa-${active ? 'xmark' : 'download'}`;
    card.disabled = Boolean(exporting && !active);
  }
}
function render() {
  const t = copy[state.lang],
    s = selection(state);
  if (renderedLanguage !== state.lang) {
    syncExplorerPage(state.lang);
    renderedLanguage = state.lang;
  }
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t[el.dataset.i18n] ?? el.textContent;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t[el.dataset.i18nAria]);
  });
  renderAppearance();
  const arpeggio = s.scaleData.family === 'arpeggio';
  document.querySelectorAll('[data-i18n="root"]').forEach((el) => {
    el.textContent = arpeggio ? t.chordRoot : t.root;
  });
  $('root-hint').textContent = arpeggio ? t.chordRootHint : t.rootHint;
  $('degrees-hint').textContent = arpeggio ? t.chordDegreesHint : t.degreesHint;
  $('language').value = state.lang;
  const families = [
    ['common', t.commonScales],
    ...Object.entries(FAMILIES).map(([id, names]) => [id, names[state.lang]]),
  ];
  if (state.scale === 'custom') families.push(['custom', t.custom]);
  $('scale-family').innerHTML = options(families, family);
  const stringCounts = $('string-counts');
  if (stringCounts.dataset.instrument !== state.instrument) {
    stringCounts.innerHTML = numberKeys('strings', STRING_COUNTS[state.instrument]);
    stringCounts.dataset.instrument = state.instrument;
  }
  for (const name of ['instrument', 'hand', 'strings', 'frets', 'labels', 'root'])
    document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      input.checked = input.value === String(state[name]);
    });
  const preference = pitchPreference(s);
  $('tuning').value = tuningDraft ? 'custom' : state.tuning;
  $('tuning-name').textContent =
    tuningDraft || state.tuning === 'custom' ? t.custom : tuningName(s.tuningData);
  $('open-string-pitches').innerHTML = s.tuningData.notes
    .map((midi) => `<span>${midiName(midi, preference)}</span>`)
    .join(' ');
  renderKeyTonic(s);
  $('allNotes').checked = state.allNotes;
  $('custom-tuning').hidden = !tuningDraft;
  if (tuningDraft) renderTuningLabels();
  $('edit-pitches').hidden = tuningDraft || state.tuning !== 'custom';
  $('preset-notes').hidden = tuningDraft;
  const scaleTitle = `${rootName(s)} ${scaleName(s.scaleData, s.lang)}`;
  $('fretboard-heading').textContent = scaleTitle;
  $('mobile-scale-title').textContent = scaleTitle;
  renderBackingTracks();
  renderScalePicker();
  renderContent();
  renderExport();
  dropdowns.refresh();
}
function update(values, { setup = false } = {}) {
  inspectedNote = inspectedPitch = null;
  stopNoteAudio();
  const previous = state;
  state = changeSetup(state, values, saved);
  persist();
  status('');
  $('share-fallback').hidden = true;
  $('setup-status').textContent = '';
  render();
  saveURL();
  if (setup) {
    $('setup-status').textContent =
      previous.tuning !== state.tuning ? copy[state.lang].tuningReset : '';
  }
}
function cancelTuning() {
  tuningDraft = false;
  validationMessage('tuning-error');
  $('custom-tuning').hidden = true;
  render();
  (state.tuning === 'custom' ? $('edit-pitches') : $('tuning')).focus();
}
function applyTuning() {
  const fields = [...$('tuning-fields').querySelectorAll('input')],
    text = fields.map((field) => field.value.trim()).join(' ');
  fields.forEach((field) => field.removeAttribute('aria-invalid'));
  const invalid = fields.filter((field) => {
    try {
      parseNote(field.value);
      return false;
    } catch {
      return true;
    }
  });
  if (invalid.length) {
    invalid.forEach((field) => field.setAttribute('aria-invalid', 'true'));
    validationMessage('tuning-error', 'tuningExample');
    invalid[0].focus();
    return;
  }
  try {
    parseTuning(text, state.strings);
    tuningDraft = false;
    update({ tuning: 'custom', customTuning: text });
    validationMessage('tuning-error');
    $('setup-status').textContent = copy[state.lang].tuningApplied;
    $('tuning').focus();
  } catch {
    fields.forEach((field) => field.setAttribute('aria-invalid', 'true'));
    validationMessage('tuning-error', 'tuningOrder');
    fields[0]?.focus();
  }
}
async function audioPlayer() {
  if (!instrumentAudio) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw new Error('Audio unavailable');
    instrumentAudio = new PluckedStringPlayer(new Context());
  }
  await instrumentAudio.context.resume();
  return instrumentAudio;
}
function renderNoteReadout() {
  const note = inspectedNote;
  $('note-readout').hidden = !note;
  if (!note) {
    $('note-readout-text').textContent = '';
    return;
  }
  const t = copy[state.lang];
  const details = [
    spelledMidiName(note.midi, state),
    note.degree
      ? intervalName(note.degree, state.lang)
      : selection(state).scaleData.family === 'arpeggio'
        ? t.outsideChord
        : t.outsideScale,
    `${t.string.toLowerCase()} ${note.string}`,
    `${t.fret.toLowerCase()} ${note.fret}`,
  ];
  if (!note.visible) details.push(t.noteOutsideRange);
  $('note-readout-text').textContent = details.join(' · ');
}
function highlightSelection() {
  if (inspectedNote) selectStaffNote(inspectedNote.midi);
  $('board')
    .querySelectorAll('[data-midi]')
    .forEach((note) =>
      note.classList.toggle(
        'selected-pitch',
        inspectedPitch !== null && Number(note.dataset.midi) % 12 === inspectedPitch,
      ),
    );
  $('formula-degrees')
    .querySelectorAll('button')
    .forEach((button) => {
      const selected = Number(button.dataset.pitch) === inspectedPitch;
      button.setAttribute('aria-pressed', String(selected));
    });
}
function inspectNote(note) {
  inspectedNote = note;
  inspectedPitch = note.midi % 12;
  highlightSelection();
  renderNoteReadout();
}
function highlightSoundingNote(midi) {
  soundingMidi = midi;
  document.querySelectorAll('.sounding').forEach((el) => el.classList.remove('sounding'));
  if (midi === null) return;
  document
    .querySelectorAll(
      `#board [data-midi="${midi}"], #formula-degrees button[data-pitch="${midi % 12}"], #staff-notation [data-staff-midi="${midi}"]`,
    )
    .forEach((el) => el.classList.add('sounding'));
}
function stopNoteAudio() {
  noteAudioVersion++;
  instrumentAudio?.stop();
  highlightSoundingNote(null);
}
async function soundNote(midi) {
  stopNoteAudio();
  const version = noteAudioVersion;
  status('');
  try {
    const player = await audioPlayer();
    if (version !== noteAudioVersion || document.hidden) return;
    player.play(midi, {
      instrument: state.instrument,
      onEnded: () => {
        if (version === noteAudioVersion) highlightSoundingNote(null);
      },
    });
    highlightSoundingNote(midi);
  } catch {
    if (version === noteAudioVersion) {
      stopNoteAudio();
      status(copy[state.lang].audioUnavailable, true);
    }
  }
}
function inspectFret(midi, element) {
  const candidates = boardNotes.filter((point) => point.midi === midi);
  const note = element
    ? candidates.find(
        ({ row, fret }) =>
          row === Number(element.dataset.row) && fret === Number(element.dataset.fret),
      )
    : (candidates.find(isHighlighted) ?? candidates[0]);
  if (note)
    inspectNote({
      ...note,
      visible: isHighlighted(note),
    });
}
function playNote(midi, element) {
  inspectFret(midi, element);
  soundNote(midi);
}
staff.addEventListener('focusin', (event) => {
  const note = event.target.closest('[data-staff-midi]');
  if (note) inspectFret(Number(note.dataset.staffMidi));
});
staff.addEventListener('click', (event) => {
  const note = event.target.closest('[data-staff-midi]');
  if (!note) return;
  note.focus({ preventScroll: true });
  playNote(Number(note.dataset.staffMidi));
});
staff.addEventListener('keydown', (event) => {
  const note = event.target.closest('[data-staff-midi]');
  if (!note || event.altKey || event.ctrlKey || event.metaKey) return;
  let next;
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (!event.repeat) playNote(Number(note.dataset.staffMidi));
      return;
    case 'ArrowLeft':
    case 'ArrowDown':
      next = note.previousElementSibling;
      break;
    case 'ArrowRight':
    case 'ArrowUp':
      next = note.nextElementSibling;
      break;
    case 'Home':
      next = staff.querySelector('[data-staff-midi]');
      break;
    case 'End':
      next = note.parentElement.lastElementChild;
      break;
    default:
      return;
  }
  event.preventDefault();
  if (next?.matches('[data-staff-midi]')) next.focus({ preventScroll: true });
});
$('formula-degrees').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-pitch]');
  if (!button) return;
  const pitch = Number(button.dataset.pitch);
  const candidates = boardNotes
    .filter((point) => point.pc === pitch)
    .sort((a, b) => a.midi - b.midi);
  const highlighted = candidates.find(isHighlighted);
  const note = highlighted ?? candidates[0];
  if (!note) return;
  inspectNote({ ...note, visible: Boolean(highlighted) });
  soundNote(note.midi);
});
$('board').addEventListener('focusin', (event) => {
  const note = event.target.closest('[data-midi]');
  if (note) inspectFret(Number(note.dataset.midi), note);
});
window.addEventListener('pagehide', stopNoteAudio);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopNoteAudio();
});
$('jump-to-board').addEventListener('click', (event) => {
  event.preventDefault();
  $('fretboard-heading').focus({ preventScroll: true });
  $('fretboard').scrollIntoView({ block: 'start' });
});
enableBoardNavigation($('board'), playNote);
$('instrument').addEventListener('change', (event) => {
  tuningDraft = false;
  validationMessage('tuning-error');
  update({ instrument: event.target.value }, { setup: true });
});
$('strings').addEventListener('change', (event) => {
  tuningDraft = false;
  validationMessage('tuning-error');
  update({ strings: event.target.value }, { setup: true });
});
$('hand').addEventListener('change', (event) => update({ hand: event.target.value }));
$('frets').addEventListener('change', (event) => update({ frets: event.target.value }));
$('root-notes').addEventListener('change', ({ target }) =>
  update({ root: target.value }),
);
$('key-tonic').addEventListener('change', ({ target }) =>
  update({ tonic: target.value }),
);
$('labels').addEventListener('change', (event) => update({ labels: event.target.value }));
function tuningChoices() {
  const preference = pitchPreference(state);
  const choices = TUNINGS.filter(
    (tuning) =>
      tuning.instrument === state.instrument && tuning.strings === state.strings,
  ).map((tuning) => ({
    value: tuning.id,
    label: tuningName(tuning),
    detail: tuning.notes.map((midi) => midiName(midi, preference)).join(' '),
    selected: tuning.id === $('tuning').value,
  }));
  choices.push({
    value: 'custom',
    label: copy[state.lang].custom,
    selected: $('tuning').value === 'custom',
  });
  return choices;
}
dropdowns.register($('tuning'), 'tuning-caption', tuningChoices, (value) => {
  if (value === 'custom') editTuning();
  else {
    tuningDraft = false;
    validationMessage('tuning-error');
    update({ tuning: value });
  }
});
function editTuning() {
  tuningDraft = true;
  $('tuning').value = 'custom';
  $('tuning-name').textContent = copy[state.lang].custom;
  renderTuningFields();
  $('custom-tuning').hidden = false;
  $('edit-pitches').hidden = true;
  $('preset-notes').hidden = true;
  $('setup-status').textContent = '';
  validationMessage('tuning-error');
  $('tuning-fields').querySelector('input').focus();
}
$('edit-pitches').addEventListener('click', editTuning);
$('tuning-fields').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    applyTuning();
  }
});
$('scale-results').addEventListener('click', (event) => {
  const button = event.target.closest('[data-scale]');
  if (button) update({ scale: button.dataset.scale });
});
$('scale-results').addEventListener('keydown', (event) => {
  const buttons = [...$('scale-results').querySelectorAll('[data-scale]')],
    index = buttons.indexOf(event.target);
  if (index < 0) return;
  const next = chooseNextIndex(
    buttons.map((button) => button.getBoundingClientRect()),
    index,
    event.key,
  );
  if (next !== undefined) {
    event.preventDefault();
    buttons.forEach((button, i) => (button.tabIndex = i === next ? 0 : -1));
    buttons[next].focus();
  }
});
$('scale-family').addEventListener('change', (event) => {
  family = event.target.value;
  renderScalePicker();
});
$('apply-tuning').addEventListener('click', applyTuning);
$('cancel-tuning').addEventListener('click', cancelTuning);
$('instrument-form').addEventListener('submit', (event) => event.preventDefault());
$('language').addEventListener('change', () => update({ lang: $('language').value }));
$('allNotes').addEventListener('change', () =>
  update({ allNotes: $('allNotes').checked }),
);
$('share').addEventListener('click', async () => {
  saveURL();
  const url = new URL(explorerPath(state.lang), projectRoot);
  url.search = location.search;
  url.searchParams.delete('lang');
  $('share-fallback').hidden = true;
  try {
    await navigator.clipboard.writeText(url.href);
    status(copy[state.lang].saved);
  } catch {
    status('');
    $('share-url').value = url.href;
    $('share-fallback').hidden = false;
    $('share-url').focus();
    $('share-url').select();
  }
});
function loadScript(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(path, projectRoot).href;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
}
async function ensurePdf() {
  pdfLibraries ??= Promise.all([
    loadScript('./vendor/pdf-lib.min.js'),
    loadScript('./vendor/fontkit.umd.min.js'),
  ]).catch((error) => {
    pdfLibraries = null;
    throw error;
  });
  return pdfLibraries;
}
async function downloadAtlas(card) {
  if (exporting) {
    if (exporting.card === card) exporting.controller.abort();
    return;
  }
  const snapshot = { ...state };
  const scope = atlasScope(card.dataset.export, snapshot);
  const controller = new AbortController();
  exporting = { card, controller, snapshot };
  renderExport();
  $('export-status').textContent = copy[state.lang].exporting;
  try {
    await ensurePdf();
    controller.signal.throwIfAborted();
    const bytes = await createAtlas(snapshot, {
      scope,
      signal: controller.signal,
      progress: (n, total) => {
        $('export-status').textContent =
          `${copy[state.lang].exporting} · ${n} / ${total}`;
      },
    });
    controller.signal.throwIfAborted();
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const link = document.createElement('a');
    const edition =
      scope === 'family'
        ? selection(snapshot).scaleData.family
        : scope === 'catalog'
          ? 'catalog'
          : snapshot.scale;
    link.href = url;
    link.download = `tukany-${snapshot.instrument}-${snapshot.strings}-${snapshot.tuning}-${edition}-${rootName(snapshot).replaceAll('♯', 'sharp').replaceAll('♭', 'flat')}-${snapshot.hand}-${snapshot.lang}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    $('export-status').textContent = copy[state.lang].ready;
  } catch (error) {
    $('export-status').textContent =
      error.name === 'AbortError'
        ? copy[state.lang].cancelled
        : copy[state.lang].exportFailed;
  } finally {
    exporting = null;
    renderExport({ resetStatus: false });
  }
}
exportCards.forEach((card) => card.addEventListener('click', () => downloadAtlas(card)));
$('theme-toggle').addEventListener('click', () => {
  const theme = window.tukanyTheme;
  theme?.setPreference(theme.nextPreference);
});
window.addEventListener('themechange', renderAppearance);
document.querySelectorAll('.setup-switch').forEach(enableSlideSwitch);
persist();
render();
replaceExplorerURL(entryPracticeParams(entryParams, state, range));
