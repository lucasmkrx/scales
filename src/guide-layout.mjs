// SPDX-License-Identifier: MPL-2.0

import { fretRuler, selection, mod } from './music.mjs';

const stringLabelWidth = 19;
const patternEndInset = 3;

// Lay out the overview and all of its fingering diagrams at a single print scale.
export function guidePatternLayout(patterns, { strings, width, height, neck }) {
  if (!patterns.length) return { boxes: [], neckWidth: neck.width };
  const spans = patterns.map(({ lo, hi }) =>
    Math.abs(neck.edges(hi)[1] - neck.edges(lo)[0]),
  );
  const sideInsets = stringLabelWidth + patternEndInset;
  const columnGap = 15;

  const slots = spans.map((span) => Math.max(4 * neck.rowGap, span));
  function fittingScale(start, end) {
    const count = end - start;
    const available = width - count * sideInsets - (count - 1) * columnGap;
    const total = slots.slice(start, end).reduce((sum, span) => sum + span, 0);
    return available / total;
  }
  let rowEnds = [spans.length];
  let scale = fittingScale(0, spans.length);
  function consider(ends) {
    const candidate = Math.min(
      ...ends.map((end, i) => fittingScale(i === 0 ? 0 : ends[i - 1], end)),
    );
    if (candidate > scale) {
      scale = candidate;
      rowEnds = ends;
    }
  }
  if (scale < 1) {
    for (let i = 1; i < spans.length; i++) consider([i, spans.length]);
  }
  // A third row can enlarge the frets on dense sheets. Reserve enough vertical
  // space for each string, a caption and the fret numbers before using it.
  const compactCaption = 15,
    fretLabels = 15,
    compactGap = 5;
  if (
    scale < 1 &&
    height >= 3 * (compactCaption + fretLabels + 5.5 * strings) + 2 * compactGap
  ) {
    for (let i = 1; i < spans.length - 1; i++)
      for (let j = i + 1; j < spans.length; j++) consider([i, j, spans.length]);
  }
  scale = Math.min(1, scale);
  const rows = rowEnds.length,
    caption = rows === 3 ? compactCaption : 17,
    rowGap = rows === 3 ? compactGap : 7;
  const availableHeight = (height - (rows - 1) * rowGap) / rows - caption - fretLabels;
  const gridHeight = Math.min(strings * neck.rowGap, availableHeight);
  const widths = slots.map((span) => sideInsets + span * scale);
  const boxes = [];
  for (let row = 0; row < rows; row++) {
    const start = row === 0 ? 0 : rowEnds[row - 1];
    const end = rowEnds[row];
    const rowWidth =
      widths.slice(start, end).reduce((sum, w) => sum + w, 0) +
      (end - start - 1) * columnGap;
    let x = (width - rowWidth) / 2;
    for (let i = start; i < end; i++) {
      boxes.push({
        x,
        top: caption + row * (caption + gridHeight + fretLabels + rowGap),
        width: sideInsets + spans[i] * scale,
        height: gridHeight,
        captionWidth: widths[i],
      });
      x += widths[i] + columnGap;
    }
  }
  return { boxes, neckWidth: neck.width * scale };
}

