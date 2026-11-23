import { isAccidentalPitch, pitchColor, pitchLabelColor } from './board.mjs';
import { copy } from './i18n.mjs';
import { midiName, mod, spelledMidiName } from './music.mjs';
import { bassClefPath, braceHeight, bracePath, trebleClefPath } from './staff-glyphs.mjs';
import { staffKeySignature, staffSpellingState } from './staff-key.mjs';

const letters = 'CDEFGAB';
const lineGap = 8;
const staffHeight = 4 * lineGap;
const staffStart = 17;
const engravingScale = 1.5;
const selectionMarkerHeight = 5;
const clefWidth = 53;
const signatureSpacing = 9;
const treble = { top: 24, bottomStep: 30 }; // E4
// The middle-C ledger line is one staff space from either staff.
const bass = { top: treble.top + staffHeight + 2 * lineGap, bottomStep: 18 }; // G2
const middleC = 28;
const staffY = (step, clef) => clef.top + (clef.bottomStep + 8 - step) * (lineGap / 2);

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
  const outside = !notation.scaleData.intervals.includes(mod(midi - notation.root));
  if (outside && ['sharp', 'flat'].includes(state.spelling))
    return midiName(midi, state.spelling);
  return spelledMidiName(midi, notation);
}

export function grandStaffLayout({ state, points }, pattern) {
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
      const clef = step >= middleC ? treble : bass;
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
    treble.top - 17,
    ...notes.map(({ y, stemEnd }) => y + Math.min(-13, stemEnd - 2)),
  );
  const bottom = Math.max(
    bass.top + staffHeight + 10,
    ...notes.map(({ y, stemEnd }) => y + Math.max(13, stemEnd + 2)),
  );
  return {
    notes,
    signature,
    headerWidth,
    width: Math.max(headerWidth + 83, nextX - 7),
    top,
    height: bottom - top + selectionMarkerHeight + 2,
    patternNumber: pattern?.number,
  };
}

function clefMarkup() {
  const bottom = bass.top + staffHeight;
  // SMuFL uses 250 design units per staff space and registers clefs on their pitches.
  const clefScale = lineGap / 250;
  const braceScale = (bottom - treble.top) / braceHeight;
  const trebleY = staffY(middleC + 4, treble); // G4
  const bassY = staffY(middleC - 4, bass); // F3
  return `<g class="staff-clefs" fill="currentColor">
      <path class="staff-joining-line" d="M${staffStart} ${treble.top}V${bottom}" stroke="currentColor" stroke-width=".85"/>
      <path class="staff-brace" d="${bracePath}" transform="translate(5 ${bottom}) scale(${braceScale} ${-braceScale})"/>
      <path class="staff-clef" data-clef="treble" d="${trebleClefPath}" transform="translate(25 ${trebleY}) scale(${clefScale} ${-clefScale})"/>
      <path class="staff-clef" data-clef="bass" d="${bassClefPath}" transform="translate(25 ${bassY}) scale(${clefScale} ${-clefScale})"/>
    </g>`;
}

function staffLines(start, end) {
  const lines = [];
  for (const clef of [treble, bass]) {
    for (let line = 0; line < 5; line++) {
      lines.push(`M${start} ${clef.top + line * lineGap}H${end}`);
    }
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
    const octave = (clef === treble ? 4 : 2) + Number(wraps);
    const y = staffY(octave * 7 + index, clef);
    const x = clefWidth + (i + 0.5) * signatureSpacing;
    return `<path data-pitch="${letter}${sign}" d="${accidentalPaths[sign]}" transform="translate(${x} ${y})"/>`;
  });
  return `<g class="staff-key-signature" data-clef="${clef === treble ? 'treble' : 'bass'}" fill="none" stroke="currentColor" stroke-width="1.3">${paths.join('')}</g>`;
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
  return `<g class="${classes}" data-staff-midi="${midi}" transform="translate(${x} ${y})"><title>${name}</title>${ledgers}${accidentals.join('')}${stem}${head}${letter}${marker}</g>`;
}

export function grandStaffMarkup(
  { notes, signature, headerWidth, width, top, height, patternNumber },
  lang,
) {
  const label = [copy[lang].grandStaff];
  if (signature.length) label.push(`${copy[lang].keySignature} ${signature.join(' ')}`);
  label.push(...notes.map(({ name }) => name));
  if (patternNumber !== undefined) {
    label.push(
      `${copy[lang].pattern} ${patternNumber}`,
      ...notes.filter((note) => note.inPattern).map(({ name }) => name),
    );
  }
  const noteWidth = width - headerWidth;
  const markerY = top + height - selectionMarkerHeight - 2;
  return `<div class="grand-staff-score" role="img" aria-label="${label.join(' · ')}">
    <svg xmlns="http://www.w3.org/2000/svg" class="staff-clef-column" width="${headerWidth * engravingScale}" height="${height * engravingScale}" viewBox="0 ${top} ${headerWidth} ${height}" aria-hidden="true">
      ${staffLines(staffStart, headerWidth)}
      ${clefMarkup()}
      ${keySignatureMarkup(signature, treble)}
      ${keySignatureMarkup(signature, bass)}
    </svg>
    <svg xmlns="http://www.w3.org/2000/svg" class="grand-staff-svg" width="${noteWidth * engravingScale}" height="${height * engravingScale}" viewBox="${headerWidth} ${top} ${noteWidth} ${height}" aria-hidden="true">
      ${staffLines(headerWidth, width - 5)}
      ${notes.map((note) => staffNote(note, markerY)).join('')}
    </svg>
  </div>`;
}
