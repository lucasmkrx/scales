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
import { PluckedStringPlayer } from './string-audio.mjs';
import { scalesInFamily, initialScaleFamily } from './scale-picker.mjs';
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
import { boardMarkup, escape } from './board.mjs';
import { enableBackingTracks } from './backing-track-finder.mjs';
import { enableBoardNavigation } from './board-navigation.mjs';
import { enableSlideSwitch } from './slide-switch.mjs';
import { createDropdowns } from './dropdown.mjs';
import { createAtlas } from './pdf.mjs';
import { intervalName } from './intervals.mjs';
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
  const show = s.spelling === 'key' && names.size > 1;
  if (!show && control.contains(document.activeElement))
    $('spelling-trigger').focus({ preventScroll: true });
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
function renderAppearance() {
  const theme = window.scalesTheme;
  if (!theme) return;
  const t = copy[state.lang];
  const label = t.themeLabel
    .replace('{current}', t.themeModes[theme.preference])
    .replace('{next}', t.themeModes[theme.nextPreference]);
  $('theme-toggle').setAttribute('aria-label', label);
  $('theme-toggle').title = label;
  $('theme-mode').textContent = t.themeModes[theme.preference];
  const icon = theme.preference === 'dark' ? 'moon' : 'sun';
  $('theme-icon').className = `icon fa-solid fa-${icon}`;
}
function saveURL() {
  const params = new URLSearchParams(sharedState(state));
  params.set('range', range);
  params.set('neck', neckView);
  history.replaceState(null, '', `${location.pathname}?${params}${location.hash}`);
}
function scaleChoiceMarkup(scale) {
  const selected = state.scale === scale.id;
  const check = selected
    ? '<i class="icon fa-solid fa-check" aria-hidden="true"></i>'
    : '';
  return `<button type="button" class="scale-choice" data-scale="${scale.id}" aria-pressed="${selected}">${escape(scale.name[state.lang])}${check}</button>`;
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
  board.innerHTML = boardMarkup(state, {
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
  if (soundingMidi !== null) highlightSoundingNote(soundingMidi);
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
  $('mobile-scale-title').textContent = $('scale-selection').textContent;
  $('setup-summary').textContent =
    `${t[s.instrument]} · ${s.strings} ${t.strings.toLowerCase()} · ${tuningName(s.tuningData)}`;
  const tones = $('notes-strip');
  tones.setAttribute('aria-label', t[s.labels]);
  tones.innerHTML = names
    .map((name, index) => {
      const pitch = (s.root + s.scaleData.intervals[index]) % 12;
      const degree = s.scaleData.formula[index];
      const label = s.labels === 'degrees' ? prettyDegree(degree) : name;
      const dot =
        s.labels === 'notes'
          ? `<i aria-hidden="true" class="color-dot" style="background:${PALETTE[pitch] ?? '#fff'}"></i>`
          : '';
      return `<button type="button" class="tone-button" data-pitch="${pitch}" aria-pressed="false" aria-label="${escape(`${name} · ${intervalName(degree, s.lang)}`)}">${dot}${escape(label)}</button>`;
    })
    .join('');
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
  $('spelling-hint').textContent =
    s.spelling === 'key' ? t.keySpellingHint : t.spellingHint;
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
  stopNoteAudio();
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
  dropdowns.refresh();
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
  $('spelling').value = state.spelling;
  const pitch = (midi) => midiName(midi, pitchPreference(state));
  $('tuning').value = tuningDraft ? 'custom' : state.tuning;
  $('tuning-name').textContent =
    tuningDraft || state.tuning === 'custom' ? t.custom : tuningName(s.tuningData);
  $('open-string-pitches').innerHTML = s.tuningData.notes
    .map((midi) => `<span>${pitch(midi)}</span>`)
    .join(' ');
  renderKeyTonic(s);
  $('allNotes').checked = state.allNotes;
  $('custom-tuning').hidden = !tuningDraft;
  if (tuningDraft) renderTuningLabels();
  $('edit-pitches').hidden = tuningDraft || state.tuning !== 'custom';
  $('preset-notes').hidden = tuningDraft;
  $('scale-selection').textContent = `${rootName(s)} ${scaleName(s.scaleData, s.lang)}`;
  $('formula-degrees').innerHTML = s.scaleData.formula
    .map((degree) => `<span>${escape(prettyDegree(degree))}</span>`)
    .join(' ');
  $('formula-input').defaultValue = s.scaleData.formula.join(' ');
  renderBackingTracks();
  renderScalePicker();
  renderContent();
  renderExport();
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
function setFormulaEditing(editing) {
  $('formula-overview').hidden = editing;
  $('formula-editor').hidden = !editing;
  $('edit-formula').setAttribute('aria-expanded', String(editing));
  validationMessage('formula-error');
  const input = $('formula-input');
  input.removeAttribute('aria-invalid');
  if (editing) {
    input.value = input.defaultValue;
    $('apply-scale').disabled = true;
    input.focus();
  }
}
function cancelFormula() {
  setFormulaEditing(false);
  $('edit-formula').focus({ preventScroll: true });
}
function applyScale() {
  try {
    parseFormula($('formula-input').value);
    setFormulaEditing(false);
    family = 'custom';
    update({ scale: 'custom', formula: $('formula-input').value });
    $('edit-formula').focus({ preventScroll: true });
  } catch {
    validationMessage('formula-error', 'invalidFormula');
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
  $('board')
    .querySelectorAll('[data-midi]')
    .forEach((note) =>
      note.classList.toggle(
        'selected-pitch',
        inspectedPitch !== null && Number(note.dataset.midi) % 12 === inspectedPitch,
      ),
    );
  $('notes-strip')
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
      `#board [data-midi="${midi}"], #notes-strip button[data-pitch="${midi % 12}"]`,
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
  soundNote(midi);
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
  soundNote(note.midi);
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
$('spelling').addEventListener('change', (event) =>
  update({ spelling: event.target.value }),
);
$('root-picker').addEventListener('change', ({ target }) =>
  update({ root: target.value }),
);
$('key-tonic').addEventListener('change', ({ target }) =>
  update({ tonic: target.value }),
);
$('labels').addEventListener('change', (event) => update({ labels: event.target.value }));
function tuningChoices() {
  const choices = TUNINGS.filter(
    (tuning) =>
      tuning.instrument === state.instrument && tuning.strings === state.strings,
  ).map((tuning) => ({
    value: tuning.id,
    label: tuningName(tuning),
    detail: tuning.notes.map((midi) => midiName(midi, pitchPreference(state))).join(' '),
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
$('edit-formula').addEventListener('click', () => setFormulaEditing(true));
$('cancel-formula').addEventListener('click', cancelFormula);
$('formula-editor').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!$('apply-scale').disabled) applyScale();
});
$('formula-editor').addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    cancelFormula();
  }
});
$('scale-results').addEventListener('click', (event) => {
  const button = event.target.closest('[data-scale]');
  if (button) {
    setFormulaEditing(false);
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
$('scale-family').addEventListener('change', (event) => {
  family = event.target.value;
  renderScalePicker();
});
$('apply-tuning').addEventListener('click', applyTuning);
$('cancel-tuning').addEventListener('click', cancelTuning);
$('formula-input').addEventListener('input', ({ target }) => {
  $('apply-scale').disabled = target.value.trim() === target.defaultValue;
  validationMessage('formula-error');
  $('formula-input').removeAttribute('aria-invalid');
});
$('instrument-form').addEventListener('submit', (event) => event.preventDefault());
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
  dropdowns.refresh();
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
    link.download = `scales-${snapshot.instrument}-${snapshot.strings}-${snapshot.tuning}-${snapshot.scale}-${rootName(snapshot).replaceAll('♯', 'sharp').replaceAll('♭', 'flat')}-${snapshot.hand}-${snapshot.lang}.pdf`;
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
$('theme-toggle').addEventListener('click', () => {
  const theme = window.scalesTheme;
  theme?.setPreference(theme.nextPreference);
});
window.addEventListener('themechange', renderAppearance);
document.querySelectorAll('.setup-switch').forEach(enableSlideSwitch);
persist();
render();
