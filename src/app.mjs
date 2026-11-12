import {
  TUNINGS,
  selection,
  rootName,
  spellScale,
  prettyDegree,
  midiName,
  PALETTE,
  SHARPS,
  FLATS,
  parseNote,
  parseTuning,
  parseFormula,
  sharedState,
  scaleMidiSequence,
  pitchPreference,
} from './music.mjs';
import { PluckedStringPlayer, STRING_SOUNDS } from './string-audio.mjs';
import { GUIDED_BOOKS, matchingGuides } from './guides.mjs';
import { scaleGroups, initialScaleView } from './scale-picker.mjs';
import {
  readPreferences,
  restoreWorkspace,
  rememberWorkspace,
  changeSetup,
  exportPreview,
  scaleName,
} from './workspace.mjs';
import { FAMILIES } from './catalog.mjs';
import { copy } from './i18n.mjs';
import { boardSvg, escape } from './board.mjs';
import { enableBoardNavigation } from './board-navigation.mjs';
import { createAtlas } from './pdf.mjs';
const STORAGE_KEY = 'scales.preferences.v1';
let saved = {};
try {
  saved = readPreferences(localStorage.getItem(STORAGE_KEY));
} catch {}
const query = new URLSearchParams(location.search);
let state = restoreWorkspace(Object.fromEntries(query), saved);
const positions = [
  [0, 4],
  [3, 7],
  [5, 9],
  [8, 12],
];
const rangeIds = [
  'full',
  'lower',
  'upper',
  ...positions.map(([lo, hi]) => `${lo}-${hi}`),
];
// Older shared setups described the entire neck. New phone sessions start in open position.
const startingRange = query.has('frets')
  ? 'full'
  : matchMedia('(max-width: 560px)').matches
    ? '0-4'
    : 'lower';
let range = rangeIds.includes(query.get('range')) ? query.get('range') : startingRange;
let boardWidth;

let view = initialScaleView(state.scale),
  search = '',
  instrumentAudio,
  playing = false,
  playbackVersion = 0,
  soundingMidi = null,
  playTimer,
  exporting,
  pdfLibraries,
  tuningDraft = false;
const $ = (id) => document.getElementById(id);
const options = (items, current) =>
  items
    .map(
      ([value, label]) =>
        `<option value="${escape(value)}" ${String(value) === String(current) ? 'selected' : ''}>${escape(label)}</option>`,
    )
    .join('');
const tuningName = (tuning) =>
  state.lang === 'pt' ? tuning.name.replace('standard', 'padrão') : tuning.name;
function persist() {
  saved = rememberWorkspace(saved, state);
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
  history.replaceState(null, '', `${location.pathname}?${params}${location.hash}`);
}
function configuration() {
  const s = selection(state),
    t = copy[state.lang];
  return `${t[s.instrument]} · ${s.strings} ${t.strings.toLowerCase()} · ${tuningName(s.tuningData)} · ${t[s.hand]} · ${s.frets} ${t.frets.toLowerCase()}`;
}
function openDialog(id, trigger) {
  const dialog = $(id);
  dialog.returnFocus = trigger ?? document.activeElement;
  if (id === 'scale-dialog') {
    view = initialScaleView(state.scale);
    search = '';
    $('search').value = '';
    $('formula-input').value = selection(state).scaleData.formula.join(' ');
    $('formula-error').textContent = '';
    $('formula-input').removeAttribute('aria-invalid');
    showScaleEditor(false);
    renderScalePicker();
  }
  if (id === 'export-dialog') renderExport();
  dialog.showModal();
  dialog.querySelector('.dialog-body').scrollTop = 0;
  if (id === 'scale-dialog') $('search').focus({ preventScroll: true });
  else if (id === 'instrument-dialog')
    document
      .querySelector('input[name=instrument]:checked')
      .focus({ preventScroll: true });
  else if (id === 'display-dialog') $('spelling').focus({ preventScroll: true });
  else $('scope').focus({ preventScroll: true });
}
function closeDialog(dialog) {
  if (dialog.id === 'instrument-dialog' && tuningDraft) {
    $('tuning-error').textContent = copy[state.lang].closeEditorHint;
    $('tuning-fields').querySelector('input')?.focus();
    return;
  }
  dialog.close();
}
document
  .querySelectorAll('[data-open]')
  .forEach((button) =>
    button.addEventListener('click', () => openDialog(button.dataset.open, button)),
  );
