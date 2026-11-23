import { isAccidentalPitch, pitchColor, pitchLabelColor } from './board.mjs';
import { copy } from './i18n.mjs';
import { midiName, mod, spelledMidiName } from './music.mjs';
import { bassClefPath, trebleClefPath } from './staff-glyphs.mjs';
import { staffKeySignature, staffSpellingState } from './staff-key.mjs';

const letters = 'CDEFGAB';
const lineGap = 8;
const staffTop = 24;
const staffBottom = staffTop + 4 * lineGap;
const staffStart = 6;
const engravingScale = 1.5;
const selectionMarkerHeight = 5;
const clefWidth = 42;
const signatureSpacing = 9;
const clefs = {
  guitar: {
    id: 'treble',
    label: 'trebleStaff',
    bottomStep: 30, // E4
    anchorStep: 32, // G4
    signatureOctave: 4,
    path: trebleClefPath,
  },
  bass: {
    id: 'bass',
    label: 'bassStaff',
    bottomStep: 18, // G2
    anchorStep: 24, // F3
    signatureOctave: 2,
    path: bassClefPath,
  },
};
const staffY = (step, clef) => staffBottom + (clef.bottomStep - step) * (lineGap / 2);

const accidentalPaths = {
  '♯': 'M-2-6v13M2-8V5M-4-1l8-2m-8 6 8-2',
  '♭': 'M-2-9V5Q5 2 4-1Q3-4-2 0',
  '♮': 'M-2-7V4l5-2V-5l-5 2M3 2v5',
  '𝄪': 'M-3-3l6 6m-6 0 6-6M-3-3h1m4 0h1m-1 6h1m-6 0h1',
};

function ledgerOffsets(step, clef) {
  const offsets = [];
  for (let line = clef.bottomStep - 2; line >= step; line -= 2) {
    offsets.push((step - line) * (lineGap / 2));
  }
  for (let line = clef.bottomStep + 10; line <= step; line += 2) {
    offsets.push((step - line) * (lineGap / 2));
  }
  return offsets;
}

export function staffPitchName(midi, state, notation = staffSpellingState(state)) {
  const writtenMidi = midi + 12; // Guitar and bass notation sounds an octave lower.
  const outside = !notation.scaleData.intervals.includes(mod(midi - notation.root));
  if (outside && ['sharp', 'flat'].includes(state.spelling))
    return midiName(writtenMidi, state.spelling);
  return spelledMidiName(writtenMidi, notation);
}

export function staffLayout({ state, points }, pattern) {
  const clef = clefs[state.instrument];
  const pitches = new Map(points.map((point) => [point.midi, point]));
  const focused = pattern && new Set(pattern.points.map((point) => point.midi));
  const notation = staffSpellingState(state);
  const signature = staffKeySignature(notation);
  const keyAlterations = new Map(signature.map(([letter, sign]) => [letter, sign]));
  const alterations = new Map();
  const headerWidth = clefWidth + signature.length * signatureSpacing;
  let nextX = headerWidth + 17;
  const notes = [...pitches.values()]
    .sort((a, b) => a.midi - b.midi)
    .map(({ midi, fill, lightText, inScale }) => {
      const name = staffPitchName(midi, state, notation);
      const [, letter, signs, octave] = /^([A-G])([♯♭]*)(-?\d+)$/.exec(name);
      const step = Number(octave) * 7 + letters.indexOf(letter);
      const y = staffY(step, clef);
      // Quarter-note stems point toward the middle line. Distant ledger notes
      // reach that line, even when it takes more than the usual 3½ spaces.
      const toMiddle = staffY(clef.bottomStep + 4, clef) - y;
      const stemEnd =
        toMiddle < 0
          ? Math.min(toMiddle, -3.5 * lineGap)
          : Math.max(toMiddle, 3.5 * lineGap);
      // A signature covers every octave. In this unbarred sequence an inline
      // alteration carries only at its own written staff position.
      const previous = alterations.get(step) ?? keyAlterations.get(letter) ?? '';
      const accidental = signs === previous ? '' : signs || '♮';
      alterations.set(step, signs);
      const glyphs = [...accidental.replaceAll('♯♯', '𝄪')];
      const x = nextX + Math.max(0, glyphs.length * 8 - 4);
      nextX = x + 23;
      const inPattern = focused?.has(midi) ?? false;
      return {
        midi,
        fill,
        lightText,
        name,
        x,
        y,
        stemEnd,
        glyphs,
        ledger: ledgerOffsets(step, clef),
        inScale,
        inPattern,
        muted: Boolean(focused && !inPattern),
      };
    });
  const top = Math.min(
    staffTop - 17,
    ...notes.map(({ y, stemEnd }) => y + Math.min(-13, stemEnd - 2)),
  );
  const bottom = Math.max(
    staffBottom + 10,
    ...notes.map(({ y, stemEnd }) => y + Math.max(13, stemEnd + 2)),
  );
  return {
    clef,
    notes,
    signature,
    headerWidth,
    width: Math.max(headerWidth + 83, nextX - 7),
    top,
    height: bottom - top + selectionMarkerHeight + 2,
    patternNumber: pattern?.number,
  };
}

function clefMarkup(clef) {
  // SMuFL uses 250 design units per staff space and registers clefs on their pitches.
  const scale = lineGap / 250;
  const y = staffY(clef.anchorStep, clef);
  return `<path class="staff-clef" data-clef="${clef.id}" fill="currentColor" d="${clef.path}" transform="translate(13 ${y}) scale(${scale} ${-scale})"/>`;
}

