import {
  TUNINGS,
  selection,
  rootName,
  spellScale,
  prettyDegree,
  midiName,
  spelledMidiName,
  PALETTE,
  SHARPS,
  FLATS,
  parseNote,
  parseTuning,
  parseFormula,
  sharedState,
  boardModel,
  pitchPreference,
} from './music.mjs';
import { PluckedStringPlayer, STRING_SOUNDS } from './string-audio.mjs';
import { scaleGroups, initialScaleView } from './scale-picker.mjs';
import { chooseNextIndex } from './choice-navigation.mjs';
import {
  readPreferences,
  restoreWorkspace,
  restoreRange,
  restoreNeckView,
  rememberWorkspace,
  changeSetup,
  exportPreview,
  scaleName,
} from './workspace.mjs';
import { FAMILIES } from './catalog.mjs';
import { copy } from './i18n.mjs';
import { LANGUAGES, tuningName as localizedTuningName } from './locales.mjs';
import { boardSvg, escape } from './board.mjs';
import { enableBoardNavigation } from './board-navigation.mjs';
import { createAtlas } from './pdf.mjs';
import { positionSequence, intervalName } from './practice.mjs';
import { scalePatterns } from './patterns.mjs';
import { patternSummary } from './pattern-summary.mjs';
const STORAGE_KEY = 'scales.preferences.v1';
let saved = {};
try {
  saved = readPreferences(localStorage.getItem(STORAGE_KEY));
} catch {}
const query = new URLSearchParams(location.search);
let state = restoreWorkspace(Object.fromEntries(query), saved);
let patternInfo = { system: null, patterns: [] },
  patternKey;
let range = restoreRange(Object.fromEntries(query), saved, {
  mobile: matchMedia('(max-width: 560px)').matches,
});
let neckView = restoreNeckView(Object.fromEntries(query), saved);
let boardWidth,
  boardRightOffset = 0;

let view = initialScaleView(state.scale),
  search = '',
  instrumentAudio,
  playing = false,
  playbackMode = null,
  inspectedNote = null,
  inspectedPitch = null,
  tempo = 100,
  playbackVersion = 0,
  soundingMidi = null,
  soundingPoint = null,
  playTimer,
  exporting,
  pdfLibraries,
  tuningDraft = false,
  formulaDirty = false;
let droneEnabled = false,
  droneVersion = 0;
const $ = (id) => document.getElementById(id);
const options = (items, current) =>
  items
    .map(
      ([value, label]) =>
        `<option value="${escape(value)}" ${String(value) === String(current) ? 'selected' : ''}>${escape(label)}</option>`,
    )
    .join('');
const tuningName = (tuning) => localizedTuningName(tuning, state.lang);
function persist() {
  saved = rememberWorkspace(saved, { ...state, range, neckView });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {}
}
function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
function saveURL() {
  const params = new URLSearchParams(sharedState(state));
  params.set('range', range);
  params.set('neck', neckView);
  history.replaceState(null, '', `${location.pathname}?${params}${location.hash}`);
}
function scaleChoiceMarkup(scale) {
  const t = copy[state.lang];
  const description =
    t.descriptions[scale.id] ??
    t.familyDescriptions[scale.family] ??
    t.genericDescription;
  const formula = scale.formula.map(prettyDegree).join(' ');
  return `<button type="button" class="scale-choice" data-scale="${scale.id}" aria-pressed="${state.scale === scale.id}"><span class="choice-name">${escape(scale.name[state.lang])}</span><small>${escape(description)}</small><span class="scale-formula">${formula}</span></button>`;
}

function scaleGroupMarkup(group) {
  const heading = group.id === 'common' ? copy[state.lang].commonScales : group.label;
  return `<div class="scale-group"><h3>${escape(heading)}</h3>${group.scales.map(scaleChoiceMarkup).join('')}</div>`;
}

