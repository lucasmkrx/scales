// SPDX-License-Identifier: MPL-2.0

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInThisContext } from 'node:vm';
import { createAtlas } from '../src/pdf.mjs';
import { LANGUAGES } from '../src/locales.mjs';
import { FAMILIES, SCALES } from '../src/catalog.mjs';
import { copy } from '../src/i18n.mjs';
for (const name of ['pdf-lib.min.js', 'fontkit.umd.min.js'])
  runInThisContext(
    await readFile(new URL(`../public/vendor/${name}`, import.meta.url), 'utf8'),
    { filename: name },
  );
const asset = async (path) =>
  new Uint8Array(await readFile(new URL(`../public/${path}`, import.meta.url)));
test('individual charts are single, localized pages for guitar and bass', async () => {
  for (const state of [
    { instrument: 'guitar', strings: 6, root: 7, scale: 'major', lang: 'en' },
    { instrument: 'guitar', strings: 6, root: 5, scale: 'minor-blues', lang: 'it' },
    { instrument: 'bass', strings: 4, root: 5, scale: 'minor-blues', lang: 'fr' },
    { instrument: 'guitar', strings: 7, root: 5, scale: 'minor-blues', lang: 'de' },
    {
      instrument: 'guitar',
      strings: 6,
      root: 9,
      scale: 'minor-pentatonic',
      hand: 'left',
      lang: 'pt',
    },
    {
      instrument: 'guitar',
      strings: 7,
      tuning: 'guitar-7-standard',
      root: 0,
      scale: 'harmonic-minor',
      lang: 'es',
    },
    {
      instrument: 'bass',
      strings: 4,
      hand: 'left',
      root: 0,
      scale: 'natural-minor',
      spelling: 'sharp',
      lang: 'en',
    },
    {
      instrument: 'guitar',
      strings: 7,
      tuning: 'guitar-7-drop-a',
      root: 6,
      lang: 'pt',
      scale: 'harmonic-minor',
      spelling: 'both',
    },
    {
      instrument: 'guitar',
      strings: 7,
      tuning: 'guitar-7-drop-a',
      hand: 'left',
      root: 1,
      lang: 'es',
      scale: 'harmonic-minor',
      spelling: 'both',
    },
    {
      instrument: 'bass',
      strings: 6,
      lang: 'es',
      scale: 'diminished-7',
    },
    {
      instrument: 'bass',
      strings: 4,
      tuning: 'custom',
      customTuning: 'C0 C4 C5 C6',
      frets: 20,
      root: 11,
      lang: 'en',
      scale: 'major',
    },
  ]) {
    const bytes = await createAtlas(state, { asset }),
      doc = await PDFLib.PDFDocument.load(bytes);
    assert.match(doc.getTitle(), /^Tukany · /);
    assert.equal(doc.getPageCount(), 1);
    assert.deepEqual(doc.getPage(0).getSize(), { width: 841.89, height: 595.28 });
    assert.equal(
      doc.catalog.get(PDFLib.PDFName.of('Lang')).decodeText(),
      LANGUAGES[state.lang].tag,
    );
    const scale = SCALES.find((entry) => entry.id === state.scale);
    assert.ok(doc.getTitle().includes(scale.name[state.lang]));
    assert.ok(doc.getTitle().includes(copy[state.lang][state.instrument]));
    if (state.lang === 'es') {
      assert.match(doc.getSubject(), /práctica guiada/);
      assert.match(doc.getKeywords(), /es-ES/);
    }
    const names = [...doc.context.enumerateIndirectObjects()]
      .filter(([, o]) => o instanceof PDFLib.PDFDict)
      .map(([, o]) => o.get(PDFLib.PDFName.of('BaseFont'))?.toString() ?? '')
      .join(' ');
    assert.match(names, /\/DejaVuSans(?:-\d+)?(?:\s|$)/);
    assert.match(names, /DejaVuSans-Bold/);
  }
});
test('Letter catalog has correctly sized pages, linked indexes, and bookmarks grouped by family', async () => {
  const state = { scale: 'major', lang: 'fr' };
  const doc = await PDFLib.PDFDocument.load(
    await createAtlas(state, { scope: 'catalog', paperSize: 'letter', asset }),
  );
  const pages = doc.getPages();
  assert.equal(pages.length, 70);
  for (const page of pages) assert.deepEqual(page.getSize(), { width: 792, height: 612 });
  const key = PDFLib.PDFName.of;
  const get = (dict, field) => doc.context.lookup(dict.get(key(field)));
  const destination = (item) => get(item, 'Dest').get(0).toString();
  const links = (page) =>
    page.node
      .Annots()
      .asArray()
      .map((ref) => doc.context.lookup(ref));
  const pageRefs = pages.map((page) => page.ref.toString());
  const coverTargets = links(pages[0]).map(destination);
  assert.ok(coverTargets.includes(pageRefs[1]));
  const alphaTargets = links(pages[1]).map(destination);
  const frOrder = [...SCALES].sort((a, b) => a.name.fr.localeCompare(b.name.fr, 'fr-FR'));
  assert.deepEqual(
    alphaTargets,
    frOrder.map((scale) => pageRefs[3 + SCALES.indexOf(scale)]),
  );
  const outlines = get(doc.catalog, 'Outlines');
  let item = get(outlines, 'First');
  assert.equal(get(item, 'Title').decodeText(), 'Couverture et sommaire');
  for (let i = 0; i < 3; i++) item = get(item, 'Next');
  for (const [id, family] of Object.entries(FAMILIES)) {
    const scales = SCALES.filter((scale) => scale.family === id);
    assert.equal(get(item, 'Title').decodeText(), family.fr);
    assert.equal(get(item, 'Count').asNumber(), -scales.length);
    assert.ok(coverTargets.includes(destination(item)));
    let child = get(item, 'First');
    assert.equal(destination(item), destination(child));
    for (const scale of scales) {
      assert.equal(destination(child), pageRefs[3 + SCALES.indexOf(scale)]);
      assert.ok(get(child, 'Title').decodeText().includes(scale.name.fr));
      child = get(child, 'Next');
    }
    assert.equal(child, undefined);
    item = get(item, 'Next');
  }
  assert.equal(item, undefined);
});
test('all-key exports keep one scale per map page and support cancellation', async () => {
  const bytes = await createAtlas(
      { scale: 'minor-pentatonic' },
      { asset, allKeys: true },
    ),
    doc = await PDFLib.PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 14);
  const destinations = doc
    .getPage(0)
    .node.Annots()
    .asArray()
    .map((ref) =>
      doc.context.lookup(ref).get(PDFLib.PDFName.of('Dest')).get(0).toString(),
    );
  for (const page of doc.getPages().slice(1))
    assert.ok(destinations.includes(page.ref.toString()));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => createAtlas({}, { asset, signal: controller.signal }), {
    name: 'AbortError',
  });
});

