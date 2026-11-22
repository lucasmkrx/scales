import test from 'node:test';
import assert from 'node:assert/strict';
import { copy } from '../src/i18n.mjs';
import { LANGUAGES, normalizeLanguage, tuningName } from '../src/locales.mjs';
import { SCALES, TUNINGS, FAMILIES } from '../src/catalog.mjs';
import { normalizeState, selection, sharedState } from '../src/music.mjs';
import { restoreWorkspace, rememberWorkspace } from '../src/workspace.mjs';
import { boardMarkup } from '../src/board.mjs';
import { matchingGuides } from '../src/guides.mjs';

function textKeys(value, prefix = '') {
  return Object.entries(value)
    .flatMap(([key, item]) => {
      const path = `${prefix}${key}`;
      return typeof item === 'string' ? [path] : textKeys(item, `${path}.`);
    })
    .sort();
}

test('each supported locale covers the interface, musical catalog, families, and tuning names', () => {
  for (const lang of Object.keys(LANGUAGES)) {
    assert.deepEqual(textKeys(copy[lang]), textKeys(copy.en), lang);
    const values = [
      ...SCALES.map((scale) => scale.name[lang]),
      ...Object.values(FAMILIES).map((family) => family[lang]),
      ...TUNINGS.map((tuning) => tuningName(tuning, lang)),
    ];
    assert.ok(
      values.every((value) => typeof value === 'string' && value.trim()),
      lang,
    );
    assert.ok(
      selection({ lang, scale: 'custom', formula: '1 b3 5' }).scaleData.name[lang],
    );
  }
});

test('regional locale aliases survive custom shared links and device preferences', () => {
  for (const [tag, lang] of [
    ['en-US', 'en'],
    ['pt-BR', 'pt'],
    ['es-419', 'es'],
    ['es-MX', 'es'],
  ]) {
    assert.equal(normalizeLanguage(tag), lang);
    const state = normalizeState({
      lang: tag,
      instrument: 'bass',
      strings: 5,
      tuning: 'custom',
      customTuning: 'B0 E1 A1 D2 G2',
      scale: 'custom',
      formula: '1 b3 5',
    });
    const restored = restoreWorkspace(
      Object.fromEntries(new URLSearchParams(sharedState(state))),
    );
    assert.equal(restored.lang, lang);
    assert.equal(restored.formula, state.formula);
    assert.equal(restored.customTuning, state.customTuning);
    const saved = rememberWorkspace({}, restored);
    assert.equal(restoreWorkspace({}, saved).lang, lang);
    assert.equal(restoreWorkspace({ lang: 'es-419' }, saved).lang, 'es');
  }
  assert.equal(normalizeLanguage('invalid'), 'en');
});

test('Spanish note controls distinguish a scale tonic from a chord root', () => {
  const scale = boardMarkup({ lang: 'es', root: 0, scale: 'major' });
  const chord = boardMarkup({ lang: 'es', root: 0, scale: 'major-triad' });
  assert.match(scale, new RegExp(copy.es.root));
  assert.match(chord, new RegExp(copy.es.chordRoot));
  assert.match(chord, /Traste|traste/);
  assert.doesNotMatch(chord, /undefined|Fret|String/);
  assert.deepEqual(matchingGuides({ lang: 'es', hand: 'left' }), []);
});

test('alternate tuning labels use the selected regional terminology', () => {
  const highC = TUNINGS.find((tuning) => tuning.name === 'High C / EADGC');
  const openD = TUNINGS.find((tuning) => tuning.name === 'Open D');
  for (const lang of ['pt', 'es'])
    assert.equal(tuningName(highC, lang), 'C agudo / EADGC');
  assert.equal(tuningName(openD, 'pt'), 'D aberta');
  assert.equal(tuningName(openD, 'es'), 'D abierta');
});
