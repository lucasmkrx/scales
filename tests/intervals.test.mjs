import test from 'node:test';
import assert from 'node:assert/strict';
import { SCALES } from '../src/music.mjs';
import { intervalName } from '../src/intervals.mjs';

test('interval names preserve the written degree and support all three locales', () => {
  assert.equal(intervalName('5'), 'perfect fifth');
  assert.equal(intervalName('5', 'pt-BR'), 'quinta justa');
  assert.equal(intervalName('5', 'es-419'), 'quinta justa');
  assert.equal(intervalName('♭♭7'), 'diminished seventh');
  assert.equal(intervalName('6'), 'major sixth');
  assert.equal(intervalName('♯2', 'es'), 'segunda aumentada');
  assert.equal(intervalName('♭3', 'es'), 'tercera menor');
  assert.equal(intervalName('##1', 'pt'), 'grau ♯♯1');
  for (const scale of SCALES)
    for (const degree of scale.formula)
      for (const lang of ['en', 'pt', 'es'])
        assert.doesNotMatch(intervalName(degree, lang), /^(degree|grau|grado) /);
});
