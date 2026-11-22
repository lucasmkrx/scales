import {
  boardModel,
  layoutBoard,
  noteName,
  fretFill,
  pitchPreference,
} from './music.mjs';
import { copy } from './i18n.mjs';
import { patternRanges } from './pattern-ranges.mjs';

const screenFretColors = {
  open: 'var(--board-open)',
  octave: 'var(--board-octave)',
  marker: 'var(--board-marker)',
  upper: 'var(--board-upper)',
  lower: 'var(--board-lower)',
};
export const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const position = (left, top) => `left:${left}px;top:${top}px`;
const box = (left, top, width, height) =>
  `${position(left, top)};width:${width}px;height:${height}px`;
const labelLines = (label) =>
  String(label)
    .split('/')
    .map((line) => `<span>${escape(line)}</span>`)
    .join('');

function neckMarkup(model, layout, top, small, t) {
  const { lo, hi, rows } = model;
  const parts = [];
  for (let fret = lo; fret <= hi; fret++) {
    const [left, right] = layout.edges(fret);
    const overhang = 12 + (hi - fret) * 0.12;
    const y = top + layout.top - overhang;
    const height = layout.bottom - layout.top + 2 * overhang;
    parts.push(
      `<span class="fret" style="${box(left, y, right - left, height)};background:${fretFill(fret, screenFretColors)}"></span>`,
      `<span class="fret-label" style="${position(layout.center(fret), top + layout.height - 14)}">${escape(fret === 0 ? t.open : fret)}</span>`,
    );
  }
  rows.forEach((midi, row) => {
    const y = top + layout.y(row);
    const gauge = 0.8 + row * 0.14;
    const name = noteName(midi, pitchPreference(model.state));
    parts.push(
      `<span class="board-string" style="${box(layout.left, y - gauge / 2, layout.right - layout.left, gauge)}"></span>`,
      `<span class="string-label" style="${position(layout.labelX, y)}">${labelLines(name)}</span>`,
    );
  });
  if (layout.nut !== null)
    parts.push(
      `<span class="board-nut" style="${box(layout.nut - 2, top + layout.top - 12, 4, layout.bottom - layout.top + 24)}"></span>`,
    );
  return `<div class="neck-details" style="font-size:${small ? 10 : 12}px" aria-hidden="true">${parts.join('')}</div>`;
}

