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
  open: 'var(--board-open, #ece9dc)',
  octave: 'var(--board-octave, #dddcca)',
  marker: 'var(--board-marker, #ecebdd)',
  upper: 'var(--board-upper, #f5f3e9)',
  lower: 'var(--board-lower, #fcfaf3)',
};
export const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
export function boardSvg(state, options = {}) {
  const model = boardModel(state, options);
  const small = options.small ?? false;
  const height =
    options.height ??
    (small ? 170 : 280) + Math.max(0, model.rows.length - 6) * (small ? 20 : 40);
  const l = layoutBoard(model, { width: options.width ?? 1100, height, small });
  const { points, rows, lo, hi } = model;
  const t = copy[model.state.lang];
  const arpeggio = model.state.scaleData.family === 'arpeggio';
  const ink = 'var(--board-ink, #28372e)';
  const focus =
    options.focusPoints &&
    new Set(options.focusPoints.map((point) => `${point.row}:${point.fret}`));
  const inPattern = (note) =>
    focus
      ? focus.has(`${note.row}:${note.fret}`)
      : !options.focusRange ||
        (note.fret >= options.focusRange.lo && note.fret <= options.focusRange.hi);
  const entry = points.find(inPattern) ?? points[0];
  const el = [];
  const text = (x, y, s, size = 12, fill = ink, weight = 400) =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" fill="${fill}" font-weight="${weight}">${escape(s)}</text>`;
  const labelText = (x, y, label, size, fill, weight) =>
    label.includes('/')
      ? label
          .split('/')
          .map((name, i) =>
            text(x, y + (i ? size * 0.5 : -size * 0.42), name, size * 0.76, fill, weight),
          )
          .join('')
      : text(x, y, label, size, fill, weight);
  for (let f = lo; f <= hi; f++) {
    const [x, z] = l.edges(f);
    const top = l.top - 12 - (hi - f) * 0.12;
    const bottom = l.bottom + 12 + (hi - f) * 0.12;
    el.push(
      `<rect class="fret" x="${x}" y="${top}" width="${z - x}" height="${bottom - top}" fill="${fretFill(f, screenFretColors)}" stroke="var(--board-grid, #b7b8a8)" stroke-width=".8"/>`,
    );
    el.push(
      text(
        l.center(f),
        height - 10,
        f === 0 ? t.open : f,
        small ? 10 : 12,
        'var(--board-ink, #565e51)',
      ),
    );
  }
  rows.forEach((m, row) => {
    el.push(
      `<line class="board-string" x1="${l.left}" x2="${l.right}" y1="${l.y(row)}" y2="${l.y(row)}" stroke="var(--board-string, #959988)" stroke-width="${0.8 + row * 0.14}"/>`,
    );
    el.push(
      labelText(
        l.labelX,
        l.y(row) + 4,
        noteName(m, pitchPreference(model.state)),
        small ? 10 : 12,
        ink,
        650,
      ),
    );
  });
  if (l.nut !== null)
    el.push(
      `<line x1="${l.nut}" x2="${l.nut}" y1="${l.top - 12}" y2="${l.bottom + 12}" stroke="${ink}" stroke-width="4"/>`,
    );
  const noteLayerStart = el.length;
  for (const n of points) {
    const [a, z] = l.edges(n.fret);
    const rowGap = (l.bottom - l.top) / Math.max(1, rows.length - 1);
    const radius = Math.min(small ? 8 : 16, (z - a) * 0.41, rowGap / 2 - 3.2);
    const x = l.center(n.fret),
      y = l.y(n.row);
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
    const muted = !inPattern(n);
    const fill = muted ? 'var(--board-muted-fill, #d2d6d1)' : n.fill;
    const rootInk = muted
      ? 'var(--board-root-muted, #8d9690)'
      : 'var(--board-root-ink, #111111)';
    const fg = muted
      ? 'var(--board-muted-ink, #59645d)'
      : n.lightText
        ? 'white'
        : 'var(--note-ink, #28372e)';
    let interactive = '';
    if (!small) {
      const fret = n.fret === 0 ? t.open : `${t.fret} ${n.fret}`;
      const description = [
        n.name,
        n.root ? (arpeggio ? t.chordRoot : t.root) : '',
        n.active ? `${t.degree} ${n.degree}` : arpeggio ? t.outsideChord : t.outsideScale,
        muted ? t.noteOutsideRange : '',
        `${t.string} ${n.string}`,
        fret,
      ]
        .filter(Boolean)
        .join(', ');
      interactive = ` role="button" tabindex="${n === entry ? 0 : -1}" data-row="${n.row}" data-fret="${n.fret}" data-midi="${n.midi}" aria-label="${escape(description)}"`;
    }
    el.push(
      `<g class="${small ? 'preview-note' : 'note'} ${n.active ? '' : 'outside'}${muted ? ' muted' : ''}"${interactive}><circle cx="${x}" cy="${y}" r="${radius + (n.root ? 2.8 : 0)}" fill="${n.root ? rootInk : fill}" stroke="${n.root ? rootInk : '#8fa2ae'}" stroke-width="${n.root ? 0 : 0.5}"/>${n.root ? `<circle cx="${x}" cy="${y}" r="${radius + 1}" fill="var(--board-root-halo, white)"/>` : ''}<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}"/>${label ? labelText(x, y + (label.includes('/') ? radius * 0.2 : radius * 0.35), label, Math.min(radius * 1.05, label.includes('/') ? radius : label.length > 2 ? radius * 0.85 : 30), fg, 700) : ''}</g>`,
    );
  }
  const ranges = patternRanges(small ? [] : (options.patterns ?? []), l, {
    labelFor: (pattern) => {
      const name =
        model.state.instrument === 'bass'
          ? `${t.string} ${pattern.startRow + 1}`
          : `${t.pattern} ${pattern.number}`;
      const bounds =
        model.state.hand === 'left'
          ? `${pattern.hi}–${pattern.lo}`
          : `${pattern.lo}–${pattern.hi}`;
      return `${name}${pattern.shape ? ` · ${pattern.shape}` : ''} · ${bounds}`;
    },
  });
  const markers = ranges.markers
    .map(({ pattern, left, right, hitLeft, hitRight, lane, label }) => {
      const y = lane * 32 + 4;
      const description = `${label} · ${t.startingDegree} ${pattern.startDegree}`;
      const badge =
        model.state.instrument === 'bass' ? pattern.startRow + 1 : pattern.number;
      const fretLabel =
        model.state.hand === 'left'
          ? `${pattern.hi}–${pattern.lo}`
          : `${pattern.lo}–${pattern.hi}`;
      const bounds = `${pattern.shape ? `${pattern.shape} · ` : ''}${fretLabel}`;
      const narrow = right - left < 90;
      const labelLeft = narrow ? hitLeft : left;
      const labelRight = narrow ? hitRight : right;
      const labelX = (labelLeft + labelRight) / 2;
      return `<g class="pattern-range${narrow ? ' narrow' : ''}" role="button" tabindex="0" data-pattern="${escape(pattern.id)}" aria-pressed="${options.selectedPattern === pattern.id}" aria-label="${escape(description)}" aria-describedby="pattern-info"><rect class="pattern-hit" x="${hitLeft}" y="${y}" width="${hitRight - hitLeft}" height="28"/><text class="pattern-label" x="${labelX}" y="${y + 14}" text-anchor="middle">${escape(`${badge} · ${bounds}`)}</text><path class="pattern-bracket" d="M${left},${y + 28}V${y + 22}H${right}V${y + 28}"/></g>`;
    })
    .join('');
  const guideEnd = ranges.height + l.bottom + 12 + (hi - lo) * 0.12;
  const guides = [...ranges.markers]
    .sort(
      (a, b) =>
        Number(a.pattern.id === options.selectedPattern) -
        Number(b.pattern.id === options.selectedPattern),
    )
    .map(({ pattern, left, right, lane }) => {
      const start = lane * 32 + 32;
      return `<g class="pattern-guides${pattern.id === options.selectedPattern ? ' selected' : ''}" data-guide="${escape(pattern.id)}" aria-hidden="true"><line data-edge="left" x1="${left}" x2="${left}" y1="${start}" y2="${guideEnd}"/><line data-edge="right" x1="${right}" x2="${right}" y1="${start}" y2="${guideEnd}"/></g>`;
    })
    .join('');
  const accessibility = small
    ? 'aria-hidden="true" focusable="false"'
    : `role="toolbar" aria-label="${escape(t.fretboard)}" aria-describedby="keyboard-notes orientation" data-hand="${model.state.hand}"`;
  return `<svg viewBox="0 0 ${l.width} ${height + ranges.height}" xmlns="http://www.w3.org/2000/svg" ${accessibility}><g transform="translate(0 ${ranges.height})">${el.slice(0, noteLayerStart).join('')}</g>${guides}${markers ? `<g role="group" aria-label="${escape(t.patterns)}">${markers}</g>` : ''}<g transform="translate(0 ${ranges.height})">${el.slice(noteLayerStart).join('')}</g></svg>`;
}
