// SPDX-License-Identifier: MPL-2.0

import test from 'node:test';
import assert from 'node:assert/strict';
import { scalesInFamily, initialScaleFamily } from '../src/scale-picker.mjs';
import { SCALES, FAMILIES } from '../src/catalog.mjs';
import { boardMarkup } from '../src/board.mjs';
import { LANGUAGES } from '../src/locales.mjs';
test('common scales are available immediately and every named scale belongs to a browsable family', () => {
  const common = scalesInFamily('common');
  assert.equal(common.length, 8);
  assert.equal(common[0].id, 'major');
  assert.ok(common.some((scale) => scale.id === 'minor-pentatonic'));
  const catalog = Object.keys(FAMILIES).flatMap((family) => {
    const choices = scalesInFamily(family);
    assert.ok(choices.length, family);
    assert.ok(choices.every((scale) => scale.family === family));
    return choices;
  });
  assert.equal(catalog.length, SCALES.length);
  assert.deepEqual(new Set(catalog), new Set(SCALES));
  assert.ok(scalesInFamily('major').includes(common[0]));
});
test('named and custom shared choices open in the matching collection', () => {
  for (const scale of SCALES) {
    assert.ok(scalesInFamily(initialScaleFamily(scale.id)).includes(scale));
  }
  assert.equal(initialScaleFamily('major'), 'common');
  assert.equal(initialScaleFamily('dorian'), 'major');
  assert.equal(initialScaleFamily('minor-triad'), 'arpeggio');
  assert.equal(initialScaleFamily('custom'), 'custom');
});
test('seven-string note circles retain separation on the fretboard', () => {
  for (const hand of ['left', 'right']) {
    const board = boardMarkup({
      instrument: 'guitar',
      strings: 7,
      tuning: 'guitar-7-standard',
      scale: 'chromatic',
      hand,
    });
    const notes = [
      ...board.matchAll(
        /class="note([^"]*)" style="left:([.\d]+)px;top:([.\d]+)px;width:([.\d]+)px;height:([.\d]+)px/g,
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
  for (const hand of ['left', 'right']) {
    const sharp = boardMarkup({ ...state, hand, spelling: 'sharp' });
    const flat = boardMarkup({ ...state, hand, spelling: 'flat' });
    const both = boardMarkup({ ...state, hand, spelling: 'both' });
    assert.match(sharp, />D♯<\/span>/);
    assert.doesNotMatch(sharp, />E♭<\/span>/);
    assert.match(flat, />E♭<\/span>/);
    assert.doesNotMatch(flat, />D♯<\/span>/);
    assert.match(both, />E♭<\/span>/);
    assert.match(both, />D♯<\/span>/);
    assert.equal(
      [...both.matchAll(/class="note\b/g)].length,
      [...sharp.matchAll(/class="note\b/g)].length,
    );
  }
});

test('every scale and collection is named in each supported language', () => {
  for (const lang of Object.keys(LANGUAGES)) {
    for (const scale of SCALES) {
      assert.equal(typeof scale.name[lang], 'string', scale.id);
      assert.ok(scale.name[lang].trim(), scale.id);
    }
    for (const [id, names] of Object.entries(FAMILIES)) {
      assert.ok(names[lang]?.trim(), id);
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
