import {
  boardModel,
  layoutBoard,
  noteName,
  fretFill,
  pitchPreference,
} from './music.mjs';
import { copy } from './i18n.mjs';
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
  const ink = '#20343f';
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
      `<rect x="${x}" y="${top}" width="${z - x}" height="${bottom - top}" fill="${fretFill(f)}" stroke="#bbc7ce" stroke-width=".5"/>`,
    );
    el.push(
      text(l.center(f), height - 10, f === 0 ? t.open : f, small ? 10 : 12, '#465865'),
    );
  }
  rows.forEach((m, row) => {
    el.push(
      `<line x1="${l.left}" x2="${l.right}" y1="${l.y(row)}" y2="${l.y(row)}" stroke="#94a5af" stroke-width="${0.6 + row * 0.12}"/>`,
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
  for (const n of points) {
    const [a, z] = l.edges(n.fret);
    const rowGap = (l.bottom - l.top) / Math.max(1, rows.length - 1);
    const radius = Math.min(small ? 8 : 16, (z - a) * 0.41, rowGap / 2 - 3.2);
    const x = l.center(n.fret),
      y = l.y(n.row);
    let label = small
      ? n.root
        ? t.rootMarker
        : ''
      : state.labels === 'degrees'
        ? n.degree
        : n.name;
    if (!n.active && state.labels === 'degrees') label = '';
    const fg = n.lightText ? 'white' : ink;
    const spoken = `${n.name}, ${state.lang === 'pt' ? 'corda' : 'string'} ${n.string}, ${state.lang === 'pt' ? 'casa' : 'fret'} ${n.fret}`;
    el.push(
      `<g class="note ${n.active ? '' : 'outside'}" role="button" tabindex="0" data-midi="${n.midi}" aria-label="${escape(spoken)}"><circle cx="${x}" cy="${y}" r="${radius + (n.root ? 2.8 : 0)}" fill="${n.root ? '#111111' : n.fill}" stroke="${n.root ? '#111111' : '#8fa2ae'}" stroke-width="${n.root ? 0 : 0.5}"/>${n.root ? `<circle cx="${x}" cy="${y}" r="${radius + 1}" fill="white"/>` : ''}<circle cx="${x}" cy="${y}" r="${radius}" fill="${n.fill}"/>${label ? labelText(x, y + (label.includes('/') ? radius * 0.2 : radius * 0.35), label, Math.min(radius * 1.05, label.includes('/') ? radius : label.length > 2 ? radius * 0.85 : 30), fg, 700) : ''}</g>`,
    );
  }
  return `<svg viewBox="0 0 ${l.width} ${height}" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="${escape(t.title)}">${el.join('')}</svg>`;
}