export function boardMarkup(state, options = {}) {
  const model = boardModel(state, options);
  const small = options.small ?? false;
  const height =
    options.height ??
    (small ? 170 : 280) + Math.max(0, model.rows.length - 6) * (small ? 20 : 40);
  const l = layoutBoard(model, { width: options.width ?? 1100, height, small });
  const { points, rows, lo, hi } = model;
  const t = copy[model.state.lang];
  const arpeggio = model.state.scaleData.family === 'arpeggio';
  const bass = model.state.instrument === 'bass';
  const fretLabel = (pattern) =>
    model.state.hand === 'left'
      ? `${pattern.hi}–${pattern.lo}`
      : `${pattern.lo}–${pattern.hi}`;
  const ranges = patternRanges(small ? [] : (options.patterns ?? []), l, {
    labelFor: (pattern) => `${t.pattern} ${pattern.number}`,
    hand: model.state.hand,
  });

  const guideEnd = ranges.height + l.bottom + 12 + (hi - lo) * 0.12;
  const guides = [...ranges.markers]
    .sort(
      (a, b) =>
        Number(a.pattern.id === options.selectedPattern) -
        Number(b.pattern.id === options.selectedPattern),
    )
    .map(({ pattern, left, right, lane }) => {
      const start = lane * 32 + 32;
      return `<span class="pattern-guides${pattern.id === options.selectedPattern ? ' selected' : ''}" data-guide="${escape(pattern.id)}" aria-hidden="true" style="${box(left, start, right - left, guideEnd - start)}"></span>`;
    })
    .join('');
  const markers = ranges.markers
    .map(({ pattern, left, right, hitLeft, hitRight, lane, label }) => {
      const details = [
        bass
          ? `${t.string} ${pattern.startRow + 1}`
          : pattern.shape && t.patternShape.replace('{shape}', pattern.shape),
        `${t.frets} ${fretLabel(pattern)}`,
        `${t.startingDegree} ${pattern.startDegree}`,
      ]
        .filter(Boolean)
        .join(' · ');
      const labelX = (right - left < 90 ? hitLeft + hitRight : left + right) / 2;
      return `<button type="button" class="pattern-range" data-pattern="${escape(pattern.id)}" aria-pressed="${options.selectedPattern === pattern.id}" aria-label="${escape(label)}" aria-description="${escape(details)}" title="${escape(details)}" style="${box(hitLeft, lane * 32 + 4, hitRight - hitLeft, 28)}"><span class="pattern-label" style="left:${labelX - hitLeft}px">${escape(label)}</span><span class="pattern-bracket" style="left:${left - hitLeft}px;width:${right - left}px"></span></button>`;
    })
    .join('');

  const focus =
    options.focusPoints &&
    new Set(options.focusPoints.map((point) => `${point.row}:${point.fret}`));
  const inPattern = (note) =>
    focus
      ? focus.has(`${note.row}:${note.fret}`)
      : !options.focusRange ||
        (note.fret >= options.focusRange.lo && note.fret <= options.focusRange.hi);
  const entry = points.find(inPattern) ?? points[0];
  const rowGap = (l.bottom - l.top) / Math.max(1, rows.length - 1);
  const notes = points.map((n) => {
    const [left, right] = l.edges(n.fret);
    const radius = Math.min(small ? 8 : 16, (right - left) * 0.41, rowGap / 2 - 3.2);
    const muted = !inPattern(n);
    let label = small
      ? n.root
        ? arpeggio
          ? t.chordRootMarker
          : t.rootMarker
        : ''
      : state.labels === 'degrees'
        ? n.degree
        : n.name;
    if (!n.active && state.labels === 'degrees') label = '';
    const size = radius * (label.includes('/') ? 0.76 : label.length > 2 ? 0.85 : 1.05);
    const classes = [small ? 'preview-note' : 'note'];
    if (n.root) classes.push('root-note');
    if (!n.active) classes.push('outside');
    if (muted) classes.push('muted');
    const bounds = box(
      l.center(n.fret) - radius,
      ranges.height + l.y(n.row) - radius,
      radius * 2,
      radius * 2,
    );
    const style = `${bounds};--pitch-fill:${n.fill};--pitch-ink:${n.lightText ? 'white' : 'var(--note-ink)'};font-size:${size}px`;
    const attributes = `class="${classes.join(' ')}" style="${style}"`;
    const content = label ? labelLines(label) : '';
    if (small) return `<span ${attributes}>${content}</span>`;
    const description = [
      n.name,
      n.root ? (arpeggio ? t.chordRoot : t.root) : '',
      n.active ? `${t.degree} ${n.degree}` : arpeggio ? t.outsideChord : t.outsideScale,
      muted ? t.noteOutsideRange : '',
      `${t.string} ${n.string}`,
      n.fret === 0 ? t.open : `${t.fret} ${n.fret}`,
    ]
      .filter(Boolean)
      .join(', ');
    return `<button ${attributes} type="button" tabindex="${n === entry ? 0 : -1}" data-row="${n.row}" data-fret="${n.fret}" data-midi="${n.midi}" aria-label="${escape(description)}">${content}</button>`;
  });

  const accessibility = small
    ? 'aria-hidden="true"'
    : `role="toolbar" aria-label="${escape(t.fretboard)}" aria-describedby="keyboard-notes orientation" data-hand="${model.state.hand}"`;
  return `<div class="fretboard-map" ${accessibility} style="width:${l.width}px;height:${height + ranges.height}px">${neckMarkup(model, l, ranges.height, small, t)}${guides}${markers ? `<div role="group" aria-label="${escape(t.patterns)}">${markers}</div>` : ''}${notes.join('')}</div>`;
}
