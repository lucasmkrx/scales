import test from 'node:test';
import assert from 'node:assert/strict';
import { SCALES } from '../src/music.mjs';
import { intervalName } from '../src/intervals.mjs';
import { LANGUAGES } from '../src/locales.mjs';

test('interval names preserve the written degree in every supported language', () => {
  assert.equal(intervalName('5'), 'perfect fifth');
  assert.equal(intervalName('5', 'pt-BR'), 'quinta justa');
  assert.equal(intervalName('5', 'es-ES'), 'quinta justa');
  assert.equal(intervalName('5', 'it-IT'), 'quinta giusta');
  assert.equal(intervalName('5', 'fr-FR'), 'quinte juste');
  assert.match(intervalName('5', 'de-DE'), /^reine Quinte$/i);
  assert.equal(intervalName('♭♭7'), 'diminished seventh');
  assert.equal(intervalName('6'), 'major sixth');
  assert.equal(intervalName('♯2', 'es'), 'segunda aumentada');
  assert.equal(intervalName('♭3', 'es'), 'tercera menor');
  assert.equal(intervalName('##1', 'pt'), 'grau ♯♯1');
  for (const scale of SCALES)
    for (const degree of scale.formula)
      for (const lang of Object.keys(LANGUAGES)) {
        const name = intervalName(degree, lang);
        assert.ok(name, `${lang} ${degree}`);
        assert.doesNotMatch(name, /^(degree|grau|grado|degré|Stufe|Grad|undefined) /i);
      }
});
