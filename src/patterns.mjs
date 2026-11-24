// SPDX-License-Identifier: MPL-2.0

import { boardModel, mod, prettyDegree, SCALES } from './music.mjs';
import { bassRoute } from './guide-layout.mjs';

const pentatonicIntervals = ['0,2,4,7,9', '0,3,5,7,10'];
const mainSevenNoteIntervals = new Set(
  SCALES.filter((scale) =>
    ['major', 'harmonic-minor', 'melodic-minor'].includes(scale.family),
  ).map((scale) => scale.intervals.join(',')),
);
const diminishedIntervals = ['0,2,3,5,6,8,9,11', '0,1,3,4,6,7,9,10'];
const standardIntervals = {
  6: [5, 5, 5, 4, 5],
  7: [5, 5, 5, 5, 4, 5],
};

// Reference-checked compact position patterns in G, low E through high E.
// Applied Guitar Theory: /lessons/major-scale/ and /lessons/natural-minor-scale/.
// Numbering follows E, D, C, A, G chord forms, not 3NPS starting degrees.
const cagedMajor = [
  [
    [2, 3, 5],
    [2, 3, 5],
    [2, 4, 5],
    [2, 4, 5],
    [3, 5],
    [2, 3, 5],
  ],
  [
    [5, 7, 8],
    [5, 7],
    [4, 5, 7],
    [4, 5, 7],
    [5, 7, 8],
    [5, 7, 8],
  ],
  [
    [7, 8, 10],
    [7, 9, 10],
    [7, 9, 10],
    [7, 9],
    [7, 8, 10],
    [7, 8, 10],
  ],
  [
    [8, 10, 12],
    [9, 10, 12],
    [9, 10, 12],
    [9, 11, 12],
    [10, 12, 13],
    [10, 12],
  ],
  [
    [12, 14, 15],
    [12, 14, 15],
    [12, 14],
    [11, 12, 14],
    [12, 13, 15],
    [12, 14, 15],
  ],
];
const cagedMinor = [
  [
    [3, 5, 6],
    [3, 5, 6],
    [3, 5],
    [2, 3, 5],
    [3, 4, 6],
    [3, 5, 6],
  ],
  [
    [5, 6, 8],
    [5, 6, 8],
    [5, 7, 8],
    [5, 7, 8],
    [6, 8],
    [5, 6, 8],
  ],
  [
    [8, 10, 11],
    [8, 10],
    [7, 8, 10],
    [7, 8, 10],
    [8, 10, 11],
    [8, 10, 11],
  ],
  [
    [10, 11, 13],
    [10, 12, 13],
    [10, 12, 13],
    [10, 12],
    [10, 11, 13],
    [10, 11, 13],
  ],
  [
    [11, 13, 15],
    [12, 13, 15],
    [12, 13, 15],
    [12, 14, 15],
    [13, 15, 16],
    [13, 15],
  ],
];
const chordForms = ['E', 'D', 'C', 'A', 'G'];

// A blues boxes, low E to high E, checked against Applied Guitar Theory's
// /lessons/major-blues-scale/ and /lessons/blues-scale/ diagrams. These include
// deliberate edge passing tones; a box need not include every pitch in every octave.
const majorBlues = [
  [
    [5, 7, 8],
    [4, 7],
    [4, 7],
    [4, 5, 6],
    [5, 7],
    [5, 7, 8],
  ],
  [
    [7, 8, 9],
    [7, 9],
    [7, 9, 10],
    [6, 9],
    [7, 10],
    [7, 8, 9],
  ],
  [
    [9, 12],
    [9, 12],
    [9, 10, 11],
    [9, 11],
    [10, 12, 13],
    [9, 12],
  ],
  [
    [12, 14],
    [12, 14, 15],
    [11, 14],
    [11, 14],
    [12, 13, 14],
    [12, 14],
  ],
  [
    [14, 17],
    [14, 15, 16],
    [14, 16],
    [14, 16, 17],
    [14, 17],
    [14, 17],
  ],
];
const minorBlues = [
  [
    [5, 8],
    [5, 6, 7],
    [5, 7],
    [5, 7, 8],
    [5, 8],
    [5, 8],
  ],
  [
    [8, 10, 11],
    [7, 10],
    [7, 10],
    [7, 8, 9],
    [8, 10],
    [8, 10],
  ],
  [
    [10, 11, 12],
    [10, 12],
    [10, 12],
    [9, 12],
    [10, 13],
    [10, 11, 12],
  ],
  [
    [12, 15],
    [12, 15],
    [12, 13, 14],
    [12, 14],
    [13, 15],
    [12, 15],
  ],
  [
    [15, 17],
    [15, 17],
    [14, 17],
    [14, 17],
    [15, 16, 17],
    [15, 17],
  ],
];