function renderScalePicker() {
  const results = $('scale-results');
  const scroll = results.scrollTop;
  const focused = results.contains(document.activeElement)
    ? document.activeElement.dataset.scale
    : null;
  const t = copy[state.lang],
    groups = scaleGroups({ view, search, lang: state.lang });
  const searching = Boolean(search.trim());
  $('scale-tabs').hidden = searching;
  $('clear-search').hidden = !search.length;
  $('scale-tabs').setAttribute('aria-label', t.collections);
  $('scale-results').setAttribute('aria-label', t.scale);
  document
    .querySelectorAll('[data-view]')
    .forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.view === view)),
    );
  const count = groups.reduce((n, g) => n + g.scales.length, 0);
  $('scale-results-count').textContent =
    `${count} ${count === 1 ? t.result : t.results}${searching ? ` · ${t.entireCatalog}` : ''}`;
  $('scale-results-count').hidden = !searching;
  $('scale-results').innerHTML = groups.length
    ? groups.map(scaleGroupMarkup).join('')
    : `<div class="empty-results"><strong>${t.noResults}</strong><p>${t.retrySearch}</p></div>`;
  const buttons = [...$('scale-results').querySelectorAll('[data-scale]')],
    entry =
      buttons.find((button) => button.dataset.scale === focused) ||
      (!searching && buttons.find((button) => button.dataset.scale === state.scale)) ||
      buttons[0];
  buttons.forEach((button) => (button.tabIndex = button === entry ? 0 : -1));
  if (focused) entry?.focus({ preventScroll: true });
  results.scrollTop = scroll;
  const selected = selection(state).scaleData;
  $('scale-selection').textContent =
    `${t.currentScale} · ${rootName(state)} ${scaleName(selected, state.lang)}`;
}
function currentPattern(id = range) {
  return patternInfo.patterns.find((pattern) => pattern.id === id);
}
function syncPatterns() {
  const key = `${sharedState(state)}|${neckView}`;
  if (key !== patternKey) {
    const complete = scalePatterns(state);
    const octave = scalePatterns(state, { lo: 0, hi: 12 });
    // Keep matching fingerings in the same octave when expanding the view.
    const compact = new Map(octave.patterns.map((pattern) => [pattern.id, pattern]));
    patternInfo =
      neckView === 'full'
        ? {
            ...complete,
            patterns: complete.patterns.map(
              (pattern) => compact.get(pattern.id) ?? pattern,
            ),
          }
        : octave;
    patternInfo.allCount = complete.patterns.length;
    patternKey = key;
  }
  if (range !== 'full' && !currentPattern()) {
    range = 'full';
    persist();
  }
}
function fretBounds(id) {
  const pattern = currentPattern(id);
  if (pattern) return [pattern.lo, pattern.hi];
  return [0, neckView === 'full' ? state.frets : 12];
}
function isHighlighted(point) {
  const pattern = currentPattern();
  if (pattern)
    return pattern.points.some(
      (note) => note.row === point.row && note.fret === point.fret,
    );
  const [lo, hi] = fretBounds(range);
  return point.fret >= lo && point.fret <= hi;
}
function practiceFocus() {
  const pattern = currentPattern();
  const [lo, hi] = fretBounds(range);
  return pattern ? { points: pattern.points } : { lo, hi };
}
function revealPattern() {
  const board = $('board');
  const notes = [...board.querySelectorAll('.note:not(.muted)')].map((note) =>
    note.getBBox(),
  );
  if (!notes.length) return;
  const left = Math.min(...notes.map((note) => note.x));
  const right = Math.max(...notes.map((note) => note.x + note.width));
  board.scrollLeft = (left + right - board.clientWidth) / 2;
}
function renderBoard() {
  const board = $('board');
  const [lo, hi] = fretBounds(range);
  const displayHi = neckView === 'full' ? state.frets : 12;
  const width = 72 + (displayHi + 1) * 45;
  const height = 74 + (state.strings - 1) * 31;
  const setup = [
    state.instrument,
    state.strings,
    state.tuning,
    state.customTuning,
    state.hand,
    state.frets,
    neckView,
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
  boardWidth = board.clientWidth;
  board.style.setProperty('--board-width', `${width}px`);
  board.innerHTML = boardSvg(state, {
    lo: 0,
    hi: displayHi,
    width,
    height,
    focusRange: currentPattern() ? undefined : { lo, hi },
    focusPoints: currentPattern()?.points,
    patterns: patternInfo.patterns,
    selectedPattern: currentPattern()?.id,
  });
  highlightSelection();
  if (soundingMidi !== null) highlightPitch(soundingMidi, soundingPoint);
  board.dataset.setup = setup;
  board.scrollLeft = reset
    ? state.hand === 'left'
      ? board.scrollWidth - board.clientWidth
      : 0
    : scroll;
  if ((reset || rangeChanged) && range !== 'full' && width > board.clientWidth) {
    revealPattern();
  }
  board.dataset.focus = focus;
  boardRightOffset = board.scrollWidth - board.clientWidth - board.scrollLeft;
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
  $('scale-title').textContent = `${rootName(s)} ${scaleName(s.scaleData, s.lang)}`;
  $('mobile-scale-title').textContent = $('scale-title').textContent;
  $('setup-summary').textContent =
    `${t[s.instrument]} · ${s.strings} ${t.strings.toLowerCase()} · ${tuningName(s.tuningData)}`;
  // Match the reference row to the chosen diagram labels.
  const tables = [];
  for (let start = 0; start < names.length; start += 7) {
    const group = names.slice(start, start + 7);
    const cells = [];
    for (const [index, name] of group.entries()) {
      const pitch = (s.root + s.scaleData.intervals[start + index]) % 12;
      const degree = s.scaleData.formula[start + index];
      const label = s.labels === 'degrees' ? prettyDegree(degree) : name;
      cells.push(
        `<td data-pitch="${pitch}"><button type="button" class="tone-button" data-pitch="${pitch}" aria-pressed="false" aria-label="${escape(`${name} · ${intervalName(degree, s.lang)}`)}">${s.labels === 'notes' ? `<i aria-hidden="true" class="color-dot" style="background:${PALETTE[pitch] ?? '#fff'}"></i>` : ''}${escape(label).replace('/', '/<wbr>')}</button></td>`,
      );
    }
    tables.push(
      `<table class="tone-table" aria-label="${t[s.labels]}"><tbody><tr>${cells.join('')}</tr></tbody></table>`,
    );
  }
  $('notes-strip').innerHTML = tables.join('');
  $('playback-hint').textContent = positionSequence(s, practiceFocus()).complete
    ? t.playbackHint
    : t.partialPosition;
  $('orientation').textContent = s.hand === 'left' ? t.nutRight : t.nutLeft;
  $('pattern-info').textContent = patternInfo.allCount
    ? `${t.patterns} · ${t.patternSystems[patternInfo.system]} · ${t.patternToggleHint}${patternInfo.patterns.length < patternInfo.allCount ? ` ${t.morePatterns}` : ''}`
    : t.patternUnavailable;
  $('pattern-system').textContent = patternInfo.allCount
    ? t.patternLabels[patternInfo.system]
    : t.patternUnavailable;
  $('pattern-more').hidden =
    !patternInfo.allCount || patternInfo.patterns.length >= patternInfo.allCount;
  $('pattern-more').textContent = t.morePatterns;
  const summary = patternSummary(s, currentPattern());
  $('pattern-summary').hidden = !summary;
  $('pattern-summary').innerHTML = summary
    ? `<strong>${escape(summary.title)}</strong><span>${escape(summary.detail)}</span>`
    : '';
  $('key-spelling-hint').hidden = s.spelling !== 'key';
  renderDrone();
  $('neck-octave-label').textContent = state.hand === 'left' ? '12–0' : '0–12';
  document
    .querySelectorAll('input[name="neck-view"]')
    .forEach((input) => (input.checked = input.value === neckView));
  renderBoard();
  $('degrees-hint').hidden = s.labels !== 'degrees';
  saveURL();
}
function changeRange(id) {
  range = id;
  inspectedNote = inspectedPitch = null;
  stopAudio();
  persist();
  status('');
  $('share-fallback').hidden = true;
  renderContent();
}
function togglePattern(id) {
  if (!currentPattern(id)) return;
  changeRange(range === id ? 'full' : id);
  $('board').querySelector(`[data-pattern="${id}"]`)?.focus({ preventScroll: true });
}
$('neck-view').addEventListener('change', (event) => {
  neckView = event.target.value === 'full' ? 'full' : 'octave';
  update({});
});
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
$('board').addEventListener('scroll', () => {
  const board = $('board');
  if (board.clientWidth === boardWidth)
    boardRightOffset = board.scrollWidth - board.clientWidth - board.scrollLeft;
});
new ResizeObserver(() => {
  const board = $('board');
  if (board.clientWidth === boardWidth) return;
  boardWidth = board.clientWidth;
  // Preserve the visible position measured from the nut side of a left-handed neck.
  if (range !== 'full' && board.scrollWidth > board.clientWidth) revealPattern();
  else if (state.hand === 'left')
    board.scrollLeft = board.scrollWidth - board.clientWidth - boardRightOffset;
  boardRightOffset = board.scrollWidth - board.clientWidth - board.scrollLeft;
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
        `<label><span></span><input id="string-pitch-${i}" data-string-pitch value="${midiName(m, s.spelling === 'flat' ? 'flat' : 'sharp')}" autocomplete="off" spellcheck="false" aria-describedby="tuning-error"></label>`,
    )
    .join('');
  renderTuningLabels();
}
function renderExport({ resetStatus = true } = {}) {
  if (exporting) return;
  if (resetStatus) $('export-status').textContent = '';
  const s = selection(state),
    t = copy[state.lang];
  const familyOption = $('scope').querySelector('[value=family]');
  familyOption.disabled = s.scaleData.family === 'custom';
  if (familyOption.disabled && $('scope').value === 'family')
    $('scope').value = 'selected';
  const selected = $('scope').value === 'selected';
  $('all-keys-control').hidden = !selected;
  $('export-keys-hint').hidden = selected;
  const allKeys = selected && $('all-keys').checked,
    estimate = exportPreview(state, { scope: $('scope').value, allKeys });
  $('export-estimate').textContent =
    `${estimate.pages} ${t.pages} · ${estimate.count} ${estimate.count === 1 ? t.scaleMap : t.scaleMaps}`;
}
function render() {
  const t = copy[state.lang],
    s = selection(state);
  document.documentElement.lang = LANGUAGES[state.lang].tag;
  document.title = t.pageTitle;
  document.querySelector('meta[name=description]').content = t.metaDescription;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t[el.dataset.i18n] ?? el.textContent;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t[el.dataset.i18nAria]);
  });
  const arpeggio = s.scaleData.family === 'arpeggio';
  $('play-label').textContent = playing ? t.stop : arpeggio ? t.playArpeggio : t.play;
  document.querySelectorAll('[data-i18n="root"]').forEach((el) => {
    el.textContent = arpeggio ? t.chordRoot : t.root;
  });
  $('root-hint').textContent = arpeggio ? t.chordRootHint : t.rootHint;
  $('degrees-hint').textContent = arpeggio ? t.chordDegreesHint : t.degreesHint;
  $('play').title = $('play-label').textContent;
  $('language').value = state.lang;
  $('search').placeholder = t.searchPlaceholder;
  for (const name of ['instrument', 'labels'])
    document
      .querySelectorAll(`input[name="${name}"]`)
      .forEach((input) => (input.checked = input.value === state[name]));
  $('strings').innerHTML = options(
    (state.instrument === 'guitar' ? [6, 7] : [4, 5, 6]).map((n) => [n, n]),
    state.strings,
  );
  for (const id of ['hand', 'frets', 'spelling']) $(id).value = String(state[id]);
  $('tuning').innerHTML = options(
    [
      ...TUNINGS.filter(
        (v) => v.instrument === state.instrument && v.strings === state.strings,
      ).map((v) => [v.id, tuningName(v)]),
      ['custom', t.custom],
    ],
    tuningDraft ? 'custom' : state.tuning,
  );
  $('preset-notes').innerHTML =
    `<small class="sr-only">${t.openStrings}</small>${s.tuningData.notes.map((m) => midiName(m, pitchPreference(state))).join(' – ')}`;
  $('root').innerHTML =
    state.spelling === 'key'
      ? options(
          [
            ...new Set([
              'C',
              'C#',
              'Db',
              'D',
              'D#',
              'Eb',
              'E',
              'F',
              'F#',
              'Gb',
              'G',
              'G#',
              'Ab',
              'A',
              'A#',
              'Bb',
              'B',
              rootName(s).replaceAll('♯', '#').replaceAll('♭', 'b'),
            ]),
          ].map((tonic) => [tonic, prettyDegree(tonic)]),
          rootName(s).replaceAll('♯', '#').replaceAll('♭', 'b'),
        )
      : options(
          Array.from({ length: 12 }, (_, i) => [
            i,
            SHARPS[i] === FLATS[i] ? SHARPS[i] : `${SHARPS[i]} / ${FLATS[i]}`,
          ]),
          state.root,
        );
  $('allNotes').checked = state.allNotes;
  $('custom-tuning').hidden = !tuningDraft;
  if (tuningDraft) renderTuningLabels();
  $('edit-pitches').hidden = tuningDraft || state.tuning !== 'custom';
  $('preset-notes').hidden = tuningDraft;
  if (!formulaDirty) $('formula-input').value = s.scaleData.formula.join(' ');
  $('apply-scale').hidden = !formulaDirty;
  renderScalePicker();
  renderContent();
  renderExport();
}
function update(values, { setup = false } = {}) {
  inspectedNote = inspectedPitch = null;
  stopAudio();
  const previous = state;
  state = changeSetup(state, values, saved);
  if (
    previous.root !== state.root ||
    previous.instrument !== state.instrument ||
    previous.strings !== state.strings ||
    previous.tuning !== state.tuning ||
    previous.customTuning !== state.customTuning
  )
    stopTonic();
  persist();
  status('');
  $('share-fallback').hidden = true;
  $('setup-status').textContent = '';
  render();
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
function applyScale() {
  try {
    parseFormula($('formula-input').value);
    validationMessage('formula-error');
    $('formula-input').removeAttribute('aria-invalid');
    formulaDirty = false;
    update({ scale: 'custom', formula: $('formula-input').value });
    $('formula-input').focus({ preventScroll: true });
  } catch {
    validationMessage('formula-error', 'formulaHint');
    $('formula-input').setAttribute('aria-invalid', 'true');
    $('formula-input').focus();
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
function visibleNotes() {
  return boardModel(state, { hi: neckView === 'full' ? state.frets : 12 }).points;
}
function positionNotes() {
  return visibleNotes().filter(isHighlighted);
}
function renderNoteReadout(note = inspectedNote, location = true) {
  const t = copy[state.lang];
  if (!note) {
    const empty = !positionNotes().some((point) => point.active);
    $('play-hint').hidden = !empty;
    $('note-readout-text').textContent = empty ? t.emptyRange : '';
    return;
  }
  $('play-hint').hidden = false;
  const details = [
    spelledMidiName(note.midi, state),
    note.degree
      ? intervalName(note.degree, state.lang)
      : selection(state).scaleData.family === 'arpeggio'
        ? t.outsideChord
        : t.outsideScale,
  ];
  if (location) {
    details.push(
      `${t.string.toLowerCase()} ${note.string}`,
      `${t.fret.toLowerCase()} ${note.fret}`,
    );
    if (!note.visible) details.push(t.noteOutsideRange);
  }
  $('note-readout-text').textContent = details.join(' · ');
}
function highlightSelection() {
  $('board')
    .querySelectorAll('[data-midi]')
    .forEach((note) =>
      note.classList.toggle(
        'selected-pitch',
        inspectedPitch !== null && Number(note.dataset.midi) % 12 === inspectedPitch,
      ),
    );
  $('notes-strip')
    .querySelectorAll('[data-pitch]')
    .forEach((el) => {
      const selected = Number(el.dataset.pitch) === inspectedPitch;
      el.classList.toggle('selected-pitch', selected);
      if (el.matches('button')) el.setAttribute('aria-pressed', String(selected));
    });
}
function inspectNote(note) {
  inspectedNote = note;
  inspectedPitch = note.midi % 12;
  highlightSelection();
  renderNoteReadout();
}
function highlightPitch(midi, point = null) {
  soundingMidi = midi;
  soundingPoint = point;
  document.querySelectorAll('.sounding').forEach((el) => el.classList.remove('sounding'));
  if (midi === null) {
    renderNoteReadout();
    return;
  }
  const boardSelector = point
    ? `#board [data-row="${point.row}"][data-fret="${point.fret}"]`
    : `#board [data-midi="${midi}"]`;
  document
    .querySelectorAll(`${boardSelector}, #notes-strip td[data-pitch="${midi % 12}"]`)
    .forEach((el) => el.classList.add('sounding'));
  if (playbackMode === 'sequence') {
    const note = point ?? positionNotes().find((note) => note.midi === midi);
    if (note) renderNoteReadout({ ...note, visible: true }, Boolean(point));
  }
}
function stopAudio() {
  playbackVersion++;
  playing = false;
  playbackMode = null;
  instrumentAudio?.stop();
  clearTimeout(playTimer);
  highlightPitch(null);
  const t = copy[state.lang];
  $('play-label').textContent =
    selection(state).scaleData.family === 'arpeggio' ? t.playArpeggio : t.play;
  $('play').title = $('play-label').textContent;
  $('play').classList.remove('playing');
}
function renderDrone() {
  const t = copy[state.lang];
  const chord = selection(state).scaleData.family === 'arpeggio';
  $('drone-label').textContent = chord
    ? droneEnabled
      ? t.stopDroneRoot
      : t.droneRoot
    : droneEnabled
      ? t.stopDrone
      : t.drone;
  $('drone').setAttribute('aria-pressed', String(droneEnabled));
}
function stopTonic() {
  droneVersion++;
  droneEnabled = false;
  instrumentAudio?.stopDrone();
  renderDrone();
}
async function toggleDrone() {
  if (droneEnabled) {
    stopTonic();
    return;
  }
  const version = ++droneVersion;
  droneEnabled = true;
  renderDrone();
  status('');
  try {
    const player = await audioPlayer();
    if (version !== droneVersion || !droneEnabled) return;
    if (document.hidden) {
      stopTonic();
      return;
    }
    player.startDrone((state.instrument === 'bass' ? 36 : 48) + state.root, {
      instrument: state.instrument,
    });
  } catch {
    if (version !== droneVersion) return;
    stopTonic();
    status(copy[state.lang].audioUnavailable, true);
  }
}
async function startPlayback(midi) {
  stopAudio();
  const version = playbackVersion,
    snapshot = { ...state };
  const route = midi === undefined ? currentPattern()?.sequence : null;
  const notes = route
    ? route.map((point) => point.midi)
    : midi === undefined
      ? positionSequence(snapshot, practiceFocus()).notes
      : [midi];
  if (!notes.length) {
    status(copy[state.lang].emptyRange);
    return;
  }
  status('');
  playing = true;
  playbackMode = midi === undefined ? 'sequence' : 'note';
  $('play-label').textContent = copy[state.lang].stop;
  $('play').title = copy[state.lang].stop;
  $('play').classList.add('playing');
  try {
    const player = await audioPlayer();
    if (version !== playbackVersion) return;
    for (const note of new Set(notes)) player.buffer(note, snapshot.instrument);
    const step = 60 / tempo;
    const duration =
      midi === undefined
        ? Math.min(step * 0.9, snapshot.instrument === 'bass' ? 0.95 : 0.78)
        : STRING_SOUNDS[snapshot.instrument].seconds;
    let start, end;
    function schedulePass() {
      start = player.context.currentTime + 0.025;
      notes.forEach((note, index) => {
        end = player.play(note, {
          instrument: snapshot.instrument,
          when: start + index * step,
          duration,
        });
      });
    }
    function followAudio() {
      if (version !== playbackVersion) return;
      const now = player.context.currentTime;
      if (now >= end) {
        if (soundingMidi !== null) highlightPitch(null);
        if (midi !== undefined || !$('repeat').checked) {
          stopAudio();
          return;
        }
        if (now >= end + step) schedulePass();
      }
      const index = Math.floor((now - start) / step);
      const stepIndex = Math.max(0, Math.min(notes.length - 1, index));
      const pitch = now < end ? (notes[stepIndex] ?? null) : null;
      const point = pitch === null ? null : (route?.[stepIndex] ?? null);
      if (pitch !== soundingMidi || point !== soundingPoint) highlightPitch(pitch, point);
      playTimer = setTimeout(followAudio, 25);
    }
    schedulePass();
    followAudio();
  } catch {
    if (version === playbackVersion) {
      stopAudio();
      status(copy[state.lang].audioUnavailable, true);
    }
  }
}
function playNote(midi, element) {
  const note = visibleNotes().find(
    (point) =>
      point.midi === midi &&
      (!element ||
        (point.row === Number(element.dataset.row) &&
          point.fret === Number(element.dataset.fret))),
  );
  if (note)
    inspectNote({
      ...note,
      visible: isHighlighted(note),
    });
  startPlayback(midi);
}
$('notes-strip').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-pitch]');
  if (!button) return;
  const pitch = Number(button.dataset.pitch);
  let note = positionNotes()
    .filter((point) => point.pc === pitch)
    .sort((a, b) => a.midi - b.midi)[0];
  const visible = Boolean(note);
  note ??= visibleNotes()
    .filter((point) => point.pc === pitch)
    .sort((a, b) => a.midi - b.midi)[0];
  if (!note) return;
  inspectNote({ ...note, visible });
  startPlayback(note.midi);
});
$('board').addEventListener('focusin', (event) => {
  const note = event.target.closest('[data-midi]');
  if (!note) return;
  const point = visibleNotes().find(
    (point) =>
      point.row === Number(note.dataset.row) && point.fret === Number(note.dataset.fret),
  );
  if (point)
    inspectNote({
      ...point,
      visible: isHighlighted(point),
    });
});
$('tempo').addEventListener('input', () => {
  tempo = Number($('tempo').value);
  $('tempo-value').value = `${tempo} BPM`;
  $('tempo').setAttribute('aria-valuetext', `${tempo} BPM`);
  if (playing && playbackMode === 'sequence') startPlayback();
});
$('play').addEventListener('click', () => {
  if (playing) stopAudio();
  else startPlayback();
});
$('drone').addEventListener('click', toggleDrone);
const stopAllAudio = () => {
  stopAudio();
  stopTonic();
};
window.addEventListener('pagehide', stopAllAudio);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopAllAudio();
});
$('jump-to-board').addEventListener('click', (event) => {
  event.preventDefault();
  $('scale-title').focus({ preventScroll: true });
  $('fretboard').scrollIntoView({ block: 'start' });
});
enableBoardNavigation($('board'), playNote);
$('instrument').addEventListener('change', (event) => {
  tuningDraft = false;
  validationMessage('tuning-error');
  update({ instrument: event.target.value }, { setup: true });
});
$('strings').addEventListener('change', () => {
  tuningDraft = false;
  validationMessage('tuning-error');
  update({ strings: $('strings').value }, { setup: true });
});
for (const id of ['hand', 'frets', 'spelling'])
  $(id).addEventListener('change', () => update({ [id]: $(id).value }));