test('main-scale exports name the actual fingering system and include every pattern', async () => {
  const drawText = PDFLib.PDFPage.prototype.drawText;
  const rendered = [];
  PDFLib.PDFPage.prototype.drawText = function (value, options) {
    rendered.push({ page: this.ref.toString(), value, ...options });
    return drawText.call(this, value, options);
  };
  try {
    for (const lang of ['en', 'pt', 'es']) {
      for (const [scale, system, count] of [
        ['harmonic-minor', 'three-per-string', 7],
        ['minor-blues', 'blues', 5],
        ['whole-tone', 'three-per-string', 6],
        ['diminished-hw', 'four-per-string', 8],
      ]) {
        rendered.length = 0;
        const bytes = await createAtlas({ scale, root: 9, frets: 24, lang }, { asset });
        const doc = await PDFLib.PDFDocument.load(bytes);
        assert.equal(doc.getPageCount(), 1);
        const map = rendered.filter(
          (item) => item.page === doc.getPage(0).ref.toString(),
        );
        const heading = `${copy[lang].patterns} · ${copy[lang].patternSystems[system]}`;
        assert.ok(
          map.some((item) => item.value === heading),
          `${lang}: ${scale}`,
        );
        const captions = map.filter(
          (item) =>
            item.value.startsWith(copy[lang].pattern + ' ') && /\d+ ·/.test(item.value),
        );
        assert.equal(captions.length, count, `${lang}: ${scale}`);
        assert.ok(captions.every((item) => item.size >= 7));
        assert.ok(captions.every((item) => item.y > 90));
      }
    }
  } finally {
    PDFLib.PDFPage.prototype.drawText = drawText;
  }
});

test('key-spelled PDFs retain distinct enharmonic tonics and written scale notes', async () => {
  const drawText = PDFLib.PDFPage.prototype.drawText;
  const rendered = [];
  PDFLib.PDFPage.prototype.drawText = function (value, options) {
    rendered.push({ page: this.ref.toString(), value });
    return drawText.call(this, value, options);
  };
  try {
    for (const [root, tonic, lang, expected, unwanted] of [
      [6, 'F#', 'en', 'E♯', 'C♭'],
      [6, 'Gb', 'pt', 'C♭', 'E♯'],
      [1, 'C#', 'es', 'B♯', 'C♭'],
    ]) {
      rendered.length = 0;
      const bytes = await createAtlas(
        { root, tonic, lang, scale: 'major', spelling: 'key' },
        { asset },
      );
      const doc = await PDFLib.PDFDocument.load(bytes);
      const map = rendered.filter((item) => item.page === doc.getPage(0).ref.toString());
      assert.ok(
        map.some((item) => item.value === expected),
        `${tonic}: ${expected}`,
      );
      assert.ok(!map.some((item) => item.value === unwanted), `${tonic}: no ${unwanted}`);
      assert.ok(doc.getTitle().includes(tonic.replace('#', '♯').replace('b', '♭')));
    }
  } finally {
    PDFLib.PDFPage.prototype.drawText = drawText;
  }
});

test('individual charts honor the selected fingering and outside-note display', async () => {
  const drawText = PDFLib.PDFPage.prototype.drawText;
  const printed = new Set();
  PDFLib.PDFPage.prototype.drawText = function (value, options) {
    printed.add(value);
    return drawText.call(this, value, options);
  };
  try {
    for (const allNotes of [false, true]) {
      printed.clear();
      await createAtlas(
        { scale: 'major', root: 0, range: 'caged-major-1', spelling: 'sharp', allNotes },
        { asset },
      );
      assert.ok(printed.has('Pattern 1'));
      assert.equal(printed.has('G♯'), allNotes);
    }
  } finally {
    PDFLib.PDFPage.prototype.drawText = drawText;
  }
});
