// SPDX-License-Identifier: MPL-2.0

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
  sharedState,
  boardModel,
  boardDimensions,
  formulaPlaybackPitches,
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
import { practicePatterns } from './patterns.mjs';
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
let paperSize = saved.paperSize === 'letter' ? 'letter' : 'a4';
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
const fifths = SHARPS.map((_, step) => (step * 7) % SHARPS.length);
$('root-notes').innerHTML = fifths
  .map((pitch, step) => {
    const sharp = SHARPS[pitch],
      flat = FLATS[pitch];
    const [primary, alternate] = step > 6 ? [flat, sharp] : [sharp, flat];
    const name = primary === alternate ? primary : `${primary} / ${alternate}`;
    const angle = (step * 2 * Math.PI) / fifths.length;
    const x = 50 + 37 * Math.sin(angle),
      y = 50 - 37 * Math.cos(angle);
    return `<label style="--root-x:${x}%;--root-y:${y}%"><input type="radio" name="root" value="${pitch}" aria-label="${name}"><span>${primary}${primary === alternate ? '' : `<small>${alternate}</small>`}</span></label>`;
  })
  .join('');
$('fret-counts').innerHTML = numberKeys('frets', FRET_COUNTS);
const tuningName = (tuning) => localizedTuningName(tuning, state.lang);
function tuningSummary(s) {
  if (s.tuning !== 'custom') return tuningName(s.tuningData);
  const preference = pitchPreference(s);
  return s.tuningData.notes.map((midi) => midiName(midi, preference)).join(' ');
}
function persist() {
  saved = { ...rememberWorkspace(saved, { ...state, range }), paperSize };
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
    patternInfo = practicePatterns(state);
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
function renderBoard(model) {
  const board = $('board');
  const { width, height } = boardDimensions(state);
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
  const model = boardModel(state),
    s = model.state,
    t = copy[state.lang],
    names = spellScale(s),
    pitches = formulaPlaybackPitches(model, currentPattern());
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
      return `<button type="button" class="tone-button" data-pitch="${pitch}" data-formula-midi="${pitches[index]}" aria-pressed="false" aria-label="${escape(description)}"><span class="formula-degree">${escape(symbol)}</span><span class="formula-note"><i aria-hidden="true" class="color-dot${isAccidentalPitch(pitch) ? ' accidental-pitch' : ''}" style="background:${pitchColor(pitch)}"></i>${escape(name)}</span></button>`;
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
  renderBoard(model);
  $('degrees-hint').hidden = s.labels !== 'degrees';
}
function changeRange(id) {
  range = id;
  inspectedNote = inspectedPitch = null;
  stopNoteAudio();
  persist();
  status('');
  renderContent();
  renderExport();
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
function renderTuningLabels() {
  const t = copy[state.lang];
  $('tuning-fields')
    .querySelectorAll('.tuning-string')
    .forEach((row, i) => {
      const number = state.strings - i;
      const end = i === 0 ? t.lowest : i === state.strings - 1 ? t.highest : '';
      row.querySelector('label > span').textContent = `${t.string} ${number}`;
      row.querySelector('small').textContent = end;
      for (const button of row.querySelectorAll('button')) {
        const action = button.dataset.tuningStep === '-1' ? t.lowerString : t.raiseString;
        button.setAttribute('aria-label', action.replace('{string}', number));
      }
    });
}
function renderTuningFields(s) {
  const preference = pitchPreference(s) === 'flat' ? 'flat' : 'sharp';
  $('tuning-fields').innerHTML = s.tuningData.notes
    .map(
      (midi, i) => `<div class="tuning-string">
        <label for="string-pitch-${i}"><span></span><small></small></label>
        <div class="pitch-stepper">
          <button type="button" data-tuning-step="-1" aria-disabled="${midi === 0}">
            <i class="fa-solid fa-minus" aria-hidden="true"></i>
          </button>
          <input type="text" id="string-pitch-${i}" data-string-pitch="${s.strings - i}"
            data-midi="${midi}" value="${midiName(midi, preference)}" autocomplete="off"
            autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="done">
          <button type="button" data-tuning-step="1" aria-disabled="${midi === 127}">
            <i class="fa-solid fa-plus" aria-hidden="true"></i>
          </button>
        </div>
        <p id="string-pitch-error-${i}" class="tuning-field-error hint error"></p>
      </div>`,
    )
    .join('');
}
function renderTuning(s) {
  const t = copy[s.lang];
  const preference = pitchPreference(s);
  $('tuning-name').textContent = tuningName(s.tuningData);
  $('open-string-pitches').innerHTML = s.tuningData.notes
    .map((midi) => `<span>${midiName(midi, preference)}</span>`)
    .join(' ');
  $('custom-tuning').hidden = !tuningDraft;
  const editLabel = $('edit-pitches-label');
  editLabel.dataset.i18n = s.tuning === 'custom' ? 'editPitches' : 'customizeTuning';
  editLabel.textContent = t[editLabel.dataset.i18n];
  if (tuningDraft) {
    renderTuningLabels();
    if ($('tuning-error').textContent) validateTuningFields();
  }
}
const exportCards = [...document.querySelectorAll('[data-export]')];

function renderExport({ resetStatus = true } = {}) {
  if (!exporting && resetStatus) $('export-status').textContent = '';
  const s = selection(exporting?.snapshot ?? state);
  const t = copy[state.lang];
  const root = rootName(s);
  const pattern = exporting ? exporting.pattern : currentPattern();
  const paper = $('export-paper');
  paper.disabled = Boolean(exporting);
  paper.querySelector(`input[value="${paperSize}"]`).checked = true;
  $('export-setup').textContent = [
    `${t[s.instrument]} (${s.strings} ${t.strings.toLowerCase()})`,
    tuningSummary(s),
    `${s.frets} ${t.frets.toLowerCase()}`,
    t[s.hand],
    t[s.labels],
    LANGUAGES[s.lang].label,
  ].join(' · ');
  for (const card of exportCards) {
    const scope = card.dataset.export;
    const active = exporting?.card === card;
    card.hidden = scope === 'family' && s.scale === 'custom';
    if (card.hidden) continue;
    const { count, pages } = exportPreview(s, { scope });
    const collection =
      scope === 'family' ? FAMILIES[s.scaleData.family]?.[state.lang] : t.catalogScope;
    card.querySelector('.export-title').textContent =
      scope === 'selected'
        ? `${root} ${scaleName(s.scaleData, state.lang)}`
        : t.collectionOnRoot.replace('{collection}', collection).replace('{root}', root);
    const pageCount = `${pages} ${pages === 1 ? t.page : t.pages}`;
    const detail =
      scope === 'selected'
        ? pattern && `${t.pattern} ${pattern.number}`
        : `${count} ${count === 1 ? t.scaleMap : t.scaleMaps}`;
    card.querySelector('.export-estimate').textContent = [detail, pageCount]
      .filter(Boolean)
      .join(' · ');
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
  renderTuning(s);
  $('allNotes').checked = state.allNotes;
  const note = rootName(s),
    scale = scaleName(s.scaleData, s.lang);
  const wheelNote = $('root-wheel-note'),
    wheelScale = $('root-wheel-scale');
  if (wheelNote.textContent !== note) wheelNote.textContent = note;
  if (wheelScale.textContent !== scale) wheelScale.textContent = scale;
  $('root-wheel').style.setProperty(
    '--root-angle',
    `${(fifths.indexOf(s.root) * 360) / fifths.length}deg`,
  );
  const scaleTitle = `${note} ${scale}`;
  $('fretboard-heading').textContent = scaleTitle;
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
  renderTuning(selection(state));
  $('edit-pitches').focus();
}
function readTuningPitch(field) {
  try {
    return parseNote(field.value);
  } catch {
    return null;
  }
}
function validateTuningFields(
  fields = [...$('tuning-fields').querySelectorAll('input')],
) {
  const t = copy[state.lang];
  const pitches = fields.map(readTuningPitch);
  const malformed = pitches.indexOf(null);
  const outOfOrder =
    malformed < 0 ? pitches.findIndex((midi, i) => i > 0 && midi <= pitches[i - 1]) : -1;
  const invalid = malformed >= 0 ? malformed : outOfOrder;
  let message = '';
  if (malformed >= 0) {
    message = t.tuningPitchError.replace(
      '{string}',
      fields[malformed].dataset.stringPitch,
    );
  } else if (outOfOrder >= 0) {
    message = t.tuningOrder
      .replace('{string}', fields[outOfOrder].dataset.stringPitch)
      .replace('{previous}', fields[outOfOrder - 1].dataset.stringPitch);
  }
  fields.forEach((field, i) => {
    const error = $(`string-pitch-error-${i}`);
    const fieldMessage = i === invalid ? message : '';
    if (error.textContent !== fieldMessage) error.textContent = fieldMessage;
    if (i === invalid || i === outOfOrder - 1) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', `string-pitch-error-${invalid}`);
    } else {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    }
  });
  const error = $('tuning-error');
  if (error.textContent !== message) error.textContent = message;
  return fields[invalid];
}
function updateTuningPitch(field) {
  const midi = readTuningPitch(field);
  if (midi !== null) field.dataset.midi = midi;
  for (const button of field.parentElement.querySelectorAll('button')) {
    const next = Number(field.dataset.midi) + Number(button.dataset.tuningStep);
    button.setAttribute('aria-disabled', String(next < 0 || next > 127));
  }
  if ($('tuning-error').textContent) validateTuningFields();
}
function shiftTuningPitch(field, step) {
  const midi = Number(field.dataset.midi) + step;
  if (midi < 0 || midi > 127) return;
  const preference = pitchPreference(state) === 'flat' ? 'flat' : 'sharp';
  field.value = midiName(midi, preference);
  updateTuningPitch(field);
  $('tuning-step-status').textContent =
    `${copy[state.lang].string} ${field.dataset.stringPitch}, ${field.value}`;
}
function applyTuning() {
  const fields = [...$('tuning-fields').querySelectorAll('input')];
  const invalid = validateTuningFields(fields);
  if (invalid) {
    invalid.focus();
    return;
  }
  tuningDraft = false;
  update({
    tuning: 'custom',
    customTuning: fields.map((field) => field.value.trim()).join(' '),
  });
  $('setup-status').textContent = copy[state.lang].tuningApplied;
  $('tuning').focus();
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
  const midi = Number(
    event.target.closest('button[data-formula-midi]')?.dataset.formulaMidi,
  );
  if (Number.isInteger(midi)) playNote(midi);
});
$('board').addEventListener('focusin', (event) => {
  const note = event.target.closest('[data-midi]');
  if (note) inspectFret(Number(note.dataset.midi), note);
});
window.addEventListener('pagehide', stopNoteAudio);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopNoteAudio();
});
enableBoardNavigation($('board'), playNote);
$('instrument').addEventListener('change', (event) => {
  tuningDraft = false;
  update({ instrument: event.target.value }, { setup: true });
});
$('strings').addEventListener('change', (event) => {
  tuningDraft = false;
  update({ strings: event.target.value }, { setup: true });
});
$('hand').addEventListener('change', (event) => update({ hand: event.target.value }));
$('frets').addEventListener('change', (event) => update({ frets: event.target.value }));
$('root-notes').addEventListener('change', ({ target }) =>
  update({ root: target.value }),
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
    selected: tuning.id === state.tuning,
  }));
  choices.push({
    value: 'custom',
    label: copy[state.lang].custom,
    selected: state.tuning === 'custom',
  });
  return choices;
}
dropdowns.register($('tuning'), 'tuning-caption', tuningChoices, (value) => {
  if (value === 'custom') editTuning();
  else {
    tuningDraft = false;
    update({ tuning: value });
  }
});
function editTuning() {
  if (!tuningDraft) {
    const s = selection(state);
    tuningDraft = true;
    $('tuning-error').textContent = '';
    $('tuning-step-status').textContent = '';
    $('setup-status').textContent = '';
    renderTuningFields(s);
    renderTuning(s);
  }
  $('custom-tuning-title').focus();
}
$('edit-pitches').addEventListener('click', editTuning);
$('tuning-fields').addEventListener('input', ({ target }) => updateTuningPitch(target));
$('tuning-fields').addEventListener('click', (event) => {
  const button = event.target.closest('[data-tuning-step]');
  if (button)
    shiftTuningPitch(
      button.parentElement.querySelector('input'),
      Number(button.dataset.tuningStep),
    );
});
$('tuning-fields').addEventListener('keydown', (event) => {
  if (!event.target.matches('[data-string-pitch]') || event.isComposing) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    applyTuning();
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    shiftTuningPitch(event.target, event.key === 'ArrowDown' ? -1 : 1);
  }
});
$('custom-tuning').addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !event.isComposing) {
    event.preventDefault();
    cancelTuning();
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
  const snapshot = { ...state, range };
  const scope = card.dataset.export;
  const exportPaper = paperSize;
  const controller = new AbortController();
  exporting = { card, controller, snapshot, pattern: currentPattern() };
  renderExport();
  $('export-status').textContent = copy[state.lang].exporting;
  try {
    await ensurePdf();
    controller.signal.throwIfAborted();
    const bytes = await createAtlas(snapshot, {
      scope,
      paperSize: exportPaper,
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
        ? `family-${selection(snapshot).scaleData.family}`
        : scope === 'catalog'
          ? 'catalog'
          : `chart-${snapshot.scale}`;
    const patternSuffix =
      scope === 'selected' && snapshot.range !== 'full' ? `-${snapshot.range}` : '';
    link.href = url;
    link.download = `tukany-${snapshot.instrument}-${snapshot.strings}-${snapshot.tuning}-${edition}-${rootName(snapshot).replaceAll('♯', 'sharp').replaceAll('♭', 'flat')}${patternSuffix}-${snapshot.hand}-${exportPaper}-${snapshot.lang}.pdf`;
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
$('export-paper').addEventListener('change', (event) => {
  paperSize = event.target.value;
  persist();
  renderExport();
});
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
