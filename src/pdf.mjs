// SPDX-License-Identifier: MPL-2.0

import {
  selection,
  boardModel,
  rootName,
  spellScale,
  midiName,
  noteName,
  prettyDegree,
  fretFill,
  PALETTE,
  SCALES,
  pitchPreference,
} from './music.mjs';
import { FAMILIES } from './catalog.mjs';
import {
  guideBoardLayout,
  guidePatternLayout,
  guidePlan,
  catalogIndexCapacity,
  catalogIndexColumns,
} from './guide-layout.mjs';
import { copy } from './i18n.mjs';
import { practicePatterns } from './patterns.mjs';
import { scaleName } from './workspace.mjs';
import {
  accidentalPaths,
  keySignaturePositions,
  lineGap,
  practiceStaffPoints,
  staffLayout,
  staffTop,
  staffY,
} from './staff.mjs';
import { LANGUAGES, tuningName as localizedTuningName } from './locales.mjs';
const paperSizes = { a4: [841.89, 595.28], letter: [792, 612] };

export async function createAtlas(
  input = {},
  {
    scope = 'selected',
    allKeys = false,
    paperSize = 'a4',
    asset,
    progress = () => {},
    signal,
  } = {},
) {
  if (!Object.hasOwn(paperSizes, paperSize))
    throw new Error('Paper size must be a4 or letter');
  const [W, H] = paperSizes[paperSize],
    M = 44,
    R = W - M;
  const pdf = globalThis.PDFLib ?? {};
  const { PDFDocument, rgb, PDFName, PDFString, PDFHexString } = pdf;
  if (!PDFDocument || !globalThis.fontkit)
    throw new Error('PDF libraries are not loaded');
  const get =
    asset ??
    (async (path) => {
      const r = await fetch(new URL(`../${path}`, import.meta.url));
      if (!r.ok) throw new Error(`Cannot load ${path}`);
      return new Uint8Array(await r.arrayBuffer());
    });
  const initial = selection({
      ...input,
      allNotes: scope === 'selected' && !allKeys && input.allNotes,
    }),
    t = copy[initial.lang];
  const tr = (en, pt, es, it, fr, de) => ({ en, pt, es, it, fr, de })[initial.lang],
    doc = await PDFDocument.create();
  doc.registerFontkit(globalThis.fontkit);
  const [bodyBytes, boldBytes, wordmarkBytes, birdBytes] = await Promise.all([
    get('assets/fonts/DejaVuSans.ttf'),
    get('assets/fonts/DejaVuSans-Bold.ttf'),
    get('assets/tukany-wordmark.svg'),
    get('assets/tukany-logo.svg'),
  ]);
  const body = await doc.embedFont(bodyBytes, { subset: true }),
    bold = await doc.embedFont(boldBytes, { subset: true });
  const color = (hex) =>
    rgb(
      ...hex
        .replace('#', '')
        .match(/../g)
        .map((v) => parseInt(v, 16) / 255),
    );
  const ink = color('#1b2925'),
    muted = color('#53655e'),
    accent = color('#176448'),
    rule = color('#dce5e1'),
    grid = color('#b4c2bb'),
    paper = rgb(1, 1, 1),
    pale = color('#f5f8f6');
  const fretColors = {
    open: '#e2ebe6',
    octave: '#d8e5de',
    marker: '#e8efeb',
    upper: '#eff4f1',
    lower: '#fbfcfb',
  };
  // Use the original vector artwork and its light-mode fills for print.
  function readMark(bytes) {
    const svg = new TextDecoder().decode(bytes);
    const bounds = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const paths = [...svg.matchAll(/<path fill="(#[\da-fA-F]{6})" d="([^"]+)"/g)];
    if (!bounds || !paths.length) throw new Error('Cannot read the Tukany logo');
    return {
      width: Number(bounds[1]),
      height: Number(bounds[2]),
      paths: paths.map(([, fill, d]) => ({ d, fill: color(fill) })),
    };
  }
  const bird = readMark(birdBytes);
  const wordmark = readMark(wordmarkBytes);
  function drawMark(page, mark, x, top, height) {
    for (const { d, fill } of mark.paths)
      page.drawSvgPath(d, {
        x,
        y: H - top,
        scale: height / mark.height,
        color: fill,
      });
  }
  function brand(page, x, top, height) {
    const birdHeight = height * 0.75;
    const birdWidth = birdHeight * (bird.width / bird.height);
    // Match the spacing and capital T alignment of the website lockup.
    drawMark(page, bird, x, top, birdHeight);
    drawMark(page, wordmark, x + birdWidth + height * 0.12, top + height * 0.02, height);
  }
  const selected =
    scope === 'catalog'
      ? SCALES
      : scope === 'family'
        ? SCALES.filter((s) => s.family === initial.scaleData.family)
        : [initial.scaleData];
  if (!selected.length) throw new Error(t.selectFamily);
  const variants = selected
    .flatMap((scale) =>
      (allKeys && scope === 'selected'
        ? Array.from({ length: 12 }, (_, root) => root)
        : [initial.root]
      ).map((root) =>
        selection({ ...initial, root, scale: scale.id, formula: initial.formula }),
      ),
    )
    .map((s) => ({ ...s, title: `${rootName(s)} ${s.scaleData.name[s.lang]}` }));
  const collection =
    scope === 'catalog'
      ? t.scalesAndArpeggios
      : scope === 'family'
        ? FAMILIES[initial.scaleData.family][initial.lang]
        : scaleName(initial.scaleData, initial.lang);
  const editionTitle =
    scope !== 'selected'
      ? t.collectionOnRoot
          .replace('{collection}', collection)
          .replace('{root}', rootName(initial))
      : allKeys
        ? `${collection} · ${tr('All 12 keys', 'As 12 tonalidades', 'Las 12 tonalidades', 'Tutte le 12 tonalità', 'Les 12 tonalités', 'Alle 12 Tonarten')}`
        : variants[0].title;
  const plan = guidePlan(variants, {
    scope,
    coverTitle: tr(
      'Cover and contents',
      'Capa e sumário',
      'Portada e índice',
      'Copertina e indice',
      'Couverture et sommaire',
      'Titelblatt und Inhaltsverzeichnis',
    ),
    readTitle: tr(
      'How to use this guide',
      'Como usar este guia',
      'Cómo usar esta guía',
      'Come usare questa guida',
      'Mode d’emploi',
      'So nutzt du diesen Leitfaden',
    ),
    contentsTitle:
      scope === 'catalog'
        ? tr(
            'Alphabetical index',
            'Índice alfabético',
            'Índice alfabético',
            'Indice alfabetico',
            'Index alphabétique',
            'Alphabetisches Register',
          )
        : tr(
            'Contents, continued',
            'Continuação do sumário',
            'Continuación del índice',
            'Indice (seguito)',
            'Sommaire (suite)',
            'Inhalt (Fortsetzung)',
          ),
  });
  const chartEntries = plan.entries.filter((entry) => entry.type === 'scale');
  const catalogFamilies =
    scope === 'catalog'
      ? Object.entries(FAMILIES).flatMap(([id, names]) => {
          const children = chartEntries.filter(
            (entry) => entry.state.scaleData.family === id,
          );
          return children.length
            ? [{ title: names[initial.lang], number: children[0].number, children }]
            : [];
        })
      : [];
  const pages = plan.entries.map(() => {
    const p = doc.addPage([W, H]);
    p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: paper });
    return p;
  });
  const checkAbort = () => {
    if (signal?.aborted) throw new DOMException('Export canceled', 'AbortError');
  };
  checkAbort();
  function rect(page, x, top, width, height, fill, border) {
    page.drawRectangle({
      x,
      y: H - top - height,
      width,
      height,
      color: fill,
      borderColor: border,
      borderWidth: border ? 0.5 : 0,
    });
  }
  function line(page, x, y, z, v, stroke = rule, width = 0.6) {
    page.drawLine({
      start: { x, y: H - y },
      end: { x: z, y: H - v },
      thickness: width,
      color: stroke,
    });
  }
  function circle(page, x, y, r, fill, border, width = 0.5) {
    page.drawCircle({
      x,
      y: H - y,
      size: r,
      color: typeof fill === 'string' ? color(fill) : fill,
      borderColor: border
        ? typeof border === 'string'
          ? color(border)
          : border
        : undefined,
      borderWidth: border ? width : 0,
    });
  }
  function poly(page, points, fill, border) {
    const [[firstX, firstY], ...rest] = points;
    page.pushOperators(
      pdf.pushGraphicsState(),
      pdf.setFillingColor(fill),
      pdf.setStrokingColor(border),
      pdf.setLineWidth(0.45),
      pdf.moveTo(firstX, H - firstY),
      ...rest.map(([x, y]) => pdf.lineTo(x, H - y)),
      pdf.closePath(),
      pdf.fillAndStroke(),
      pdf.popGraphicsState(),
    );
  }
  function openStringColumn(page, left, right, top, bottom) {
    const y1 = H - top,
      y2 = H - bottom,
      radius = 7;
    page.pushOperators(
      pdf.pushGraphicsState(),
      pdf.setFillingColor(color(fretFill(0, fretColors))),
      pdf.moveTo(left + radius, y1),
      pdf.lineTo(right - radius, y1),
      pdf.appendQuadraticCurve(right, y1, right, y1 - radius),
      pdf.lineTo(right, y2 + radius),
      pdf.appendQuadraticCurve(right, y2, right - radius, y2),
      pdf.lineTo(left + radius, y2),
      pdf.appendQuadraticCurve(left, y2, left, y2 + radius),
      pdf.lineTo(left, y1 - radius),
      pdf.appendQuadraticCurve(left, y1, left + radius, y1),
      pdf.closePath(),
      pdf.fill(),
      pdf.popGraphicsState(),
    );
  }
  function text(
    page,
    x,
    top,
    str,
    size = 10,
    font = body,
    fill = ink,
    width,
    align = 'left',
  ) {
    str = String(str);
    const measured = font.widthOfTextAtSize(str, size);
    if (width && measured > width) size *= width / measured;
    const actual = Math.min(width ?? measured, measured);
    const xx = x - (align === 'right' ? actual : align === 'center' ? actual / 2 : 0);
    page.drawText(str, { x: xx, y: H - top, size, font, color: fill });
  }
  function para(
    page,
    x,
    top,
    str,
    width,
    size = 9.3,
    leading = 14,
    fill = ink,
    font = body,
  ) {
    let value = '';
    for (const word of str.split(/\s+/)) {
      const next = (value + ' ' + word).trim();
      if (value && font.widthOfTextAtSize(next, size) > width) {
        text(page, x, top, value, size, font, fill);
        top += leading;
        value = word;
      } else value = next;
    }
    if (value) {
      text(page, x, top, value, size, font, fill);
      top += leading;
    }
    return top;
  }
  function note(page, x, y, pc, root, r, label = '', small = false, dim = false) {
    const fill = dim ? '#e2eae5' : (PALETTE[pc] ?? '#ffffff');
    if (root) {
      const ring = small ? Math.min(1.7, r * 0.34) : 1.7;
      circle(page, x, y, r + ring, dim ? '#97a69e' : '#111111');
      circle(page, x, y, r + ring * 0.35, '#ffffff');
    }
    circle(page, x, y, r, fill, fill === '#ffffff' ? '#28372e' : undefined);
    if (label) {
      const size = Math.min(
          small ? 7.2 : 11.2,
          r * 1.05,
          label.includes('/') ? r : label.length > 2 ? r * 0.78 : 20,
        ),
        fill = dim ? muted : [0, 5, 7, 9, 11].includes(pc) ? rgb(1, 1, 1) : ink;
      if (label.includes('/'))
        label
          .split('/')
          .forEach((name, i) =>
            text(
              page,
              x,
              y + (i ? size * 0.58 : -size * 0.24),
              name,
              size * 0.76,
              bold,
              fill,
              r * 1.8,
              'center',
            ),
          );
      else text(page, x, y + size * 0.34, label, size, bold, fill, r * 1.8, 'center');
    }
  }
  const instrument = (s) => t[s.instrument],
    hand = (s) => t[s.hand];
  const tuningName = (s) => localizedTuningName(s.tuningData, s.lang);
  const rootTerm = (s) =>
    s.scaleData.family === 'arpeggio'
      ? t.chordRoot
      : tr('Tonic', 'Tônica', 'Tónica', 'Tonica', 'Tonique', 'Grundton');
  const rootMarker = (s) =>
    s.scaleData.family === 'arpeggio' ? t.chordRootMarker : t.rootMarker;
  const pitchNames = (s, octaves = false) =>
    s.tuningData.notes.map((m) =>
      octaves ? midiName(m, pitchPreference(s)) : noteName(m, pitchPreference(s)),
    );
  const pitches = (s, octaves = false) => pitchNames(s, octaves).join(' - ');
  function footer(page, n, caption = '') {
    const baseline = H - 23;
    line(page, M, baseline - 13, R, baseline - 13);
    text(page, M, baseline, 'tukany.com  ·  Lucas Marques  ·  CC BY 4.0', 7, body, muted);
    if (caption)
      text(page, W / 2, baseline, caption, 7.1, body, muted, (R - M) * 0.42, 'center');
    if (pages.length > 1)
      text(page, R, baseline, `${n} / ${pages.length}`, 7.6, bold, muted, 43, 'right');
  }
  function masthead(page, s) {
    brand(page, M, 16, 17);
    const unit = (term) =>
      s.lang === 'de' ? term : term.toLocaleLowerCase(LANGUAGES[s.lang].tag);
    const setup = `${instrument(s)} · ${s.strings} ${unit(t.strings)} · ${tuningName(s)} · ${s.frets} ${unit(t.frets)} · ${hand(s)}`;
    text(page, R, 27, setup, 9.2, bold, ink, R - M - 100, 'right');
    text(
      page,
      R,
      40,
      `${t.openStringsShort}  ${pitches(s, true)}`,
      8,
      body,
      muted,
      R - M - 100,
      'right',
    );
    line(page, M, 48, R, 48);
  }
  function head(page, s, title, subtitle = '') {
    masthead(page, s);
    text(page, M, 80, title, 25, bold, ink, R - M);
    if (subtitle) text(page, M, 99, subtitle, 9, body, muted, R - M);
  }
  function drawBoard(
    page,
    state,
    {
      x = M,
      top = 128,
      width = R - M,
      height = 190,
      lo = 0,
      hi = state.frets,
      small = false,
      route,
      miniature = false,
      focus,
      focusPattern,
      pattern = false,
    } = {},
  ) {
    const model = boardModel(state, { lo, hi }),
      l = guideBoardLayout(state, { x, top, width, height, lo, hi, small });
    if (small) {
      for (let f = lo; f <= hi; f++) {
        const [a, b] = l.edges(f);
        rect(
          page,
          Math.min(a, b),
          top,
          Math.abs(b - a),
          height,
          color(fretFill(f, fretColors)),
          grid,
        );
      }
    } else {
      const [oa, ob] = l.edges(0),
        left = Math.min(oa, ob),
        right = Math.max(oa, ob),
        openTop = l.edgeY(l.nut),
        openBottom = l.edgeY(l.nut, true);
      openStringColumn(page, left, right, openTop, openBottom);
      for (let f = 1; f <= hi; f++) {
        const [a, b] = l.edges(f);
        poly(
          page,
          [
            [a, l.edgeY(a)],
            [b, l.edgeY(b)],
            [b, l.edgeY(b, true)],
            [a, l.edgeY(a, true)],
          ],
          color(fretFill(f, fretColors)),
          grid,
        );
      }
    }
    model.rows.forEach((m, row) => {
      const stroke = color('#899c92'),
        thickness = miniature ? 0.3 : small ? 0.45 + row * 0.05 : 0.5 + row * 0.07;
      if (!small)
        line(
          page,
          l.left,
          l.stringY(row, l.left),
          l.nut,
          l.stringY(row, l.nut),
          stroke,
          thickness,
        );
      line(
        page,
        !small ? l.nut : l.left,
        l.stringY(row, !small ? l.nut : l.left),
        l.end,
        l.stringY(row, l.end),
        stroke,
        thickness,
      );
      const name = noteName(m, pitchPreference(state));
      if (!miniature) {
        const size = small ? 5.8 : 6.7,
          baseline = l.y(row, lo) + 2;
        if (name.includes('/'))
          name
            .split('/')
            .forEach((part, i) =>
              text(
                page,
                l.labelX,
                baseline + (i ? size * 0.5 : -size * 0.4),
                part,
                size * 0.76,
                body,
                ink,
                30,
                'center',
              ),
            );
        else text(page, l.labelX, baseline, name, size, body, ink, 30, 'center');
      }
    });
    if (l.nut !== null)
      line(
        page,
        l.nut,
        l.edgeY(l.nut),
        l.nut,
        l.edgeY(l.nut, true),
        ink,
        small ? 1.8 : 3,
      );
    const points = route
      ? route.points.map((p) => ({
          ...p,
          pc: p.midi % 12,
          root: p.midi % 12 === state.root,
          name: '',
          degree: prettyDegree(p.degree),
        }))
      : model.points;
    for (const n of points) {
      const [a, b] = l.edges(n.fret),
        radius = Math.max(
          0.5,
          Math.min(
            miniature ? 2.4 : small ? Math.min(9.2, l.rowGap * 0.34) : 12.1,
            Math.abs(a - b) / 2 - 2,
            l.rowGap / 2 - (small ? 0.75 : 1.5),
          ),
        );
      const label = miniature
        ? ''
        : small
          ? route
            ? n.root
              ? rootMarker(state)
              : pattern
                ? ''
                : n.degree
            : n.root
              ? rootMarker(state)
              : ''
          : state.labels === 'degrees'
            ? n.degree
            : n.name;
      note(
        page,
        l.center(n.fret),
        l.y(n.row, n.fret),
        n.pc,
        !miniature && n.root,
        radius,
        label,
        small,
        n.inScale === false || Boolean(focus && !focus.has(`${n.row}:${n.fret}`)),
      );
    }
    if (!miniature) {
      if (focusPattern) {
        const edges = [...l.edges(focusPattern.lo), ...l.edges(focusPattern.hi)];
        const left = Math.min(...edges),
          right = Math.max(...edges);
        const y = top - 3;
        line(page, left, y, right, y, accent, 0.8);
        line(page, left, y, left, top + 2, accent, 0.8);
        line(page, right, y, right, top + 2, accent, 0.8);
        text(
          page,
          (left + right) / 2,
          y - 3,
          `${t.pattern} ${focusPattern.number}`,
          7.5,
          bold,
          accent,
          right - left + 12,
          'center',
        );
      }
      let previousLabel = lo;
      const labelSize = small ? 6.6 : 8.2;
      const fretLabel = (fret) => (fret === 0 && !small ? t.open : String(fret));
      const labelWidth = (fret) => body.widthOfTextAtSize(fretLabel(fret), labelSize);
      const labelsFit = (a, b) =>
        Math.abs(l.center(a) - l.center(b)) >= (labelWidth(a) + labelWidth(b)) / 2 + 2;
      for (let f = lo; f <= hi; f++) {
        const yy = small ? top + height + 12 : l.edgeY(l.center(f), true) + 18;
        if (f !== lo && f !== hi && (!labelsFit(previousLabel, f) || !labelsFit(f, hi)))
          continue;
        previousLabel = f;
        text(
          page,
          l.center(f),
          yy,
          fretLabel(f),
          labelSize,
          body,
          muted,
          undefined,
          'center',
        );
      }
    }
  }
  function addLink(page, box, target) {
    const annot = doc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [box[0], H - box[3], box[2], H - box[1]],
      Border: [0, 0, 0],
      Dest: [pages[target - 1].ref, 'Fit'],
    });
    page.node.addAnnot(doc.context.register(annot));
  }
  function contents(
    page,
    entries,
    { x = M, top = 180, width = R - M, step = 22, columns = 2 } = {},
  ) {
    const rows = Math.ceil(entries.length / columns);
    const columnWidth = (width - (columns - 1) * 16) / columns;
    entries.forEach((entry, i) => {
      const xx = x + Math.floor(i / rows) * (columnWidth + 16);
      const yy = top + (i % rows) * step;
      line(page, xx, yy + 7, xx + columnWidth, yy + 7);
      text(page, xx, yy, entry.title, 9, body, ink, columnWidth - 23);
      text(page, xx + columnWidth, yy, entry.number, 9, bold, accent, 20, 'right');
      addLink(page, [xx, yy - 11, xx + columnWidth, yy + 7], entry.number);
    });
  }
  function callout(page, x, top, width, title, description) {
    rect(page, x, top, width, 36, pale);
    rect(page, x, top, 2, 36, accent);
    text(page, x + 12, top + 14, title, 8.5, bold, accent, width - 24);
    text(page, x + 12, top + 28, description, 8, body, ink, width - 24);
  }
  function cover() {
    const page = pages[0];
    masthead(page, initial);
    text(
      page,
      M,
      80,
      scope === 'catalog' ? t.catalogScope : scope === 'family' ? t.scaleFamily : t.scale,
      9,
      bold,
      accent,
    );
    text(page, M, 116, editionTitle, 31, bold, ink, R - M);
    text(
      page,
      M,
      138,
      `${variants.length} ${t.scaleMaps}  ·  ${pages.length} ${t.pages}`,
      10,
      body,
      muted,
    );
    const previewWidth = (R - M) * 0.34;
    const indexX = M + previewWidth + 28;
    const indexWidth = R - indexX;
    const first = variants[0];
    rect(page, M, 162, previewWidth, 186, pale, rule);
    text(
      page,
      M + 13,
      184,
      `${t.fretboard}  ·  ${t.page} ${plan.firstScalePage}`,
      8.4,
      bold,
      accent,
      previewWidth - 26,
    );
    text(page, M + 13, 209, first.title, 13, bold, ink, previewWidth - 26);
    drawBoard(page, first, {
      x: M + 6,
      top: 227,
      width: previewWidth - 19,
      height: 66,
      miniature: true,
    });
    text(
      page,
      M + 13,
      321,
      spellScale(first).join('  '),
      9,
      bold,
      ink,
      previewWidth - 26,
    );
    addLink(page, [M, 162, M + previewWidth, 348], plan.firstScalePage);
    text(
      page,
      indexX,
      181,
      tr('Contents', 'Sumário', 'Índice', 'Indice', 'Sommaire', 'Inhalt'),
      16,
      bold,
      ink,
    );
    const entries =
      scope === 'catalog'
        ? [
            ...plan.entries.filter((e) => e.type === 'contents' || e.type === 'reading'),
            ...catalogFamilies,
          ]
        : plan.entries.slice(1, 32);
    const columns = entries.length > 14 ? 2 : 1;
    contents(page, entries, {
      x: indexX,
      width: indexWidth,
      top: 210,
      columns,
      step: Math.min(
        27,
        (H - 276) / Math.max(1, Math.ceil(entries.length / columns) - 1),
      ),
    });
    footer(page, 1);
  }
  function readingGuide() {
    const page = pages[plan.readingPage - 1];
    head(
      page,
      initial,
      tr(
        'How to use this guide',
        'Como usar este guia',
        'Cómo usar esta guía',
        'Come usare questa guida',
        'Mode d’emploi',
        'So nutzt du diesen Leitfaden',
      ),
      tr(
        'Connect what you already play with the notes, degrees, and harmony.',
        'Conecte o que você já toca com as notas, os graus e a harmonia.',
        'Relaciona lo que ya tocas con las notas, los grados y la armonía.',
        'Collega ciò che già suoni alle note, ai gradi e all’armonia.',
        'Reliez ce que vous jouez déjà aux notes, aux degrés et à l’harmonie.',
        'Entdecke Noten, Stufen und Harmonien in dem, was du schon spielst.',
      ),
    );
    const columns = [
      [
        tr(
          'Read the neck',
          'Leia o braço',
          'Lee el diapasón',
          'Leggere la tastiera',
          'Lire le manche',
          'Das Griffbrett lesen',
        ),
        [
          initial.hand === 'left'
            ? tr(
                'The nut is on the right. Fret numbers and pitches rise toward the left. Fret 0 is an open string.',
                'A pestana fica à direita. A numeração das casas aumenta e as notas ficam mais agudas para a esquerda. A casa 0 é a corda solta.',
                'La cejuela está a la derecha. Los números de traste y la altura de las notas aumentan hacia la izquierda. El traste 0 es la cuerda al aire.',
                'Il capotasto è a destra. Verso sinistra aumentano i numeri dei tasti e l’altezza delle note. Il tasto 0 indica la corda a vuoto.',
                'Le sillet est à droite. Vers la gauche, les numéros de cases augmentent et les notes montent. La case 0 indique une corde à vide.',
                'Der Sattel ist rechts. Nach links steigen Bundnummern und Tonhöhe. Bund 0 steht für die leere Saite.',
              )
            : tr(
                'The nut is on the left. Fret numbers and pitches rise toward the right. Fret 0 is an open string.',
                'A pestana fica à esquerda. A numeração das casas aumenta e as notas ficam mais agudas para a direita. A casa 0 é a corda solta.',
                'La cejuela está a la izquierda. Los números de traste y la altura de las notas aumentan hacia la derecha. El traste 0 es la cuerda al aire.',
                'Il capotasto è a sinistra. Verso destra aumentano i numeri dei tasti e l’altezza delle note. Il tasto 0 indica la corda a vuoto.',
                'Le sillet est à gauche. Vers la droite, les numéros de cases augmentent et les notes montent. La case 0 indique une corde à vide.',
                'Der Sattel ist links. Nach rechts steigen Bundnummern und Tonhöhe. Bund 0 steht für die leere Saite.',
              ),
          tr(
            `From top to bottom, ${pitchNames(initial).reverse().join(', ')}. String 1 is the highest-pitched string. The bottom line is the lowest.`,
            `De cima para baixo, ${pitchNames(initial).reverse().join(', ')}. A corda 1 é a mais aguda. A linha inferior é a mais grave.`,
            `De arriba abajo, ${pitchNames(initial).reverse().join(', ')}. La cuerda 1 es la más aguda. La línea inferior es la más grave.`,
            `Dall’alto in basso: ${pitchNames(initial).reverse().join(', ')}. La prima corda è la più acuta. La linea in basso è la più grave.`,
            `De haut en bas : ${pitchNames(initial).reverse().join(', ')}. La corde 1 est la plus aiguë, la ligne du bas représente la plus grave.`,
            `Von oben nach unten: ${pitchNames(initial).reverse().join(', ')}. Saite 1 klingt am höchsten. Die unterste Linie zeigt die tiefste Saite.`,
          ),
          tr(
            'One fret raises the pitch a half step. Fret numbers identify positions; fret 12 is an octave above the open string.',
            'Uma casa eleva a nota em um semitom. Os números indicam posições; a casa 12 fica uma oitava acima da corda solta.',
            'Cada traste eleva la nota un semitono. Los números indican posiciones; el traste 12 está una octava por encima de la cuerda al aire.',
            'Un tasto vale un semitono. I numeri indicano le posizioni. Al dodicesimo tasto la nota è un’ottava sopra la corda a vuoto.',
            'Une case vaut un demi-ton. Les numéros indiquent les positions. À la douzième case, la note est une octave au-dessus de la corde à vide.',
            'Ein Bund entspricht einem Halbton. Die Bundnummern geben die Position an. Bund 12 klingt eine Oktave höher als die leere Saite.',
          ),
        ],
      ],
      [
        tr(
          'Read the symbols',
          'Leia os símbolos',
          'Lee los símbolos',
          'Leggere i simboli',
          'Lire les symboles',
          'Die Zeichen lesen',
        ),
        [
          tr(
            'The seven natural pitches each have a color. The five pitches between them use white circles. A pitch keeps its color when its name changes. A black ring marks the scale tonic or chord root.',
            'As sete alturas naturais têm cores próprias. As cinco alturas entre elas aparecem em círculos brancos. A cor se mantém quando o nome muda. O anel preto marca a tônica da escala ou a fundamental do acorde.',
            'Las siete alturas naturales tienen colores propios. Las cinco alturas intermedias llevan círculos blancos. El color se conserva al cambiar el nombre. El anillo negro marca la tónica de la escala o la fundamental del acorde.',
            'Le sette altezze naturali hanno colori distinti. Le cinque altezze intermedie usano cerchi bianchi. Il colore si conserva al cambiare del nome. L’anello nero indica la tonica della scala o la fondamentale dell’accordo.',
            'Les sept hauteurs naturelles ont chacune une couleur. Les cinq hauteurs intermédiaires sont en blanc. La couleur reste la même quand le nom change. L’anneau noir marque la tonique de la gamme ou la fondamentale de l’accord.',
            'Die sieben Stammtöne haben eigene Farben. Die fünf dazwischenliegenden Tonhöhen erscheinen weiß. Die Farbe bleibt gleich, wenn sich der Name ändert. Der schwarze Ring markiert den Grundton der Skala oder des Akkords.',
          ),
          tr(
            'R marks the scale tonic or chord root on small maps. Degrees express intervals from that note. The signs ♯ and ♭ mean sharp and flat.',
            'Nos mapas pequenos, T indica tônica e F indica fundamental. Os graus expressam intervalos a partir dessa nota. Os sinais ♯ e ♭ indicam sustenido e bemol.',
            'En los mapas pequeños, T indica tónica y F indica fundamental. Los grados expresan intervalos desde esa nota. Los signos ♯ y ♭ indican sostenido y bemol.',
            'Nei piccoli diagrammi T indica la tonica e F la fondamentale. I gradi misurano gli intervalli da questa nota. ♯ indica il diesis, ♭ il bemolle.',
            'Dans les petits diagrammes, T désigne la tonique et F la fondamentale. Les degrés indiquent les intervalles depuis cette note. ♯ signifie dièse et ♭ bémol.',
            'G kennzeichnet in kleinen Diagrammen den Grundton der Skala oder des Akkords. Die Stufen geben die Intervalle zum Grundton an. ♯ steht für ein Kreuz, ♭ für ein Be.',
          ),
          tr(
            'C♯ and D♭ name the same pitch. The scale degree determines which letter to use. For example, the seventh of F♯ major is E♯.',
            'C♯ e D♭ indicam a mesma altura. O grau determina a letra: o 7º grau de F♯ maior é E♯. A = lá, B = si, C = dó, D = ré, E = mi, F = fá, G = sol.',
            'C♯ y D♭ indican la misma altura. El grado determina la letra: el 7.º grado de F♯ mayor es E♯. A = la, B = si, C = do, D = re, E = mi, F = fa, G = sol.',
            'C♯ e D♭ indicano lo stesso suono. Il grado determina la lettera: il settimo grado di F♯ maggiore è E♯. A = la, B = si, C = do, D = re, E = mi, F = fa, G = sol.',
            'C♯ et D♭ ont la même hauteur. Le degré détermine la lettre : le septième degré de F♯ majeur est E♯. A = la, B = si, C = do, D = ré, E = mi, F = fa, G = sol.',
            'C♯ und D♭ klingen gleich. Die Stufe bestimmt den Buchstaben: Die siebte Stufe von Fis-Dur ist E♯. Im Heft gelten internationale Notennamen: B entspricht dem deutschen H, B♭ dem deutschen B.',
          ),
        ],
      ],
      [
        tr(
          'Use the maps',
          'Use os mapas',
          'Usa los mapas',
          'Usare i diagrammi',
          'Utiliser les diagrammes',
          'Mit Diagrammen üben',
        ),
        [
          initial.instrument === 'bass'
            ? tr(
                'Each small map shows a playable octave. Start at its marked root and follow the degrees up and back. The heading identifies the starting string. The full map shows every scale or chord tone.',
                'Cada mapa pequeno mostra uma oitava. Comece na tônica marcada e siga os graus na subida e na volta. O título indica a corda inicial. O mapa completo mostra as notas da escala ou do acorde.',
                'Cada diagrama pequeño muestra una octava. Empieza en la tónica marcada y sigue los grados al subir y bajar. El título indica la cuerda inicial. El diapasón completo muestra las notas de la escala o el acorde.',
                'Ogni piccolo diagramma mostra un’ottava. Parti dalla tonica indicata e segui i gradi in salita e in discesa. Il titolo indica la corda iniziale. La tastiera completa mostra le note della scala o dell’accordo.',
                'Chaque petit diagramme montre une octave. Partez de la tonique indiquée et suivez les degrés en montant et en descendant. Le titre indique la corde de départ. Le manche entier montre toutes les notes de la gamme ou de l’accord.',
                'Jedes kleine Diagramm zeigt eine Oktave. Beginne am markierten Grundton und folge den Stufen aufwärts und zurück. Der Titel nennt die Startsaite. Das ganze Griffbrett zeigt alle Skalen- oder Akkordtöne.',
              )
            : tr(
                'Small maps show the labeled fingering system: compact CAGED, two, three, or four notes per string, or pentatonic shapes with blue notes. Some patterns shift along the neck. Black rings mark tonics. Unsupported setups keep the full note map.',
                'Os mapas pequenos indicam o sistema: CAGED compacto, duas, três ou quatro notas por corda, ou pentatônicas com blue notes. Alguns desenhos se deslocam pelo braço. Anéis pretos marcam tônicas. Os demais casos usam o mapa completo.',
                'Los mapas pequeños indican el sistema: CAGED compacto, dos, tres o cuatro notas por cuerda, o pentatónicas con notas de blues. Algunos patrones se desplazan por el diapasón. Los círculos negros marcan las tónicas. Los demás casos usan el mapa completo.',
                'I piccoli diagrammi mostrano il sistema indicato: posizioni CAGED, due, tre o quattro note per corda, o pentatoniche con blue note. Alcune forme richiedono uno spostamento. Gli anelli neri indicano le toniche. In assenza di diteggiature rimane la tastiera completa.',
                'Les petits diagrammes indiquent les doigtés : CAGED, deux à quatre notes par corde ou pentatoniques avec blue notes. Certaines positions demandent un démanché. Les anneaux noirs indiquent les toniques. À défaut de doigté, le manche entier est affiché.',
                'Die kleinen Diagramme zeigen CAGED-Lagen, zwei, drei oder vier Töne pro Saite oder Pentatonik mit Blue Notes. Manche erfordern Lagenwechsel. Schwarze Ringe markieren Grundtöne. Gibt es keinen Fingersatz, siehst du das ganze Griffbrett.',
              ),
          tr(
            'The staff shows the pitches used by the patterns. Without a pattern, it shows a playable range of the scale. Guitar and bass notation is written one octave above the sounding pitch.',
            'A pauta mostra as alturas usadas nos desenhos. Sem um desenho, mostra uma região tocável da escala. A notação da guitarra e do baixo fica uma oitava acima do som real.',
            'El pentagrama muestra las alturas de los patrones. Si no hay un patrón, muestra un registro tocable de la escala. La guitarra y el bajo se escriben una octava por encima del sonido real.',
            'Il pentagramma mostra le altezze delle diteggiature. Se non sono disponibili, mostra un registro suonabile della scala. Chitarra e basso si scrivono un’ottava sopra il suono reale.',
            'La portée indique les hauteurs des doigtés disponibles. Sans doigté, elle présente une partie jouable de la gamme. La guitare et la basse s’écrivent une octave au-dessus de leur son réel.',
            'Die Noten zeigen die Tonhöhen der Griffmuster. Ohne Griffmuster siehst du einen spielbaren Bereich der Skala. Gitarre und Bass werden eine Oktave höher notiert als sie klingen.',
          ),
          tr(
            'Start with three notes. Repeat a rhythm, leave a rest, and vary the ending. Listen before adding more notes.',
            'Comece com três notas. Repita um ritmo, deixe uma pausa e varie o final. Ouça antes de acrescentar mais notas.',
            'Empieza con tres notas. Repite un ritmo, deja un silencio y varía el final. Escucha antes de añadir más notas.',
            'Inizia con tre note. Ripeti un ritmo, lascia una pausa e varia il finale. Ascolta prima di aggiungere altre note.',
            'Commencez avec trois notes. Répétez un rythme, laissez un silence et variez la fin. Écoutez avant d’ajouter des notes.',
            'Beginne mit drei Tönen. Wiederhole einen Rhythmus, lass eine Pause und variiere den Schluss. Höre erst hin, bevor du weitere Töne hinzufügst.',
          ),
        ],
      ],
    ];
    columns.forEach(([title, paragraphs], i) => {
      const gap = 22,
        width = (R - M - 2 * gap) / 3;
      const x = M + i * (width + gap);
      line(page, x, 126, x + width, 126, rule, 1);
      text(page, x, 149, title, 14, bold, accent, width);
      let y = 174;
      for (const value of paragraphs) y = para(page, x, y, value, width, 9.1, 13.3) + 10;
    });
    line(page, M, 408, R, 408);
    text(
      page,
      M,
      430,
      tr(
        'THE SAME NOTE COLORS THROUGHOUT THE GUIDE',
        'AS MESMAS CORES EM TODO O GUIA',
        'LOS MISMOS COLORES EN TODA LA GUÍA',
        'GLI STESSI COLORI PER LE NOTE IN TUTTA LA GUIDA',
        'LES MÊMES COULEURS DE NOTES DANS TOUT LE GUIDE',
        'GLEICHE FARBEN FÜR GLEICHE TÖNE',
      ),
      7.4,
      bold,
      muted,
    );
    [0, 2, 4, 5, 7, 9, 11].forEach((pc, i) => {
      const x = M + 11 + i * 47;
      note(page, x, 454, pc, false, 10.5, midiName(pc + 60).replace(/\d+$/, ''));
    });
    text(
      page,
      423,
      449,
      tr(
        'Sounding open-string pitches',
        'Som real das cordas soltas',
        'Alturas reales de las cuerdas al aire',
        'Altezze reali delle corde a vuoto',
        'Hauteurs réelles des cordes à vide',
        'Klingende Tonhöhen der leeren Saiten',
      ),
      7.6,
      bold,
      muted,
    );
    text(page, 423, 468, pitches(initial, true), 9, body, ink, R - 423);
    callout(
      page,
      M,
      495,
      R - M,
      tr(
        'BEFORE PLAYING OVER A BACKING TRACK',
        'ANTES DE TOCAR COM UMA BACKING TRACK',
        'ANTES DE TOCAR CON UNA PISTA DE ACOMPAÑAMIENTO',
        'PRIMA DI SUONARE SU UNA BASE',
        'AVANT DE JOUER SUR UN ACCOMPAGNEMENT',
        'VOR DEM SPIELEN MIT BEGLEITUNG',
      ),
      tr(
        'Confirm the key and chord symbols. A scale offers a collection of notes. Listen and target the current chord’s tones.',
        'Confira a tonalidade e as cifras. A escala oferece um conjunto de notas. Ouça e busque as notas do acorde atual.',
        'Comprueba la tonalidad y el cifrado de los acordes. Usa las notas de la escala para improvisar y escucha qué notas encajan con el acorde que suena.',
        'Controlla la tonalità e le sigle degli accordi. La scala offre un insieme di note: ascolta e punta a quelle dell’accordo in corso.',
        'Vérifiez la tonalité et les symboles d’accords. La gamme fournit une palette de notes. Écoutez l’harmonie et visez les notes de l’accord en cours.',
        'Prüfe Tonart und Akkordsymbole. Die Skala gibt dir einen Tonvorrat. Höre auf die Harmonie und steuere Töne des gerade klingenden Akkords an.',
      ),
    );
    footer(
      page,
      plan.readingPage,
      tr(
        'Middle C = C4.',
        'Dó central = C4.',
        'Do central = C4.',
        'Do centrale = C4.',
        'Do central = C4.',
        'Mittleres C = C4.',
      ),
    );
  }
  function formulaRow(page, s) {
    const top = 89,
      end = M + (R - M) * 0.69;
    const rowX = M + Math.min(64, bold.widthOfTextAtSize(t.formula, 9) + 10);
    const names = spellScale(s);
    const cell = Math.min(36, (end - rowX) / names.length);
    text(page, M, top + 16, t.formula, 9, bold, muted);
    names.forEach((name, i) => {
      const x = rowX + i * cell,
        center = x + (cell - 3) / 2;
      rect(page, x, top, cell - 3, 25, pale, rule);
      text(
        page,
        center,
        top + 10,
        prettyDegree(s.scaleData.formula[i]),
        8.1,
        bold,
        ink,
        cell - 7,
        'center',
      );
      const pc = (s.root + s.scaleData.intervals[i]) % 12;
      const nameWidth = Math.min(cell - 14, bold.widthOfTextAtSize(name, 8.2));
      circle(
        page,
        center - nameWidth / 2 - 2.8,
        top + 18,
        2.4,
        PALETTE[pc] ?? '#ffffff',
        PALETTE[pc] ? undefined : ink,
      );
      text(page, center + 2.8, top + 21, name, 8.2, bold, ink, cell - 14, 'center');
    });
    const legendX = end + 14;
    note(page, legendX, top + 9, s.root, true, 5.5, rootMarker(s), true);
    text(page, legendX + 12, top + 12, rootTerm(s), 8.5, bold, ink, R - legendX - 12);
    text(
      page,
      legendX - 6,
      top + 24,
      s.hand === 'left' ? t.nutRight : t.nutLeft,
      7.8,
      body,
      muted,
      R - legendX + 6,
    );
  }
  function drawStaff(page, layout, top, height, focus) {
    const x = M + 118;
    const scale = Math.min(1.05, (R - x) / layout.width, height / layout.height);
    const left = x + (R - x - layout.width * scale) / 2;
    const margin = (height - layout.height * scale) / 2;
    const sx = (v) => left + scale * v;
    const sy = (v) => top + margin + scale * (v - layout.top);
    text(page, M, top + height / 2 - 3, t[layout.clef.label], 10, bold, ink, 107);
    const range = [layout.notes[0]?.name, layout.notes.at(-1)?.name]
      .filter(Boolean)
      .join(' – ');
    text(
      page,
      M,
      top + height / 2 + 11,
      `${t.writtenPitch}  ${range}`,
      7.5,
      body,
      muted,
      107,
    );
    for (let i = 0; i < 5; i++)
      line(
        page,
        sx(6),
        sy(staffTop + i * lineGap),
        sx(layout.width - 5),
        sy(staffTop + i * lineGap),
        ink,
        0.7 * scale,
      );
    // Bravura clefs use a y-up baseline; ordinary SVG paths and the staff layout use y-down.
    page.pushOperators(
      pdf.pushGraphicsState(),
      pdf.translate(sx(13), H - sy(staffY(layout.clef.anchorStep, layout.clef))),
      pdf.scale(1, -1),
    );
    page.drawSvgPath(layout.clef.path, {
      x: 0,
      y: 0,
      scale: (scale * lineGap) / 250,
      color: ink,
    });
    page.pushOperators(pdf.popGraphicsState());
    const accidental = (sign, x, y) =>
      page.drawSvgPath(accidentalPaths[sign], {
        x: sx(x),
        y: H - sy(y),
        scale,
        borderColor: ink,
        borderWidth: 1.25,
      });
    keySignaturePositions(layout.signature, layout.clef).forEach(({ sign, x, y }) =>
      accidental(sign, x, y),
    );
    for (const n of layout.notes) {
      for (const delta of n.ledger)
        line(
          page,
          sx(n.x - 9),
          sy(n.y + delta),
          sx(n.x + 9),
          sy(n.y + delta),
          ink,
          scale,
        );
      n.glyphs.forEach((sign, i) =>
        accidental(sign, n.x - 12 - (n.glyphs.length - 1 - i) * 8, n.y),
      );
      const stemX = sx(n.x + (n.stemEnd < 0 ? 4.5 : -4.5));
      line(page, stemX, sy(n.y), stemX, sy(n.y + n.stemEnd), ink, scale);
      page.drawEllipse({
        x: sx(n.x),
        y: H - sy(n.y),
        xScale: 5.1 * scale,
        yScale: 3.55 * scale,
        rotate: pdf.degrees(23),
        color: focus ? color(n.fill) : ink,
        borderColor: ink,
        borderWidth: focus ? 0.65 * scale : 0,
      });
    }
  }
  function scalePage(entry) {
    const s = entry.state,
      page = pages[entry.number - 1];
    const { system, patterns } = practicePatterns(s);
    const focused = plan.readingPage
      ? undefined
      : patterns.find((p) => p.id === input.range);
    const points = focused && new Set(focused.points.map((p) => `${p.row}:${p.fret}`));
    const model = boardModel(s);
    const staff = staffLayout(
      {
        state: s,
        points: focused ? focused.points : practiceStaffPoints(model, patterns),
      },
      focused,
    );
    masthead(page, s);
    const title = `${rootName(s)} ${scaleName(s.scaleData, s.lang)}`;
    text(page, M, 77, title, 24, bold, ink, (R - M) * 0.68);
    const family = FAMILIES[s.scaleData.family]?.[s.lang] ?? t.custom;
    text(page, R, 74, family, 9, bold, accent, (R - M) * 0.3, 'right');
    formulaRow(page, s);
    const boardTop = 137;
    const manyPositions = patterns.length > 4;
    const dense = patterns.length > 6;
    const boardHeight = dense ? 94 : manyPositions ? 104 : patterns.length ? 120 : 184;
    const boardEnd = boardTop + boardHeight + 25;
    const staffHeight = dense ? 48 : manyPositions ? 54 : patterns.length ? 66 : 80;
    const sectionTop = boardEnd + staffHeight + 16;
    const top = sectionTop + 17;
    const width = R - M;
    const { boxes, neckWidth } = guidePatternLayout(patterns, {
      neck: guideBoardLayout(s, { width, height: boardHeight }),
      strings: s.strings,
      width,
      height: H - 41 - top,
    });
    const neckX = M + (width - neckWidth) / 2;
    rect(page, neckX - 5, boardTop - 17, neckWidth + 10, boardEnd - boardTop + 17, pale);
    drawBoard(page, s, {
      x: neckX,
      width: neckWidth,
      top: boardTop,
      height: boardHeight,
      focus: points,
      focusPattern: focused,
    });
    drawStaff(page, staff, boardEnd + 3, staffHeight, focused);
    line(page, M, sectionTop - 5, R, sectionTop - 5);
    if (patterns.length) {
      const caption = `${t.patterns} · ${t.patternSystems[system]}`;
      text(page, M, sectionTop + 9, caption, 9.5, bold, accent, R - M);
      patterns.forEach((pattern, i) => {
        const box = boxes[i],
          x = M + box.x,
          y = top + box.top;
        const label = `${t.pattern} ${pattern.number}`;
        const detail =
          s.instrument === 'bass'
            ? `${t.string} ${pattern.startRow + 1}`
            : pattern.shape
              ? t.patternShape.replace('{shape}', pattern.shape)
              : `${t.degree} ${pattern.startDegree}`;
        if (pattern === focused) {
          rect(page, x, y - 17, box.captionWidth, 15, color('#e6f2eb'));
          rect(page, x, y - 17, 2, 15, accent);
        }
        text(
          page,
          x + 4,
          y - 7,
          `${label} · ${detail}`,
          8.2,
          bold,
          pattern === focused ? accent : ink,
          box.captionWidth - 8,
        );
        drawBoard(page, s, {
          x,
          top: y,
          width: box.width,
          height: box.height,
          lo: pattern.lo,
          hi: pattern.hi,
          small: true,
          route: pattern,
          pattern: s.instrument !== 'bass',
        });
      });
    } else {
      text(page, M, sectionTop + 13, t.patterns, 10, bold, accent);
      para(page, M, sectionTop + 34, t.patternUnavailable, R - M, 10, 15);
    }
    footer(page, entry.number);
  }
  if (plan.readingPage) cover();
  const chartIndex =
    scope === 'catalog'
      ? [...chartEntries].sort((a, b) =>
          a.state.scaleData.name[initial.lang].localeCompare(
            b.state.scaleData.name[initial.lang],
            LANGUAGES[initial.lang].tag,
          ),
        )
      : [];
  for (let i = 0; i < plan.extra; i++) {
    const page = pages[i + 1];
    head(
      page,
      initial,
      plan.entries[i + 1].title,
      tr(
        'Click a title to go directly to its scale map.',
        'Clique em um título para abrir o mapa da escala.',
        'Haz clic en un título para ir al mapa de la escala.',
        'Seleziona un titolo per aprire il relativo diagramma.',
        'Cliquez sur un titre pour accéder au diagramme correspondant.',
        'Klicke auf einen Titel, um direkt zum zugehörigen Diagramm zu springen.',
      ),
    );
    if (scope === 'catalog') {
      const entries = chartIndex.slice(
        i * catalogIndexCapacity,
        (i + 1) * catalogIndexCapacity,
      );
      contents(page, entries, { top: 128, step: 17.5, columns: catalogIndexColumns });
    } else {
      contents(page, plan.entries.slice(32 + i * 48, 32 + (i + 1) * 48), {
        top: 128,
        step: 17.5,
      });
    }
    footer(
      page,
      i + 2,
      tr(
        'Clickable contents / one scale per reference page.',
        'Sumário clicável / uma escala por página de referência.',
        'Índice con enlaces / una escala por página de referencia.',
        'Indice interattivo / una scala per pagina.',
        'Sommaire interactif / une gamme par page.',
        'Anklickbares Inhaltsverzeichnis / eine Skala pro Seite.',
      ),
    );
  }
  if (plan.readingPage) readingGuide();
  let rendered = 0;
  for (const entry of chartEntries) {
    checkAbort();
    scalePage(entry);
    progress(++rendered, variants.length);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  function addBookmarks(parent, parentRef, entries) {
    const refs = entries.map(() => doc.context.nextRef());
    entries.forEach((entry, i) => {
      const item = doc.context.obj({
        Title: PDFHexString.fromText(entry.title),
        Parent: parentRef,
        Dest: [pages[entry.number - 1].ref, 'Fit'],
      });
      if (i) item.set(PDFName.of('Prev'), refs[i - 1]);
      if (i + 1 < refs.length) item.set(PDFName.of('Next'), refs[i + 1]);
      if (entry.children) {
        addBookmarks(item, refs[i], entry.children);
        item.set(PDFName.of('Count'), doc.context.obj(-entry.children.length));
      }
      doc.context.assign(refs[i], item);
    });
    parent.set(PDFName.of('First'), refs[0]);
    parent.set(PDFName.of('Last'), refs.at(-1));
  }
  if (plan.readingPage) {
    const bookmarks =
      scope === 'catalog'
        ? [...plan.entries.filter((e) => e.type !== 'scale'), ...catalogFamilies]
        : plan.entries;
    const outline = doc.context.obj({ Type: 'Outlines', Count: bookmarks.length });
    const outlineRef = doc.context.register(outline);
    addBookmarks(outline, outlineRef, bookmarks);
    doc.catalog.set(PDFName.of('Outlines'), outlineRef);
  }
  doc.catalog.set(PDFName.of('Lang'), PDFString.of(LANGUAGES[initial.lang].tag));
  doc.setTitle(
    `Tukany · ${instrument(initial)} · ${editionTitle} · ${tuningName(initial)}`,
  );
  doc.setAuthor('Lucas Marques');
  doc.setSubject(
    tr(
      'Guided practice scale maps',
      'Mapas de escalas para prática guiada',
      'Mapas de escalas para práctica guiada',
      'Diagrammi di scale per esercizi guidati',
      'Diagrammes de gammes et exercices guidés',
      'Skalendiagramme für angeleitetes Üben',
    ),
  );
  doc.setKeywords([
    'Tukany',
    'scales',
    instrument(initial),
    hand(initial),
    LANGUAGES[initial.lang].tag,
    'CC BY 4.0',
  ]);
  checkAbort();
  return doc.save();
}