document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeDialog(dialog);
  });
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]')) closeDialog(dialog);
  });
  dialog.addEventListener('close', () =>
    dialog.returnFocus?.focus({ preventScroll: true }),
  );
});
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
  $('scale-results').innerHTML = groups.length
    ? groups.map(scaleGroupMarkup).join('')
    : `<div class="empty-results"><strong>${t.noResults}</strong><p>${t.retrySearch}</p></div>`;
  const buttons = [...$('scale-results').querySelectorAll('[data-scale]')],
    entry =
      (!searching && buttons.find((button) => button.dataset.scale === state.scale)) ||
      buttons[0];
  buttons.forEach((button) => (button.tabIndex = button === entry ? 0 : -1));
  const selected = selection(state).scaleData;
  $('scale-selection').textContent =
    `${t.currentScale} · ${rootName(state)} ${scaleName(selected, state.lang)}`;
}
function showScaleEditor(editing) {
  const t = copy[state.lang];
  $('scale-catalog').hidden = editing;
  $('custom-scale').hidden = !editing;
  $('scale-selection').hidden = editing;
  $('apply-scale').hidden = !editing;
  $('scale-heading').textContent = editing ? t.customScaleTitle : t.chooseScale;
  $('custom-scale-toggle').setAttribute('aria-expanded', String(editing));
  $('custom-scale-toggle').textContent = editing
    ? t.backToScales
    : state.scale === 'custom'
      ? t.editScale
      : t.createScale;
}
function guideCard({ instrument, strings, tuning, lang, hand, pages, file }) {
  const t = copy[state.lang];
  const preset = TUNINGS.find((item) => item.id === tuning);
  const title = `${t[instrument]} · ${tuningName(preset)}`;
  const edition = `${strings} ${t.strings.toLowerCase()} · ${t[hand]} · ${t[lang]}`;
  return `<li class="guide-edition">
    <div><strong>${escape(title)}</strong><p>${escape(edition)}</p><small>A4 · ${pages} ${t.pages}</small></div>
    <a href="./guides/${file}" download aria-label="${escape(`${t.pdf} · ${title} · ${edition}`)}">${t.pdf}</a>
  </li>`;
}
function bookCards() {
  const t = copy[state.lang];
  const setup = selection(state);
  const matches = matchingGuides(state);
  const others = GUIDED_BOOKS.filter((book) => !matches.includes(book)).sort(
    (a, b) => Number(b.lang === state.lang) - Number(a.lang === state.lang),
  );
  $('books-configuration').textContent =
    `${t[setup.instrument]} · ${setup.strings} ${t.strings.toLowerCase()} · ${tuningName(setup.tuningData)} · ${t[setup.hand]} · ${t[setup.lang]}`;
  $('books-match').textContent = matches.length ? t.matchingEdition : t.noMatchingBook;
  $('book-export').hidden = matches.length > 0;
  $('books-matched').hidden = matches.length === 0;
  $('books-matched').innerHTML = matches.map(guideCard).join('');
  $('books-browse').textContent =
    `${matches.length ? t.otherEditions : t.allEditions} (${others.length})`;
  $('books-other').innerHTML = others.map(guideCard).join('');
}
function fretBounds(id) {
  if (id === 'full') return [0, state.frets];
  if (id === 'upper') return [12, state.frets];
  if (id === 'lower') return [0, 12];
  return id.split('-').map(Number);
}
function renderBoard() {
  const board = $('board');
  const [lo, hi] = fretBounds(range);
  const width = Math.max(board.clientWidth, 72 + (hi - lo + 1) * 45);
  const height = 74 + (state.strings - 1) * 31;
  const setup = [
    state.instrument,
    state.strings,
    state.tuning,
    state.customTuning,
    state.hand,
    state.frets,
    range,
  ].join('|');
  const reset = board.dataset.setup !== setup;
  const scroll = board.scrollLeft;
  const active = board.contains(document.activeElement)
    ? document.activeElement.dataset
    : null;
  boardWidth = board.clientWidth;
  board.style.setProperty('--board-width', `${width}px`);
  board.innerHTML = boardSvg(state, { lo, hi, width, height });
  if (soundingMidi !== null) highlightPitch(soundingMidi);
  board.dataset.setup = setup;
  board.scrollLeft = reset
    ? state.hand === 'left'
      ? board.scrollWidth - board.clientWidth
      : 0
    : scroll;
  if (active?.fret) {
    const note =
      board.querySelector(`[data-row="${active.row}"][data-fret="${active.fret}"]`) ??
      board.querySelector('[tabindex="0"]');
    note?.focus({ preventScroll: true });
  }
  $('scroll-hint').hidden = width <= board.clientWidth;
  $('play-hint').querySelector('[data-i18n="tapNote"]').textContent = board.querySelector(
    '.note:not(.outside)',
  )
    ? copy[state.lang].tapNote
    : copy[state.lang].emptyRange;
}
function renderContent() {
  const s = selection(state),
    t = copy[state.lang],
    names = spellScale(s);
  $('family-label').textContent = FAMILIES[s.scaleData.family]?.[s.lang] ?? t.custom;
  $('note-count').textContent =
    `${names.length} ${names.length === 1 ? t.singleNote : t.noteCount}`;
  $('scale-title').textContent = `${rootName(s)} ${scaleName(s.scaleData, s.lang)}`;
  $('scale-value').textContent = scaleName(s.scaleData, s.lang);
  // Keep the pitch and its degree in the same column, including long chromatic formulas.
  const tables = [];
  for (let start = 0; start < names.length; start += 7) {
    const group = names.slice(start, start + 7);
    const notes = [],
      degrees = [];
    for (const [index, name] of group.entries()) {
      const pitch = (s.root + s.scaleData.intervals[start + index]) % 12;
      notes.push(
        `<td data-pitch="${pitch}"><i aria-hidden="true" class="color-dot" style="background:${PALETTE[pitch] ?? '#fff'}"></i>${escape(name).replace('/', '/<wbr>')}</td>`,
      );
      degrees.push(
        `<td data-pitch="${pitch}">${prettyDegree(s.scaleData.formula[start + index])}</td>`,
      );
    }
    tables.push(
      `<table class="tone-table"><tbody><tr><th scope="row">${t.notes}</th>${notes.join('')}</tr><tr><th scope="row">${t.degrees}</th>${degrees.join('')}</tr></tbody></table>`,
    );
  }
  $('notes-strip').innerHTML = tables.join('');
  $('tuning-description').textContent = s.tuningData.notes
    .map((m) => midiName(m, pitchPreference(s)))
    .join(' · ');
  $('orientation').textContent = s.hand === 'left' ? t.nutRight : t.nutLeft;
  $('fret-range').innerHTML = options(
    rangeIds.map((id) => {
      const [lo, hi] = fretBounds(id);
      return [id, id === 'full' ? `${t.fullNeck} (0–${hi})` : `${t.range} ${lo}–${hi}`];
    }),
    range,
  );
  renderBoard();
  $('positions').innerHTML = positions
    .map(
      ([lo, hi]) =>
        `<button type="button" class="position" data-range="${lo}-${hi}" aria-controls="board" aria-pressed="${range === `${lo}-${hi}`}"><span class="position-label">${t.range} ${lo}–${hi}<svg class="icon" aria-hidden="true"><use href="./assets/controls.svg#arrow"></use></svg></span>${boardSvg({ ...s, allNotes: false }, { lo, hi, width: 400, height: s.strings === 7 ? 175 : 150, small: true })}</button>`,
    )
    .join('');
  $('degrees-hint').hidden = s.labels !== 'degrees';
  saveURL();
}
function changeRange(id) {
  range = id;
  stopAudio();
  status('');
  $('share-fallback').hidden = true;
  renderContent();
}
$('fret-range').addEventListener('change', (event) => changeRange(event.target.value));
$('positions').addEventListener('click', (event) => {
  const button = event.target.closest('[data-range]');
  if (!button) return;
  changeRange(button.dataset.range);
  const entry = $('board').querySelector('[tabindex="0"]') ?? $('fret-range');
  entry.focus({ preventScroll: true });
  $('board').scrollIntoView({ block: 'center', inline: 'nearest' });
});
new ResizeObserver(() => {
  if ($('board').clientWidth !== boardWidth) renderBoard();
}).observe($('board'));
function renderTuningFields() {
  const s = selection(state),
    t = copy[state.lang];
  $('tuning-fields').innerHTML = s.tuningData.notes
    .map(
      (m, i) =>
        `<label><span>${t.string} ${s.strings - i}${i === 0 ? ` · ${t.lowest}` : i === s.strings - 1 ? ` · ${t.highest}` : ''}</span><input id="string-pitch-${i}" data-string-pitch value="${midiName(m, s.spelling === 'flat' ? 'flat' : 'sharp')}" autocomplete="off" spellcheck="false" aria-describedby="tuning-error" aria-label="${t.string} ${s.strings - i}, ${i === 0 ? t.lowest : i === s.strings - 1 ? t.highest : ''}"></label>`,
    )
    .join('');
}
function renderExport() {
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
  const title =
    $('scope').value === 'catalog'
      ? `${rootName(s)} · ${t.catalogScope}`
      : $('scope').value === 'family'
        ? `${rootName(s)} · ${FAMILIES[s.scaleData.family][s.lang]}`
        : allKeys
          ? `${scaleName(s.scaleData, s.lang)} · ${t.allKeys}`
          : `${rootName(s)} ${scaleName(s.scaleData, s.lang)}`;
  $('export-configuration').innerHTML =
    `<strong>${escape(title)}</strong>${escape(configuration())}<br>${s.tuningData.notes.map((m) => midiName(m, pitchPreference(s))).join(' – ')}<br>${escape(t[s.lang])}`;
  $('export-estimate').textContent =
    `${estimate.pages} ${t.pages} · ${estimate.count} ${estimate.count === 1 ? t.scaleMap : t.scaleMaps}${allKeys ? '' : ` · ${t.currentRoot}: ${rootName(s)}`}`;
}
function render() {
  const t = copy[state.lang],
    s = selection(state);
  document.documentElement.lang = state.lang === 'pt' ? 'pt-BR' : 'en-US';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t[el.dataset.i18n] ?? el.textContent;
  });
  if (playing) $('play-label').textContent = t.stop;
  document
    .querySelectorAll('.close-dialog')
    .forEach((button) => button.setAttribute('aria-label', t.close));
  $('open-display').title = t.display;
  $('language').value = state.lang;
  $('search').placeholder = t.searchPlaceholder;
  $('instrument-summary').textContent =
    `${t[s.instrument]} · ${s.strings} ${t.strings.toLowerCase()}`;
  $('instrument-detail').textContent =
    `${tuningName(s.tuningData)} · ${t[s.hand]} · ${s.frets} ${t.frets.toLowerCase()}`;
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
      ).map((v) => [
        v.id,
        `${tuningName(v)} · ${v.notes.map((m) => midiName(m, 'sharp')).join(' – ')}`,
      ]),
      ['custom', t.custom],
    ],
    tuningDraft ? 'custom' : state.tuning,
  );
  $('preset-notes').innerHTML =
    `<small>${t.openStrings}</small>${s.tuningData.notes.map((m) => midiName(m, pitchPreference(state))).join(' – ')}`;
  $('root').innerHTML = options(
    Array.from({ length: 12 }, (_, i) => [
      i,
      SHARPS[i] === FLATS[i] ? SHARPS[i] : `${SHARPS[i]} / ${FLATS[i]}`,
    ]),
    state.root,
  );
  $('allNotes').checked = state.allNotes;
  $('custom-tuning').hidden = !tuningDraft;
  $('edit-pitches').hidden = tuningDraft || state.tuning !== 'custom';
  $('preset-notes').hidden = tuningDraft;
  renderScalePicker();
  bookCards();
  renderContent();
  renderExport();
}
function update(values, { setup = false } = {}) {
  stopAudio();
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
  $('tuning-error').textContent = '';
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
    $('tuning-error').textContent = copy[state.lang].tuningExample;
    invalid[0].focus();
    return;
  }
  try {
    parseTuning(text, state.strings);
    tuningDraft = false;
    update({ tuning: 'custom', customTuning: text });
    $('tuning-error').textContent = '';
    $('setup-status').textContent = copy[state.lang].tuningApplied;
    $('tuning').focus();
  } catch {
    fields.forEach((field) => field.setAttribute('aria-invalid', 'true'));
    $('tuning-error').textContent = copy[state.lang].tuningOrder;
    fields[0]?.focus();
  }
}
function applyScale() {
  try {
    parseFormula($('formula-input').value);
    $('formula-error').textContent = '';
    $('formula-input').removeAttribute('aria-invalid');
    update({ scale: 'custom', formula: $('formula-input').value });
    closeDialog($('scale-dialog'));
  } catch {
    $('formula-error').textContent = copy[state.lang].formulaHint;
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
function highlightPitch(midi) {
  soundingMidi = midi;
  document.querySelectorAll('.sounding').forEach((el) => el.classList.remove('sounding'));
  if (midi === null) return;
  document
    .querySelectorAll(
      `#board [data-midi="${midi}"], #notes-strip [data-pitch="${midi % 12}"]`,
    )
    .forEach((el) => el.classList.add('sounding'));
}
function stopAudio() {
  playbackVersion++;
  playing = false;
  instrumentAudio?.stop();
  clearTimeout(playTimer);
  highlightPitch(null);
  $('play-label').textContent = copy[state.lang].play;
  $('play').classList.remove('playing');
}
async function startPlayback(midi) {
  stopAudio();
  const version = playbackVersion,
    snapshot = { ...state };
  playing = true;
  $('play-label').textContent = copy[state.lang].stop;
  $('play').classList.add('playing');
  try {
    const player = await audioPlayer();
    if (version !== playbackVersion) return;
    const notes = midi === undefined ? scaleMidiSequence(snapshot) : [midi];
    for (const note of new Set(notes)) player.buffer(note, snapshot.instrument);
    const start = player.context.currentTime + 0.025;
    const step = 0.36;
    const duration =
      midi === undefined
        ? snapshot.instrument === 'bass'
          ? 0.95
          : 0.78
        : STRING_SOUNDS[snapshot.instrument].seconds;
    let end = start;
    notes.forEach((note, i) => {
      end = player.play(note, {
        instrument: snapshot.instrument,
        when: start + i * step,
        duration,
      });
    });
    // Re-read the audio clock after each wake-up, including after background throttling.
    function followAudio() {
      if (version !== playbackVersion) return;
      const now = player.context.currentTime;
      if (now >= end) {
        stopAudio();
        return;
      }
      const index = Math.min(notes.length - 1, Math.floor((now - start) / step));
      const pitch = notes[index] ?? null;
      if (pitch !== soundingMidi) highlightPitch(pitch);
      const next = index === notes.length - 1 ? end : start + (index + 1) * step;
      playTimer = setTimeout(followAudio, Math.max(12, (next - now) * 1000));
    }
    followAudio();
  } catch {
    if (version === playbackVersion) {
      stopAudio();
      status(copy[state.lang].audioUnavailable, true);
    }
  }
}
const playNote = (midi) => startPlayback(midi);
$('play').addEventListener('click', () => {
  if (playing) stopAudio();
  else startPlayback();
});
window.addEventListener('pagehide', stopAudio);
enableBoardNavigation($('board'), playNote);
$('instrument').addEventListener('change', (event) => {
  tuningDraft = false;
  $('tuning-error').textContent = '';
  update({ instrument: event.target.value }, { setup: true });
});
$('strings').addEventListener('change', () => {
  tuningDraft = false;
  $('tuning-error').textContent = '';
  update({ strings: $('strings').value }, { setup: true });
});
for (const id of ['hand', 'frets', 'root', 'spelling'])
  $(id).addEventListener('change', () => update({ [id]: $(id).value }));
$('labels').addEventListener('change', (event) => update({ labels: event.target.value }));
$('tuning').addEventListener('change', () => {
  if ($('tuning').value === 'custom') editTuning();
  else {
    tuningDraft = false;
    $('tuning-error').textContent = '';
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
  $('tuning-error').textContent = '';
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
    update({ scale: button.dataset.scale });
    closeDialog($('scale-dialog'));
  }
});
$('scale-results').addEventListener('keydown', (event) => {
  const buttons = [...$('scale-results').querySelectorAll('[data-scale]')],
    index = buttons.indexOf(event.target);
  if (index < 0) return;
  let next;
  if (event.key === 'ArrowDown') next = Math.min(index + 1, buttons.length - 1);
  if (event.key === 'ArrowUp') next = Math.max(index - 1, 0);
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = buttons.length - 1;
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
    closeDialog($('scale-dialog'));
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
  }
});
$('apply-tuning').addEventListener('click', applyTuning);
$('cancel-tuning').addEventListener('click', cancelTuning);
$('apply-scale').addEventListener('click', applyScale);
$('custom-scale-toggle').addEventListener('click', () => {
  const editing = $('custom-scale').hidden;
  showScaleEditor(editing);
  (editing ? $('formula-input') : $('search')).focus();
});
$('clear-search').addEventListener('click', () => {
  search = '';
  $('search').value = '';
  renderScalePicker();
  $('search').focus();
});
$('instrument-form').addEventListener('submit', (event) => event.preventDefault());
$('search').addEventListener('input', () => {
  search = $('search').value;
  renderScalePicker();
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
  }
});
$('cancel-export').addEventListener('click', () => exporting?.abort());
const booksNav = document.querySelector('.main-nav a[href="#books"]');
const explorerNav = document.querySelector('.main-nav a[href="#explorer"]');
new IntersectionObserver(([entry]) => {
  const active = entry.isIntersecting ? booksNav : explorerNav;
  for (const link of [booksNav, explorerNav]) {
    if (link === active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}).observe($('books'));
persist();
render();