$('root').addEventListener('change', () => {
  const root = $('root').value;
  update(
    state.spelling === 'key'
      ? { root: parseNote(`${root}4`) % 12, tonic: root }
      : { root },
  );
});
$('labels').addEventListener('change', (event) => update({ labels: event.target.value }));
$('tuning').addEventListener('change', () => {
  if ($('tuning').value === 'custom') editTuning();
  else {
    tuningDraft = false;
    validationMessage('tuning-error');
    update({ tuning: $('tuning').value });
  }
});
function editTuning() {
  tuningDraft = true;
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
$('formula-input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    applyScale();
  }
});
$('scale-results').addEventListener('click', (event) => {
  const button = event.target.closest('[data-scale]');
  if (button) {
    formulaDirty = false;
    validationMessage('formula-error');
    $('formula-input').removeAttribute('aria-invalid');
    update({ scale: button.dataset.scale });
  }
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
$('search').addEventListener('keydown', (event) => {
  if (event.isComposing) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    $('clear-search').click();
  }
  if (event.key === 'ArrowDown' || (event.key === 'Enter' && search.trim())) {
    event.preventDefault();
    const buttons = $('scale-results').querySelectorAll('[data-scale]');
    if (event.key === 'Enter' && buttons.length === 1) buttons[0].click();
    else if (buttons.length) {
      buttons.forEach((button, index) => (button.tabIndex = index === 0 ? 0 : -1));
      buttons[0].focus();
    }
  }
});
$('scale-tabs').addEventListener('click', (event) => {
  const button = event.target.closest('[data-view]');
  if (button) {
    view = button.dataset.view;
    search = '';
    $('search').value = '';
    renderScalePicker();
    $('scale-results').scrollTop = 0;
  }
});
$('apply-tuning').addEventListener('click', applyTuning);
$('cancel-tuning').addEventListener('click', cancelTuning);
$('apply-scale').addEventListener('click', applyScale);
$('formula-input').addEventListener('input', () => {
  formulaDirty = true;
  $('apply-scale').hidden = false;
  validationMessage('formula-error');
  $('formula-input').removeAttribute('aria-invalid');
});
$('clear-search').addEventListener('click', () => {
  search = '';
  $('search').value = '';
  renderScalePicker();
  $('scale-results').scrollTop = 0;
  $('search').focus();
});
$('instrument-form').addEventListener('submit', (event) => event.preventDefault());
$('search').addEventListener('input', () => {
  search = $('search').value;
  renderScalePicker();
  $('scale-results').scrollTop = 0;
});
$('language').addEventListener('change', () => update({ lang: $('language').value }));
$('allNotes').addEventListener('change', () =>
  update({ allNotes: $('allNotes').checked }),
);
$('share').addEventListener('click', async () => {
  saveURL();
  const url = new URL(location.href);
  url.hash = '';
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
$('scope').addEventListener('change', renderExport);
$('all-keys').addEventListener('change', renderExport);
function loadScript(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = path;
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
$('export').addEventListener('click', async () => {
  if (exporting) return;
  renderExport();
  const snapshot = { ...state },
    scope = $('scope').value,
    allKeys = scope === 'selected' && $('all-keys').checked,
    t = copy[snapshot.lang];
  const controller = new AbortController();
  exporting = controller;
  $('export').disabled = true;
  $('scope').disabled = true;
  $('all-keys').disabled = true;
  $('cancel-export').hidden = false;
  $('export-status').textContent = t.exporting;
  try {
    await ensurePdf();
    const bytes = await createAtlas(snapshot, {
      scope,
      allKeys,
      signal: controller.signal,
      progress: (n, total) => {
        $('export-status').textContent = `${t.exporting} · ${n} / ${total}`;
      },
    });
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })),
      link = document.createElement('a');
    link.href = url;
    link.download = `scales-${snapshot.instrument}-${snapshot.strings}-${snapshot.tuning}-${snapshot.scale}-${rootName(snapshot).replaceAll('♯', 'sharp').replaceAll('♭', 'flat').replaceAll('/', '-')}-${snapshot.hand}-${snapshot.lang}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    $('export-status').textContent = t.ready;
  } catch (error) {
    $('export-status').textContent =
      error.name === 'AbortError' ? t.cancelled : t.exportFailed;
  } finally {
    $('export').disabled = false;
    $('scope').disabled = false;
    $('all-keys').disabled = false;
    $('cancel-export').hidden = true;
    exporting = null;
    renderExport({ resetStatus: sharedState(snapshot) !== sharedState(state) });
  }
});
$('cancel-export').addEventListener('click', () => exporting?.abort());
persist();
render();
