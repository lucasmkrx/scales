import test from 'node:test';
import assert from 'node:assert/strict';
import { scaleGroups, COMMON_SCALES, initialScaleView } from '../src/scale-picker.mjs';
import { SCALES, FAMILIES } from '../src/catalog.mjs';
import { boardMarkup } from '../src/board.mjs';
const ids = (options) => scaleGroups(options).flatMap((g) => g.scales.map((s) => s.id));
test('common scales are a focused starting set, and the full catalog has no duplicates or omissions', () => {
  assert.deepEqual(ids({}), COMMON_SCALES);
  assert.ok(COMMON_SCALES.includes('major-pentatonic'));
  const all = ids({ view: 'all' });
  assert.equal(all.length, SCALES.length);
  assert.equal(new Set(all).size, all.length);
  assert.ok(
    ids({ view: 'arpeggios' }).every(
      (id) => SCALES.find((s) => s.id === id).family === 'arpeggio',
    ),
  );
  assert.equal(ids({ view: 'arpeggios' }).length, 12);
  assert.equal(initialScaleView('dorian'), 'all');
  assert.equal(initialScaleView('minor-triad'), 'arpeggios');
  assert.equal(initialScaleView('custom'), 'all');
});
test('search spans all collections, matches all three languages and aliases, and ignores accents and word order', () => {
  assert.ok(ids({ search: 'dórico', view: 'common' }).includes('dorian'));
  assert.ok(ids({ search: 'pentatonica menor' }).includes('minor-pentatonic'));
  assert.deepEqual(ids({ search: 'aeolian' }), ['natural-minor']);
  assert.deepEqual(ids({ search: 'semidisminuido', lang: 'en' }), ['half-diminished']);
  assert.deepEqual(ids({ search: 'aumentada triada', lang: 'pt' }), ['augmented-triad']);
  assert.deepEqual(ids({ search: 'jonico', lang: 'es' }), ['major', 'ionian-augmented']);
  assert.deepEqual(ids({ search: 'something missing' }), []);
  assert.deepEqual(ids({ view: 'common', search: '  ' }), COMMON_SCALES);
  const settings = Object.freeze({
    view: 'common',
    search: 'minor',
    lang: 'pt',
    scale: 'major',
  });
  scaleGroups(settings);
  assert.equal(settings.scale, 'major');
});
test('seven-string note circles retain separation in full and position maps', () => {
  for (const hand of ['left', 'right'])
    for (const opts of [{}, { small: true, width: 400, height: 190, lo: 0, hi: 4 }]) {
      const board = boardMarkup(
        {
          instrument: 'guitar',
          strings: 7,
          tuning: 'guitar-7-standard',
          scale: 'chromatic',
          hand,
        },
        opts,
      );
      const notes = [
        ...board.matchAll(
          /class="(?:note|preview-note)([^"]*)" style="left:([.\d]+)px;top:([.\d]+)px;width:([.\d]+)px;height:([.\d]+)px/g,
        ),
      ].map(([, classes, left, top, width, height]) => ({
        x: Number(left) + Number(width) / 2,
        y: Number(top) + Number(height) / 2,
        radius: Number(height) / 2 + (classes.includes('root-note') ? 2.8 : 0),
      }));
      assert.equal(new Set(notes.map((note) => note.y.toFixed(3))).size, 7);
      for (const a of notes)
        for (const b of notes)
          if (Math.abs(a.x - b.x) < 0.001 && a.y + 0.001 < b.y)
            assert.ok(
              b.y - a.y > a.radius + b.radius,
              'circles on neighboring strings overlap',
            );
    }
});

test('Fretboard open-string labels show both names on one marker in either orientation', () => {
  const state = {
    instrument: 'guitar',
    strings: 6,
    tuning: 'guitar-eb-standard',
    scale: 'natural-minor',
    root: 0,
  };
  for (const hand of ['left', 'right'])
    for (const small of [false, true]) {
      const sharp = boardMarkup({ ...state, hand, spelling: 'sharp' }, { small });
      const flat = boardMarkup({ ...state, hand, spelling: 'flat' }, { small });
      const both = boardMarkup({ ...state, hand, spelling: 'both' }, { small });
      assert.match(sharp, />D♯<\/span>/);
      assert.doesNotMatch(sharp, />E♭<\/span>/);
      assert.match(flat, />E♭<\/span>/);
      assert.doesNotMatch(flat, />D♯<\/span>/);
      assert.match(both, />E♭<\/span>/);
      assert.match(both, />D♯<\/span>/);
      assert.equal(
        [...both.matchAll(/class="(?:note|preview-note)\b/g)].length,
        [...sharp.matchAll(/class="(?:note|preview-note)\b/g)].length,
      );
    }
});

test('every scale and collection is named in each supported language', () => {
  for (const lang of ['en', 'pt', 'es']) {
    for (const scale of SCALES) {
      assert.equal(typeof scale.name[lang], 'string', scale.id);
      assert.ok(scale.name[lang].trim(), scale.id);
    }
    for (const [id, names] of Object.entries(FAMILIES)) {
      assert.ok(names[lang]?.trim(), id);
    }
    for (const group of scaleGroups({ view: 'all', lang })) {
      if (group.id !== 'common') assert.ok(group.label);
    }
  }
});

test('seventh-chord labels distinguish chord quality and preserve diminished seventh spelling', () => {
  const scale = (id) => SCALES.find((entry) => entry.id === id);
  assert.equal(scale('major-7').name.pt, 'Maior com sétima maior');
  assert.equal(scale('minor-7').name.es, 'Menor con séptima menor');
  assert.deepEqual(scale('half-diminished').formula, ['1', 'b3', 'b5', 'b7']);
  assert.deepEqual(scale('diminished-7').formula, ['1', 'b3', 'b5', 'bb7']);
});