function staffLines(start, end) {
  const lines = [];
  for (let line = 0; line < 5; line++) {
    lines.push(`M${start} ${staffTop + line * lineGap}H${end}`);
  }
  return `<path class="staff-lines" d="${lines.join('')}" fill="none" stroke="currentColor" stroke-width=".85"/>`;
}

function keySignatureMarkup(signature, clef) {
  if (!signature.length) return '';
  const paths = signature.map(([letter, sign], i) => {
    // In treble clef the sharps occupy A4–G5, the flats F4–E5.
    // Bass uses the same arrangement two octaves lower.
    const index = letters.indexOf(letter);
    const wraps = index < letters.indexOf(sign === '♯' ? 'A' : 'F');
    const octave = clef.signatureOctave + Number(wraps);
    const y = staffY(octave * 7 + index, clef);
    const x = clefWidth + (i + 0.5) * signatureSpacing;
    return `<path data-pitch="${letter}${sign}" d="${accidentalPaths[sign]}" transform="translate(${x} ${y})"/>`;
  });
  return `<g class="staff-key-signature" data-clef="${clef.id}" fill="none" stroke="currentColor" stroke-width="1.3">${paths.join('')}</g>`;
}

function staffNote(
  {
    midi,
    fill,
    lightText,
    name,
    x,
    y,
    stemEnd,
    glyphs,
    ledger,
    inScale,
    inPattern,
    muted,
  },
  markerY,
  tabStop,
) {
  const ledgers = ledger.length
    ? `<path d="${ledger.map((offset) => `M-9 ${offset}h18`).join('')}" stroke="currentColor" stroke-width="1.2"/>`
    : '';
  const accidentals = glyphs.map(
    (sign, i) =>
      `<path class="staff-accidental" data-sign="${sign}" d="${accidentalPaths[sign]}" transform="translate(${-12 - (glyphs.length - 1 - i) * 8} 0)" fill="none" stroke="currentColor" stroke-width="1.3"/>`,
  );
  const classes = [
    'staff-note',
    inPattern && 'is-in-pattern',
    muted && 'is-muted',
    !inScale && 'is-outside',
  ]
    .filter(Boolean)
    .join(' ');
  const headEdge = inPattern ? 6.2 : 5;
  const stemX = stemEnd < 0 ? headEdge - 1 : -headEdge;
  const stem = `<rect class="staff-stem" x="${stemX}" y="${Math.min(0, stemEnd)}" width="1" height="${Math.abs(stemEnd)}" fill="currentColor"/>`;
  const pc = mod(midi);
  const head = `<ellipse class="staff-notehead${isAccidentalPitch(pc) ? ' accidental-pitch' : ''}" rx="${inPattern ? 6.8 : 5.3}" ry="${inPattern ? 4.1 : 3.5}" transform="rotate(-23)" fill="${inPattern ? pitchColor(pc, fill) : 'currentColor'}"/>`;
  const letter = inPattern
    ? `<text class="staff-pitch-letter" text-anchor="middle" y="2.45" fill="${pitchLabelColor(lightText)}">${name[0]}</text>`
    : '';
  const marker = `<path class="staff-selection-marker" d="M0 ${markerY - y}l4 ${selectionMarkerHeight}h-8z" fill="currentColor"/>`;
  const target =
    '<rect class="staff-note-target" x="-11" y="-12" width="22" height="24" rx="3" fill="transparent"/>';
  return `<g class="${classes}" data-staff-midi="${midi}" role="button" tabindex="${tabStop ? 0 : -1}" aria-label="${name}" aria-pressed="false" transform="translate(${x} ${y})"><title>${name}</title>${target}${ledgers}${accidentals.join('')}${stem}${head}${letter}${marker}</g>`;
}

export function staffMarkup(
  { clef, notes, signature, headerWidth, width, top, height, patternNumber },
  lang,
) {
  const label = [copy[lang][clef.label], copy[lang].writtenPitch];
  if (signature.length) label.push(`${copy[lang].keySignature} ${signature.join(' ')}`);
  if (patternNumber !== undefined) {
    label.push(`${copy[lang].pattern} ${patternNumber}`);
  }
  const noteWidth = width - headerWidth;
  const markerY = top + height - selectionMarkerHeight - 2;
  const entry = notes.find((note) => note.inPattern) ?? notes[0];
  return `<div class="staff-score" role="toolbar" aria-label="${label.join(' · ')}" aria-describedby="keyboard-notes">
    <svg xmlns="http://www.w3.org/2000/svg" class="staff-clef-column" width="${headerWidth * engravingScale}" height="${height * engravingScale}" viewBox="0 ${top} ${headerWidth} ${height}" aria-hidden="true">
      ${staffLines(staffStart, headerWidth)}
      ${clefMarkup(clef)}
      ${keySignatureMarkup(signature, clef)}
    </svg>
    <svg xmlns="http://www.w3.org/2000/svg" class="staff-notes-svg" width="${noteWidth * engravingScale}" height="${height * engravingScale}" viewBox="${headerWidth} ${top} ${noteWidth} ${height}">
      <g aria-hidden="true">${staffLines(headerWidth, width - 5)}</g>
      ${notes.map((note) => staffNote(note, markerY, note === entry)).join('')}
    </svg>
  </div>`;
}