// The books use a continuous tapered neck; the open-string lane stays rectangular.
export function guideBoardLayout(
  input,
  { x = 44, top = 128, width = 754, height = 190, lo = 0, hi, small = false } = {},
) {
  const state = selection(input),
    rows = state.strings;
  hi ??= state.frets;
  const mirror = (v) => (state.hand === 'left' ? 2 * x + width - v : v);
  const scale = width / 754,
    vertical = Math.min(1, height / 156);
  const label = x + (small ? 7 : 17 * scale),
    left = x + (small ? stringLabelWidth : 44 * scale),
    end = x + width - (small ? patternEndInset : 0);
  const ruler = fretRuler(0, state.frets);
  const origin = ruler(lo - 1);
  const fretScale = (end - left) / (ruler(hi) - origin);
  const bound = (fret) => left + (ruler(fret) - origin) * fretScale;
  const nut = lo === 0 ? bound(0) : left;
  const rawEdges = (f) => [bound(f - 1), bound(f)];
  const edges = (f) => rawEdges(f).map(mirror);
  const rawCenter = (f) => {
    const [a, b] = rawEdges(f);
    return (a + b) / 2;
  };
  const center = (f) => mirror(rawCenter(f));
  const middle = top + height / 2;
  const halfAt = (xx) =>
    height / 2 -
    (small ? 0 : 9 * vertical * (1 - Math.max(0, Math.min(1, (xx - nut) / (end - nut)))));
  const rawY = (row, raw) => {
    const margin = small ? height / rows / 2 : 15 * vertical;
    return middle + ((row / (rows - 1)) * 2 - 1) * (halfAt(raw) - margin);
  };
  const stringY = (row, xx) => rawY(row, mirror(xx));
  const y = (row, fret) => rawY(row, rawCenter(fret));
  const edgeY = (xx, bottom = false) => {
    const raw = mirror(xx);
    return middle + (bottom ? 1 : -1) * halfAt(raw);
  };
  const rowGap = small ? height / rows : (height - 48 * vertical) / (rows - 1);
  return {
    x,
    width,
    left: mirror(left),
    end: mirror(end),
    nut: lo === 0 ? mirror(nut) : null,
    labelX: mirror(label),
    edges,
    center,
    y,
    stringY,
    edgeY,
    rowGap,
  };
}

// Choose a playable ascending octave, keeping the hand span small. These routes
// are derived from actual pitches, so drop and extended-range tunings work too.
export function bassRoute(input, startRow) {
  const s = selection(input),
    rows = [...s.tuningData.notes].reverse();
  const fret = mod(s.root - rows[startRow]),
    root = rows[startRow] + fret;
  const targets = s.scaleData.intervals.concat(12).map((n) => root + n);
  let routes = [
    {
      points: [{ row: startRow, fret, midi: root, degree: '1' }],
      lo: fret,
      hi: fret,
      cost: 0,
    },
  ];
  for (let step = 1; step < targets.length; step++) {
    const next = [];
    for (const route of routes) {
      const last = route.points.at(-1);
      for (let row = 0; row <= last.row; row++) {
        const f = targets[step] - rows[row];
        if (f < 0 || f > s.frets) continue;
        const lo = Math.min(route.lo, f),
          hi = Math.max(route.hi, f);
        const points = route.points.concat({
          row,
          fret: f,
          midi: targets[step],
          degree: step === targets.length - 1 ? '1' : s.scaleData.formula[step],
        });
        next.push({
          points,
          lo,
          hi,
          cost:
            (hi - lo) * 12 +
            points.reduce(
              (v, p, i) =>
                i
                  ? v +
                    Math.abs(p.fret - points[i - 1].fret) +
                    Math.abs(p.row - points[i - 1].row) * 0.5
                  : v,
              0,
            ),
        });
      }
    }
    routes = next.sort((a, b) => a.cost - b.cost).slice(0, 96);
  }
  if (!routes.length) return null;
  const route = routes[0];
  return {
    points: route.points,
    startFret: fret,
    lo: Math.max(0, route.lo - 1),
    hi: Math.min(s.frets, Math.max(route.hi, route.lo + 3)),
  };
}

export const catalogIndexColumns = 3;
export const catalogIndexCapacity = 24 * catalogIndexColumns;

export function guidePlan(
  variants,
  { scope = 'selected', coverTitle, readTitle, contentsTitle },
) {
  const charts = variants.map((state) => ({ title: state.title, type: 'scale', state }));
  if (scope === 'selected' && charts.length === 1)
    return {
      entries: [{ ...charts[0], number: 1 }],
      extra: 0,
      readingPage: null,
      firstScalePage: 1,
    };

  let extra = 0;
  if (scope === 'catalog') extra = Math.ceil(charts.length / catalogIndexCapacity);
  else while (charts.length + 2 + extra > 32 + extra * 48) extra++;
  const entries = [
    { title: coverTitle, type: 'cover' },
    ...Array.from({ length: extra }, () => ({ title: contentsTitle, type: 'contents' })),
    { title: readTitle, type: 'reading' },
    ...charts,
  ];
  return {
    entries: entries.map((entry, i) => ({ ...entry, number: i + 1 })),
    extra,
    readingPage: extra + 2,
    firstScalePage: extra + 3,
  };
}
