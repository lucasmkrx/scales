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
  mod,
  pitchPreference,
} from './music.mjs';
import { FAMILIES } from './catalog.mjs';
import { guideBoardLayout, bassRoute, guidePlan } from './guide-layout.mjs';
import { copy } from './i18n.mjs';
import { scalePatterns } from './patterns.mjs';
import { LANGUAGES, tuningName as localizedTuningName } from './locales.mjs';
const W = 841.89,
  H = 595.28,
  M = 44,
  R = W - M;

export async function createAtlas(
  input,
  { scope = 'selected', allKeys = false, asset, progress = () => {}, signal } = {},
) {
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
  const initial = selection({ ...input, allNotes: false }),
    t = copy[initial.lang];
  const tr = (en, pt, es) => ({ en, pt, es })[initial.lang],
    doc = await PDFDocument.create();
  doc.registerFontkit(globalThis.fontkit);
  const [bodyBytes, boldBytes, headBytes, logoBytes] = await Promise.all(
    ['DejaVuSans.ttf', 'DejaVuSans-Bold.ttf', 'Literata-Bold.ttf']
      .map((name) => get(`assets/fonts/${name}`))
      .concat(get('assets/marques-and-co.png')),
  );
  const body = await doc.embedFont(bodyBytes, { subset: true }),
    bold = await doc.embedFont(boldBytes, { subset: true }),
    heading = await doc.embedFont(headBytes, { subset: true });
  const logo = await doc.embedPng(logoBytes);
  const logoSize = logo.scale(84 / logo.width);
  const color = (hex) =>
    rgb(
      ...hex
        .replace('#', '')
        .match(/../g)
        .map((v) => parseInt(v, 16) / 255),
    );
  const ink = color('#20343f'),
    muted = color('#465865'),
    rule = color('#d0dbe2'),
    grid = color('#bbc7ce'),
    paper = rgb(0.985, 0.99, 0.995),
    pale = color('#eff3f7');
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
  const plan = guidePlan(variants, {
    coverTitle: tr('Cover and contents', 'Capa e sumário', 'Portada e índice'),
    readTitle: tr('How to use this guide', 'Como usar este guia', 'Cómo usar esta guía'),
    contentsTitle: tr(
      'Contents, continued',
      'Continuação do sumário',
      'Continuación del índice',
    ),
  });
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
      pdf.setFillingColor(color(fretFill(0))),
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
  function headingRuns(str) {
    return String(str)
      .split(/([♯♭]+)/)
      .filter(Boolean)
      .map((value) => ({ value, font: /[♯♭]/.test(value) ? bold : heading }));
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
    const runs = font === heading ? headingRuns(str) : [{ value: str, font }];
    const measure = (s) =>
      runs.reduce((n, r) => n + r.font.widthOfTextAtSize(r.value, s), 0);
    if (width) size = Math.min(size, (size * width) / Math.max(measure(size), 1));
    let xx =
      x -
      (align === 'right' ? measure(size) : align === 'center' ? measure(size) / 2 : 0);
    for (const run of runs) {
      page.drawText(run.value, { x: xx, y: H - top, size, font: run.font, color: fill });
      xx += run.font.widthOfTextAtSize(run.value, size);
    }
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
  function note(page, x, y, pc, root, r, label = '', small = false) {
    const fill = PALETTE[pc] ?? '#ffffff';
    if (root) {
      circle(page, x, y, r + 1.7, '#111111');
      circle(page, x, y, r + 0.6, '#ffffff');
    }
    circle(page, x, y, r, fill, fill === '#ffffff' ? '#8fa2ae' : undefined);
    if (label) {
      const size = Math.min(
          small ? 7.2 : 11.2,
          r * 1.05,
          label.includes('/') ? r : label.length > 2 ? r * 0.78 : 20,
        ),
        fill = [0, 5, 7, 9, 11].includes(pc) ? rgb(1, 1, 1) : ink;
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
    s.scaleData.family === 'arpeggio' ? t.chordRoot : tr('Tonic', 'Tônica', 'Tónica');
  const rootMarker = (s) =>
    s.scaleData.family === 'arpeggio' ? t.chordRootMarker : t.rootMarker;
  const pitchNames = (s, octaves = false) =>
    s.tuningData.notes.map((m) =>
      octaves ? midiName(m, pitchPreference(s)) : noteName(m, pitchPreference(s)),
    );
  const pitches = (s, octaves = false) => pitchNames(s, octaves).join(' - ');
  function tuningText(page, s, x, top, width, size, align = 'left') {
    const names = pitchNames(s),
      value = names.join(' - ');
    if (bold.widthOfTextAtSize(value, size) > width) {
      const split = Math.ceil(names.length / 2);
      for (const [i, part] of [names.slice(0, split), names.slice(split)].entries())
        text(
          page,
          x,
          top - 4 + i * 11,
          part.join(' - '),
          Math.min(size, 9),
          bold,
          ink,
          width,
          align,
        );
    } else text(page, x, top, value, size, bold, ink, width, align);
  }
  function footer(page, n, caption = t.oneFret) {
    text(page, M, 566, caption, 6.8, body, muted, 620);
    text(
      page,
      R,
      566,
      `${String(n).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}`,
      7.1,
      body,
      muted,
      undefined,
      'right',
    );
    text(page, 30, 589, 'Tukany / Lucas Marques / CC BY 4.0', 5.5, body, muted);
    page.drawImage(logo, {
      x: (W - logoSize.width) / 2,
      y: 16 - logoSize.height,
      ...logoSize,
    });
  }
  function head(page, s, title, subtitle = '') {
    text(
      page,
      M,
      28,
      `${instrument(s).toUpperCase()} / ${s.strings} ${t.strings.toUpperCase()} / ${s.frets} ${t.frets.toUpperCase()} / ${hand(s).toUpperCase()}`,
      7.1,
      bold,
      muted,
      510,
    );
    text(page, R, 28, tuningName(s).toUpperCase(), 6.9, bold, muted, 218, 'right');
    tuningText(page, s, R, 50, 218, 11.4, 'right');
    text(
      page,
      R,
      70,
      tr(
        'lowest-pitched string to highest',
        'da corda mais grave à mais aguda',
        'de la cuerda más grave a la más aguda',
      ),
      7.2,
      body,
      muted,
      218,
      'right',
    );
    text(page, M, 62, title, 29, heading, ink, 515);
    if (subtitle) text(page, M, 83, subtitle, 8.9, body, muted, 515);
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
      pattern = false,
      compact = false,
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
          color(fretFill(f)),
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
          color(fretFill(f)),
          grid,
        );
      }
    }
    model.rows.forEach((m, row) => {
      const stroke = color('#94a5af'),
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
          baseline = l.y(row, lo) + (small || compact ? 2 : 9);
        if (!small && !compact)
          text(
            page,
            l.labelX,
            l.y(row, 0) - 2,
            row + 1,
            9.4,
            bold,
            ink,
            undefined,
            'center',
          );
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
      if (miniature && PALETTE[n.pc] === undefined) continue;
      const [a, b] = l.edges(n.fret),
        radius = Math.min(
          miniature ? 2.4 : small ? (route ? 9.2 : 5.4) : 12.1,
          Math.abs(a - b) / 2 - 2,
          l.rowGap / 2 - 2.1,
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
      );
    }
    if (!miniature) {
      if (!small) {
        text(
          page,
          l.labelX,
          top - 11,
          tr('STRING', 'CORDA', 'CUERDA'),
          6.4,
          bold,
          muted,
          undefined,
          'center',
        );
        text(
          page,
          l.center(0),
          top - 4,
          tr('OPEN', 'SOLTA', 'AL AIRE'),
          6.6,
          bold,
          muted,
          undefined,
          'center',
        );
      }
      for (let f = lo; f <= hi; f++) {
        const yy = small ? top + height + 12 : l.edgeY(l.center(f), true) + 18;
        text(
          page,
          l.center(f),
          yy,
          f,
          small ? 6.6 : 8.2,
          body,
          muted,
          undefined,
          'center',
        );
        if (!small && !compact && f > 0 && [0, 3, 5, 7, 9].includes(f % 12)) {
          const count = f % 12 === 0 ? 2 : 1;
          for (let d = 0; d < count; d++)
            circle(
              page,
              l.center(f) + (d - (count - 1) / 2) * 7,
              yy + 12,
              2.8,
              '#111111',
            );
        }
      }
      if (!small && !compact)
        text(
          page,
          l.center(0),
          l.edgeY(l.center(0), true) + 35,
          tr('NUT', 'PESTANA', 'CEJUELA'),
          6,
          bold,
          muted,
          undefined,
          'center',
        );
    }
    return l;
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
  function contents(page, entries, { x = M, top = 180, width = R - M, step = 20 } = {}) {
    entries.forEach((entry, i) => {
      const col = i % 2,
        row = Math.floor(i / 2),
        xx = x + (col * width) / 2,
        yy = top + row * step;
      if (!col) line(page, x, yy - 11, x + width, yy - 11, rule, 0.4);
      text(page, xx, yy, String(entry.number).padStart(2, '0'), 7.5, bold, muted);
      text(page, xx + 22, yy, entry.title, 7.8, body, ink, width / 2 - 31);
      addLink(page, [xx, yy - 10, xx + width / 2 - 5, yy + 5], entry.number);
    });
  }
  function callout(page, x, top, width, title, description) {
    rect(page, x, top, width, 34, pale);
    rect(page, x, top, 3, 34, ink);
    text(page, x + 12, top + 13, title, 7.8, bold, ink, width - 24);
    text(page, x + 12, top + 26, description, 7.1, body, muted, width - 24);
  }
  function cover() {
    const page = pages[0],
      panel = 279,
      cx = 306,
      cw = R - cx;
    rect(page, 13, 0, panel - 13, 577, rgb(0.954, 0.968, 0.975));
    Object.values(PALETTE).forEach((v, i) =>
      rect(page, 13 + (i * (W - 26)) / 7, 0, (W - 26) / 7, 5, color(v)),
    );
    text(
      page,
      M,
      39,
      tr(
        'SCALE MAPS + GUIDED PRACTICE',
        'MAPAS DE ESCALAS + PRÁTICA GUIADA',
        'MAPAS DE ESCALAS + PRÁCTICA GUIADA',
      ),
      7.1,
      bold,
      muted,
      210,
    );
    text(
      page,
      M - 3,
      111,
      instrument(initial),
      initial.instrument === 'bass' ? 58 : 48,
      heading,
      ink,
      211,
    );
    text(
      page,
      M,
      158,
      tr('Notes, scales,', 'Notas, escalas', 'Notas, escalas'),
      22.5,
      heading,
      ink,
      214,
    );
    text(
      page,
      M,
      190,
      tr('and improvisation', 'e improvisação', 'e improvisación'),
      24,
      heading,
      ink,
      214,
    );
    para(
      page,
      M,
      219,
      tr(
        'For experienced TAB players who want to understand the notes and create their own phrases.',
        'Para quem já toca por TAB e quer entender as notas e criar suas frases.',
        'Para quienes ya leen tablaturas y quieren comprender las notas y crear sus propias frases.',
      ),
      212,
      9.5,
      14,
    );
    line(page, M, 263, 248, 263);
    text(page, M, 287, tuningName(initial).toUpperCase(), 7.1, bold, muted, 206);
    tuningText(page, initial, M, 310, 206, 12.6);
    text(
      page,
      M,
      328,
      tr(
        'lowest-pitched string to highest',
        'da corda mais grave à mais aguda',
        'de la cuerda más grave a la más aguda',
      ),
      7.3,
      body,
      muted,
      206,
    );
    text(
      page,
      M,
      343,
      `${initial.strings} ${t.strings.toUpperCase()} / ${initial.frets} ${t.frets.toUpperCase()}`,
      6.4,
      bold,
      muted,
      206,
    );
    rect(page, 34, 350, 228, 112, rgb(1, 1, 1), rule);
    text(
      page,
      M,
      368,
      `${hand(initial).toUpperCase()} ${tr('FRETBOARD', '/ MAPA DO BRAÇO', '/ DIAPASÓN')}`,
      6.7,
      bold,
      muted,
      204,
    );
    drawBoard(
      page,
      {
        ...initial,
        scale: 'chromatic',
        scaleData: SCALES.find((s) => s.id === 'chromatic'),
      },
      { x: M - 10, top: 388, width: 214, height: 54, miniature: true },
    );
    text(
      page,
      M,
      493,
      tr(
        'NOTES / DEGREES / POSITIONS / PHRASING',
        'NOTAS / GRAUS / POSIÇÕES / FRASEADO',
        'NOTAS / GRADOS / POSICIONES / FRASEO',
      ),
      6.4,
      bold,
      muted,
      211,
    );
    para(
      page,
      M,
      516,
      tr(
        'Full fretboard maps, supported fingering patterns, and a starting point for backing tracks.',
        'Mapas completos, padrões de digitação disponíveis e um ponto de partida para backing tracks.',
        'Mapas del diapasón, patrones de digitación disponibles y un punto de partida para pistas de acompañamiento.',
      ),
      211,
      9.2,
      14,
    );
    text(
      page,
      M,
      558,
      `${hand(initial).toUpperCase()} / ${LANGUAGES[initial.lang].label.toUpperCase()}`,
      6.8,
      bold,
      muted,
      211,
    );
    text(
      page,
      cx,
      39,
      tr(
        'FOR PLAYERS WHO WANT TO UNDERSTAND',
        'PARA QUEM JÁ TOCA E QUER ENTENDER',
        'PARA QUIENES QUIEREN COMPRENDER',
      ),
      7.2,
      bold,
      muted,
      cw,
    );
    text(
      page,
      cx,
      87,
      tr('Inside this guide', 'Conteúdo do guia', 'Contenido de esta guía'),
      28,
      heading,
      ink,
      cw,
    );
    text(
      page,
      cx,
      115,
      tr(
        'Your instrument, tuning, and scales in the guided-book format.',
        'Seu instrumento, afinação e escalas no formato dos cadernos guiados.',
        'Tu instrumento, afinación y escalas en el formato de las guías de práctica.',
      ),
      8.7,
      body,
      muted,
      cw,
    );
    line(page, cx, 138, R, 138);
    text(
      page,
      cx,
      162,
      tr('CONTENTS / PAGES', 'SUMÁRIO / PÁGINAS', 'ÍNDICE / PÁGINAS'),
      7.6,
      bold,
      muted,
    );
    const entries = plan.entries.slice(0, 32);
    contents(page, entries, {
      x: cx,
      top: 185,
      width: cw,
      step: Math.min(25, 310 / Math.max(1, Math.ceil(entries.length / 2) - 1)),
    });
    if (entries.length <= 8) {
      text(
        page,
        cx,
        285,
        tr('YOUR SELECTION', 'SUA SELEÇÃO', 'TU SELECCIÓN'),
        7.3,
        bold,
        muted,
      );
      text(
        page,
        cx,
        315,
        variants.length === 1
          ? variants[0].title
          : tr(
              'Explore the selected collection',
              'Explore a coleção selecionada',
              'Explora la colección seleccionada',
            ),
        20,
        heading,
        ink,
        cw,
      );
      if (variants.length === 1) {
        text(page, cx, 340, spellScale(initial).join(' - '), 10.8, bold, ink, cw);
        text(
          page,
          cx,
          363,
          `${t.formula}  ${initial.scaleData.formula.map(prettyDegree).join('  ')}`,
          9,
          body,
          muted,
          cw,
        );
      }
      for (const [i, value] of [
        tr(
          'Find the notes with a black ring. Play a few slowly.',
          'Encontre as notas com anel preto. Toque algumas devagar.',
          'Busca las notas con un anillo negro. Toca unas pocas lentamente.',
        ),
        tr(
          'Repeat a rhythm, leave space, and change the ending.',
          'Repita um ritmo, deixe espaço e mude o final.',
          'Repite un ritmo, deja espacio y cambia el final.',
        ),
        tr(
          'Check the track’s chords and aim for a chord tone.',
          'Confira os acordes da base e mire em uma nota do acorde.',
          'Revisa los acordes de la pista y busca una nota del acorde.',
        ),
      ].entries())
        text(page, cx, 407 + i * 24, `0${i + 1}   ${value}`, 8.7, body, ink, cw);
    }
    callout(
      page,
      cx,
      517,
      cw,
      tr(
        'START WITH THE READING GUIDE',
        'COMECE PELAS INSTRUÇÕES',
        'COMIENZA CON LAS INSTRUCCIONES',
      ),
      tr(
        'Then use the maps to make short phrases and follow the chords.',
        'Depois, use os mapas para criar frases curtas e acompanhar os acordes.',
        'Después, usa los mapas para crear frases cortas y seguir los acordes.',
      ),
    );
    addLink(page, [cx, 517, R, 551], plan.readingPage);
    text(
      page,
      cx,
      566,
      `${pages.length} ${tr('pages / clickable contents', 'páginas / sumário clicável', 'páginas / índice con enlaces')}`,
      7,
      body,
      muted,
    );
    footer(page, 1, '');
  }
  function readingGuide() {
    const page = pages[plan.readingPage - 1];
    head(
      page,
      initial,
      tr('How to use this guide', 'Como usar este guia', 'Cómo usar esta guía'),
      tr(
        'Connect what you already play with the notes, degrees, and harmony.',
        'Conecte o que você já toca com as notas, os graus e a harmonia.',
        'Relaciona lo que ya tocas con las notas, los grados y la armonía.',
      ),
    );
    const columns = [
      [
        tr('Read the neck', 'Leia o braço', 'Lee el diapasón'),
        [
          initial.hand === 'left'
            ? tr(
                'The nut is on the right. Fret numbers and pitches rise toward the left. Fret 0 is an open string.',
                'A pestana fica à direita. A numeração das casas aumenta e as notas ficam mais agudas para a esquerda. A casa 0 é a corda solta.',
                'La cejuela está a la derecha. Los números de traste y la altura de las notas aumentan hacia la izquierda. El traste 0 es la cuerda al aire.',
              )
            : tr(
                'The nut is on the left. Fret numbers and pitches rise toward the right. Fret 0 is an open string.',
                'A pestana fica à esquerda. A numeração das casas aumenta e as notas ficam mais agudas para a direita. A casa 0 é a corda solta.',
                'La cejuela está a la izquierda. Los números de traste y la altura de las notas aumentan hacia la derecha. El traste 0 es la cuerda al aire.',
              ),
          tr(
            `From top to bottom, ${pitchNames(initial).reverse().join(', ')}. String 1 is the highest-pitched string. The bottom line is the lowest.`,
            `De cima para baixo, ${pitchNames(initial).reverse().join(', ')}. A corda 1 é a mais aguda. A linha inferior é a mais grave.`,
            `De arriba hacia abajo, ${pitchNames(initial).reverse().join(', ')}. La cuerda 1 es la más aguda. La línea inferior es la más grave.`,
          ),
          tr(
            'One fret raises the pitch a half step. Fret numbers identify positions; fret 12 is an octave above the open string.',
            'Uma casa eleva a nota em um semitom. Os números indicam posições; a casa 12 fica uma oitava acima da corda solta.',
            'Cada traste eleva la nota un semitono. Los números indican posiciones; el traste 12 está una octava por encima de la cuerda al aire.',
          ),
        ],
      ],
      [
        tr('Read the symbols', 'Leia os símbolos', 'Lee los símbolos'),
        [
          tr(
            'Each pitch keeps its color with either name. Accidentals use white circles. The black ring marks the scale tonic or chord root.',
            'Cada altura mantém sua cor com qualquer grafia. As notas alteradas usam círculos brancos. O anel preto marca a tônica da escala ou a fundamental do acorde.',
            'Cada altura conserva su color, incluso con otro nombre. Las notas alteradas usan círculos blancos. El anillo negro marca la tónica de la escala o la fundamental del acorde.',
          ),
          tr(
            'R marks the scale tonic or chord root on small maps. Degrees express intervals from that note. The signs ♯ and ♭ mean sharp and flat.',
            'Nos mapas pequenos, T indica tônica e F indica fundamental. Os graus expressam intervalos a partir dessa nota. Os sinais ♯ e ♭ indicam sustenido e bemol.',
            'En los mapas pequeños, T indica tónica y F indica fundamental. Los grados expresan intervalos desde esa nota. Los signos ♯ y ♭ indican sostenido y bemol.',
          ),
          tr(
            'C♯ and D♭ name the same pitch. The scale degree determines which letter to use. For example, the seventh of F♯ major is E♯.',
            'C♯ e D♭ indicam a mesma altura. O grau determina a letra: o 7º grau de F♯ maior é E♯. A = lá, B = si, C = dó, D = ré, E = mi, F = fá, G = sol.',
            'C♯ y D♭ indican la misma altura. El grado determina la letra: el 7.º grado de F♯ mayor es E♯. A = la, B = si, C = do, D = re, E = mi, F = fa, G = sol.',
          ),
        ],
      ],
      [
        tr('Use the maps', 'Use os mapas', 'Usa los mapas'),
        [
          initial.instrument === 'bass'
            ? tr(
                'The full map shows every scale or chord tone. Small maps give ascending octave routes from the two lowest strings. Follow the degrees, then reverse. If an octave is out of reach in your tuning, a nearby note map takes its place.',
                'O mapa completo mostra todas as notas da escala ou acorde. As rotas pequenas sobem uma oitava a partir das duas cordas graves. Siga os graus e volte. Se a afinação não permitir uma oitava, aparece um mapa de notas próximas.',
                'El mapa completo muestra las notas de la escala o del acorde. Los pequeños trazan recorridos de una octava desde las dos cuerdas más graves. Sigue los grados y regresa. Si la afinación impide completar la octava, aparece un mapa de notas cercanas.',
              )
            : tr(
                'Small maps show the labeled fingering system: compact CAGED, two, three, or four notes per string, or pentatonic shapes with blue notes. Some patterns shift along the neck. Black rings mark tonics. Unsupported setups keep the full note map.',
                'Os mapas pequenos indicam o sistema: CAGED compacto, duas, três ou quatro notas por corda, ou pentatônicas com blue notes. Alguns desenhos se deslocam pelo braço. Anéis pretos marcam tônicas. Os demais casos usam o mapa completo.',
                'Los mapas pequeños indican el sistema: CAGED compacto, dos, tres o cuatro notas por cuerda, o pentatónicas con notas de blues. Algunos patrones se desplazan por el diapasón. Los anillos negros marcan tónicas. Los demás casos usan el mapa completo.',
              ),
          tr(
            'TAB reads left to right in time. Changing the tuning changes the shapes. These notes are calculated for your selected tuning.',
            'A tablatura é lida da esquerda para a direita no tempo. Mudar a afinação muda os desenhos. Estas notas são calculadas para a afinação escolhida.',
            'Las tablaturas se leen de izquierda a derecha en el tiempo. Cambiar la afinación cambia los patrones. Aquí las notas se calculan para la afinación elegida.',
          ),
          tr(
            'Start with three notes. Repeat a rhythm, leave a rest, and vary the ending. Listen before adding more notes.',
            'Comece com três notas. Repita um ritmo, deixe uma pausa e varie o final. Ouça antes de acrescentar mais notas.',
            'Comienza con tres notas. Repite un ritmo, deja un silencio y varía el final. Escucha antes de agregar más notas.',
          ),
        ],
      ],
    ];
    columns.forEach(([title, paragraphs], i) => {
      const x = M + i * 258;
      text(page, x, 135, `0${i + 1}`, 9, bold, muted);
      text(page, x, 158, title, 16, heading, ink, 230);
      let y = 184;
      for (const value of paragraphs) y = para(page, x, y, value, 231, 9, 14) + 13;
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
      ),
      tr(
        'Confirm the key and chord symbols. A scale offers a collection of notes. Listen and target the current chord’s tones.',
        'Confira a tonalidade e as cifras. A escala oferece um conjunto de notas. Ouça e busque as notas do acorde atual.',
        'Confirma la tonalidad y el cifrado de los acordes. La escala ofrece un conjunto de notas. Escucha y busca las notas del acorde que está sonando.',
      ),
    );
    footer(
      page,
      plan.readingPage,
      tr(
        'Sounding pitches. Middle C = C4.',
        'Alturas reais. Dó central = C4.',
        'Alturas reales. Do central = C4.',
      ),
    );
  }
  function scaleLegend(page, s) {
    line(page, M, 506, R, 506);
    text(
      page,
      M,
      520,
      s.scaleData.family === 'arpeggio'
        ? tr(
            'CHORD NOTES + DEGREES',
            'NOTAS DO ACORDE + GRAUS',
            'NOTAS DEL ACORDE + GRADOS',
          )
        : tr(
            'SCALE NOTES + DEGREES',
            'NOTAS DA ESCALA + GRAUS',
            'NOTAS DE LA ESCALA + GRADOS',
          ),
      6.7,
      bold,
      muted,
    );
    const names = spellScale(s),
      step = Math.min(42, 310 / names.length),
      radius = Math.min(10.5, step * 0.37);
    names.forEach((name, i) => {
      const x = M + 12 + i * step;
      note(page, x, 537, (s.root + s.scaleData.intervals[i]) % 12, i === 0, radius, name);
      text(
        page,
        x,
        555,
        prettyDegree(s.scaleData.formula[i]),
        6.8,
        bold,
        ink,
        step - 2,
        'center',
      );
    });
    circle(page, 382, 537, 9.6, rgb(1, 1, 1), ink, 1.7);
    text(page, 382, 540.5, rootMarker(s), 9.5, bold, ink, undefined, 'center');
    text(page, 401, 532, rootTerm(s), 8.5, bold);
    text(
      page,
      401,
      547,
      tr(
        'Black ring. R on small maps.',
        'Anel preto. T ou F nos mapas pequenos.',
        'Anillo negro. T o F en mapas pequeños.',
      ),
      6.8,
      body,
      muted,
      175,
    );
    line(page, 592, 520, 592, 549);
    text(
      page,
      606,
      531,
      s.hand === 'left'
        ? tr('NUT ON THE RIGHT', 'PESTANA À DIREITA', 'CEJUELA A LA DERECHA')
        : tr('NUT ON THE LEFT', 'PESTANA À ESQUERDA', 'CEJUELA A LA IZQUIERDA'),
      6.8,
      bold,
      muted,
    );
    text(
      page,
      606,
      545,
      s.hand === 'left'
        ? tr(
            'Higher frets to the left.',
            'Numeração das casas aumenta à esquerda.',
            'Trastes más altos hacia la izquierda.',
          )
        : tr(
            'Higher frets to the right.',
            'Numeração das casas aumenta à direita.',
            'Trastes más altos hacia la derecha.',
          ),
      6.6,
      body,
      muted,
      R - 606,
    );
  }
  function scalePage(entry) {
    const s = entry.state,
      page = pages[entry.number - 1],
      family = FAMILIES[s.scaleData.family]?.[s.lang] ?? t.custom;
    head(
      page,
      s,
      entry.title,
      `${family} · ${s.scaleData.intervals.length} ${tr('notes', 'notas', 'notas')}`,
    );
    text(
      page,
      M,
      105,
      `${t.formula.toUpperCase()}  ${s.scaleData.formula.map(prettyDegree).join('  ')}`,
      9,
      bold,
      ink,
      610,
    );
    const height = s.instrument === 'guitar' ? 140 : s.strings === 4 ? 156 : 180;
    drawBoard(page, s, { top: 128, height, compact: s.instrument === 'guitar' });
    if (s.instrument === 'guitar') {
      const { system, patterns } = scalePatterns(s);
      text(
        page,
        M,
        301,
        patterns.length
          ? `${t.patterns} · ${t.patternSystems[system]}`.toLocaleUpperCase(
              LANGUAGES[s.lang].tag,
            )
          : tr(
              'FULL-NECK NOTE MAP',
              'MAPA COMPLETO DO BRAÇO',
              'MAPA COMPLETO DEL DIAPASÓN',
            ),
        7.1,
        bold,
        muted,
      );
      if (patterns.length) {
        const columns = Math.ceil(patterns.length / 2);
        const gap = 14;
        const width = (R - M - (columns - 1) * gap) / columns;
        patterns.forEach((pattern, i) => {
          const x = M + (i % columns) * (width + gap);
          const top = 326 + Math.floor(i / columns) * 100;
          text(
            page,
            x,
            top - 11,
            tr(
              pattern.shape
                ? `Pattern ${pattern.number} · ${pattern.shape} shape`
                : `Pattern ${pattern.number} · degree ${pattern.startDegree}`,
              pattern.shape
                ? `Padrão ${pattern.number} · forma ${pattern.shape}`
                : `Padrão ${pattern.number} · grau ${pattern.startDegree}`,
              pattern.shape
                ? `Patrón ${pattern.number} · forma ${pattern.shape}`
                : `Patrón ${pattern.number} · grado ${pattern.startDegree}`,
            ),
            8.2,
            bold,
            ink,
            width,
          );
          drawBoard(page, s, {
            x,
            top,
            width,
            height: 64,
            lo: pattern.lo,
            hi: pattern.hi,
            small: true,
            route: pattern,
            pattern: true,
          });
        });
      } else {
        para(
          page,
          M,
          326,
          tr(
            'No supported fingering pattern is available for this scale and tuning. Use the full-neck note map above; it shows scale tones, not a prescribed fingering.',
            'Não há um padrão de digitação disponível para esta escala e afinação. Use o mapa completo acima: ele mostra as notas da escala, sem prescrever uma digitação.',
            'No hay un patrón de digitación disponible para esta escala y afinación. Usa el mapa completo de arriba: muestra las notas de la escala, sin indicar una digitación específica.',
          ),
          560,
          10,
          16,
        );
      }
    } else {
      const lower = s.strings > 4 ? 13 : 0;
      let complete = true;
      for (const [i, row] of [s.strings - 1, s.strings - 2].entries()) {
        const route = bassRoute(s, row),
          x = M + i * 260,
          name = noteName(s.tuningData.notes[s.strings - row - 1], pitchPreference(s));
        text(
          page,
          x,
          347 + lower,
          tr(
            `${rootTerm(s)} on string ${row + 1} · ${name}`,
            `${rootTerm(s)} na corda ${row + 1} · ${name}`,
            `${rootTerm(s)} en la cuerda ${row + 1} · ${name}`,
          ),
          10.3,
          bold,
          ink,
          245,
        );
        const rootFret = mod(s.root - s.tuningData.notes[s.strings - row - 1]);
        const range = route ?? {
          lo: Math.max(0, rootFret - 2),
          hi: Math.min(s.frets, rootFret + 2),
        };
        if (!route) complete = false;
        text(
          page,
          x,
          367 + lower,
          route
            ? tr(
                `Start at fret ${route.startFret} (${rootName(s)})`,
                `Início na casa ${route.startFret} (${rootName(s)})`,
                `Inicio en el traste ${route.startFret} (${rootName(s)})`,
              )
            : tr(
                `Nearby notes · frets ${range.lo}-${range.hi}`,
                `Notas próximas · casas ${range.lo}-${range.hi}`,
                `Notas cercanas · trastes ${range.lo}-${range.hi}`,
              ),
          8.2,
          body,
          ink,
          245,
        );
        drawBoard(page, s, {
          x,
          top: 382 + lower,
          width: 236,
          height: 94 - lower,
          lo: range.lo,
          hi: range.hi,
          small: true,
          route,
        });
      }
      const x = M + 520;
      text(
        page,
        x,
        347 + lower,
        tr('Make a short phrase', 'Crie uma frase curta', 'Crea una frase corta'),
        10.3,
        bold,
        ink,
        R - x,
      );
      para(
        page,
        x,
        368 + lower,
        complete
          ? tr(
              'Play the octave in degree order, then descend. Shift your hand when needed.',
              'Toque a oitava na ordem dos graus e depois volte. Mude a posição da mão quando precisar.',
              'Toca la octava en orden de grados y luego desciende. Cambia la posición de la mano cuando lo necesites.',
            )
          : tr(
              'Choose three nearby notes. Begin and end on a black-ringed note. Shift your hand when needed.',
              'Escolha três notas próximas. Comece e termine na nota com anel preto. Mude a posição da mão quando precisar.',
              'Elige tres notas cercanas. Empieza y termina en la nota del anillo negro. Cambia la posición de la mano cuando lo necesites.',
            ),
        R - x,
        8.8,
        13,
      );
      para(
        page,
        x,
        426,
        tr(
          'Repeat a rhythm, leave space, and resolve to a tone of the current chord.',
          'Repita um ritmo, deixe espaço e resolva em uma nota do acorde atual.',
          'Repite un ritmo, deja espacio y resuelve en una nota del acorde que está sonando.',
        ),
        R - x,
        8.8,
        13,
      );
      text(
        page,
        x,
        489,
        complete
          ? tr(
              `Small maps span an octave, from ${rootMarker(s)} to ${rootMarker(s)}.`,
              `Mapas pequenos de ${rootMarker(s)} a ${rootMarker(s)}, uma oitava.`,
              `Mapas pequeños de ${rootMarker(s)} a ${rootMarker(s)}, una octava.`,
            )
          : tr(
              'Small maps show routes or nearby fret ranges.',
              'Mapas pequenos mostram rotas ou regiões próximas.',
              'Mapas pequeños con recorridos o regiones cercanas.',
            ),
        6.9,
        body,
        muted,
        R - x,
      );
    }
    scaleLegend(page, s);
    footer(page, entry.number);
  }
  cover();
  for (let i = 0; i < plan.extra; i++) {
    const page = pages[i + 1];
    head(
      page,
      initial,
      tr('Contents, continued', 'Continuação do sumário', 'Continuación del índice'),
      tr(
        'Click a title to go directly to its scale map.',
        'Clique em um título para abrir o mapa da escala.',
        'Haz clic en un título para ir al mapa de la escala.',
      ),
    );
    contents(page, plan.entries.slice(32 + i * 48, 32 + (i + 1) * 48), {
      top: 128,
      step: 17.5,
    });
    footer(
      page,
      i + 2,
      tr(
        'Clickable contents / one scale per reference page.',
        'Sumário clicável / uma escala por página de referência.',
        'Índice con enlaces / una escala por página de referencia.',
      ),
    );
  }
  readingGuide();
  let rendered = 0;
  for (const entry of plan.entries.filter((e) => e.type === 'scale')) {
    checkAbort();
    scalePage(entry);
    progress(++rendered, variants.length);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const outline = doc.context.obj({ Type: 'Outlines', Count: plan.entries.length }),
    outlineRef = doc.context.register(outline),
    refs = plan.entries.map(() => doc.context.nextRef());
  plan.entries.forEach((entry, i) => {
    const item = doc.context.obj({
      Title: PDFHexString.fromText(entry.title),
      Parent: outlineRef,
      Dest: [pages[i].ref, 'Fit'],
    });
    if (i) item.set(PDFName.of('Prev'), refs[i - 1]);
    if (i + 1 < refs.length) item.set(PDFName.of('Next'), refs[i + 1]);
    doc.context.assign(refs[i], item);
  });
  outline.set(PDFName.of('First'), refs[0]);
  outline.set(PDFName.of('Last'), refs.at(-1));
  doc.catalog.set(PDFName.of('Outlines'), outlineRef);
  doc.catalog.set(PDFName.of('Lang'), PDFString.of(LANGUAGES[initial.lang].tag));
  doc.setTitle(
    `Tukany · ${instrument(initial)} · ${variants.length === 1 ? variants[0].title : tr('Scale atlas', 'Atlas de escalas', 'Atlas de escalas')} · ${tuningName(initial)}`,
  );
  doc.setAuthor('Lucas Marques');
  doc.setSubject(
    tr(
      'Guided practice scale maps',
      'Mapas de escalas para prática guiada',
      'Mapas de escalas para práctica guiada',
    ) + ' · Marques & Co.',
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