const coordinate = ({ row, fret }) => `${row}:${fret}`;
function pattern(points, details) {
  return {
    ...details,
    points,
    lo: Math.min(...points.map((point) => point.fret)),
    hi: Math.max(...points.map((point) => point.fret)),
    startFret: points[0].fret,
    startRow: points[0].row,
  };
}

// Fingering membership is a set of string/fret coordinates, never a fret window.
// Major/minor and six-string blues use checked boxes. Other main seven-note
// scales use consecutive 3NPS fingerings; symmetric diminished scales use 4NPS.
export function scalePatterns(input, { lo = 0, hi } = {}) {
  const model = boardModel({ ...input, allNotes: false });
  const state = model.state;
  hi = hi === undefined ? state.frets : hi;
  if (
    !Number.isInteger(lo) ||
    !Number.isInteger(hi) ||
    lo < 0 ||
    hi > state.frets ||
    lo > hi
  )
    return { system: null, patterns: [], reason: 'no-fit' };
  const inView = (point) => point.fret >= lo && point.fret <= hi;
  const lookup = new Map(model.points.map((point) => [coordinate(point), point]));
  const { intervals, formula } = state.scaleData;

  if (state.instrument === 'bass') {
    const patterns = [];
    let number = 0;
    for (let row = state.strings - 1; row >= 0; row--) {
      const route = bassRoute(state, row);
      if (!route) continue;
      const points = route.points.map((point) => lookup.get(coordinate(point)));
      if (points.some((point) => !point)) continue;
      const span =
        Math.max(...points.map((point) => point.fret)) -
        Math.min(...points.map((point) => point.fret));
      if (span > 5 || new Set(points.map((point) => point.row)).size < 2) continue;
      number++;
      if (!points.every(inView)) continue;
      patterns.push(
        pattern(points, {
          id: `octave-${row}`,
          number,
          startDegree: '1',
        }),
      );
    }
    return { system: 'octave', patterns, reason: patterns.length ? null : 'no-fit' };
  }

  const opens = state.tuningData.notes;
  const expected = standardIntervals[state.strings];
  if (!expected || expected.some((gap, i) => opens[i + 1] - opens[i] !== gap))
    return { system: null, patterns: [], reason: 'unsupported-tuning' };

  const signature = intervals.join(',');
  const minor = signature === '0,2,3,5,7,8,10';
  if ((signature === '0,2,4,5,7,9,11' || minor) && state.strings === 6) {
    // These exact compact diagrams are published for six-string guitar. Do not
    // invent a low-B extension or label a different tuning as the same pattern.
    const system = minor ? 'caged-minor' : 'caged-major';
    const templates = minor ? cagedMinor : cagedMajor;
    const transpose = mod(state.root - opens[0]) - 3;
    const patterns = [];
    templates.forEach((strings, index) => {
      for (const octave of [0, -12, 12]) {
        const points = strings.flatMap((frets, string) =>
          frets.map((fret) => lookup.get(`${5 - string}:${fret + transpose + octave}`)),
        );
        if (points.some((point) => !point || !inView(point))) continue;
        points.sort((a, b) => a.midi - b.midi || b.row - a.row);
        patterns.push(
          pattern(points, {
            id: `${system}-${index + 1}`,
            number: index + 1,
            shape: `${chordForms[index]}${minor ? 'm' : ''}`,
            startDegree: points[0].degree,
          }),
        );
        break;
      }
    });
    return { system, patterns, reason: patterns.length ? null : 'no-fit' };
  }

  const blues = ['0,2,3,4,7,9', '0,3,5,6,7,10'].indexOf(signature);
  if (blues !== -1 && state.strings === 6) {
    const templates = blues === 0 ? majorBlues : minorBlues;
    const transpose = mod(state.root - opens[0]) - 5;
    const patterns = [];
    templates.forEach((strings, index) => {
      for (const octave of [0, -12, 12]) {
        const points = strings.flatMap((frets, string) =>
          frets.map((fret) => lookup.get(`${5 - string}:${fret + transpose + octave}`)),
        );
        if (points.some((point) => !point || !inView(point))) continue;
        points.sort((a, b) => a.midi - b.midi || b.row - a.row);
        patterns.push(
          pattern(points, {
            id: `blues-${index + 1}`,
            number: index + 1,
            startDegree: points[0].degree,
          }),
        );
        break;
      }
    });
    return { system: 'blues', patterns, reason: patterns.length ? null : 'no-fit' };
  }

  // Seven-string blues extend the pentatonic stream with the intervening blue
  // tones at their actual pitches, rather than inventing a six-string CAGED box.
  const routeIntervals =
    blues === -1 ? intervals : blues === 0 ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10];
  const routeFormula =
    blues === -1
      ? formula
      : blues === 0
        ? ['1', '2', '3', '5', '6']
        : ['1', 'b3', '4', '5', 'b7'];
  const perString =
    pentatonicIntervals.includes(signature) || blues !== -1
      ? 2
      : mainSevenNoteIntervals.has(signature) || signature === '0,2,4,6,8,10'
        ? 3
        : diminishedIntervals.includes(signature)
          ? 4
          : null;
  if (!perString) return { system: null, patterns: [], reason: 'unsupported-scale' };
  const system =
    blues !== -1
      ? 'blues'
      : perString === 2
        ? 'two-per-string'
        : perString === 3
          ? 'three-per-string'
          : 'four-per-string';
  const patterns = [];
  for (let degree = 0; degree < routeIntervals.length; degree++) {
    const firstFret = mod(state.root - opens[0]) + routeIntervals[degree];
    // Keep numbered shapes in order above the lowest-string root when possible.
    // Only transpose a whole shape by an octave to fit the visible fret span.
    // Never crop individual notes: a view contains a complete fingering or none of it.
    for (const startFret of [firstFret, firstFret - 12, firstFret + 12]) {
      if (startFret < lo || startFret > hi) continue;
      const firstMidi = opens[0] + startFret;
      const points = [];
      let previousStart;
      let valid = true;
      for (let string = 0; string < opens.length; string++) {
        const group = [];
        for (let note = 0; note < perString; note++) {
          const offset = degree + string * perString + note;
          const midi =
            firstMidi +
            routeIntervals[offset % routeIntervals.length] +
            Math.floor(offset / routeIntervals.length) * 12 -
            routeIntervals[degree];
          const fret = midi - opens[string];
          const point = lookup.get(`${state.strings - string - 1}:${fret}`);
          if (!point || !inView(point)) {
            valid = false;
            break;
          }
          group.push(point);
        }
        if (!valid) break;
        const start = group[0].fret;
        if (
          group.at(-1).fret - start > (perString === 2 ? 4 : 5) ||
          (previousStart !== undefined && Math.abs(start - previousStart) > 3)
        ) {
          valid = false;
          break;
        }
        previousStart = start;
        points.push(...group);
      }
      if (!valid) continue;
      if (blues !== -1) {
        for (let index = points.length - 2; index >= 0; index--) {
          const before = points[index],
            after = points[index + 1];
          for (let midi = after.midi - 1; midi > before.midi; midi--) {
            if (!intervals.includes(mod(midi - state.root))) continue;
            const fret = midi - opens[state.strings - before.row - 1];
            const point = lookup.get(`${before.row}:${fret}`);
            if (!point || !inView(point)) {
              valid = false;
              break;
            }
            points.splice(index + 1, 0, point);
          }
        }
        if (!valid) continue;
      }
      patterns.push(
        pattern(points, {
          id: `${system}-${degree + 1}`,
          number: degree + 1,
          startDegree: prettyDegree(routeFormula[degree]),
        }),
      );
      break;
    }
  }
  return { system, patterns, reason: patterns.length ? null : 'no-fit' };
}
