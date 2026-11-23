import test from 'node:test';
import assert from 'node:assert/strict';
import { copy } from '../src/i18n.mjs';
import { LANGUAGES, normalizeLanguage, tuningName } from '../src/locales.mjs';
import { SCALES, TUNINGS, FAMILIES } from '../src/catalog.mjs';
import { normalizeState, selection, sharedState } from '../src/music.mjs';
import { restoreWorkspace, rememberWorkspace } from '../src/workspace.mjs';
import { boardMarkup } from '../src/board.mjs';
import { matchingGuides } from '../src/guides.mjs';

function textEntries(value, prefix = '') {
  return Object.entries(value)
    .flatMap(([key, item]) => {
      const path = `${prefix}${key}`;
      return typeof item === 'string'
        ? [[path, (item.match(/\{\w+\}/g) ?? []).sort()]]
        : textEntries(item, `${path}.`);
    })
    .sort();
}

test('each supported locale covers the interface, musical catalog, families, and tuning names', () => {
  for (const lang of Object.keys(LANGUAGES)) {
    assert.deepEqual(textEntries(copy[lang]), textEntries(copy.en), lang);
    assert.match(copy[lang].pageTitle, /^Tukany · /);
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
    ['es-ES', 'es'],
    ['es-419', 'es'],
    ['es-MX', 'es'],
    ['it-IT', 'it'],
    ['fr-CA', 'fr'],
    ['de-AT', 'de'],
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

test('localized fretboard controls name the tonic, chord root, string and fret', () => {
  for (const lang of ['es', 'it', 'fr', 'de']) {
    const t = copy[lang];
    const scale = boardMarkup({ lang, root: 0, scale: 'major' });
    const chord = boardMarkup({ lang, root: 0, scale: 'major-triad' });
    assert.ok(scale.includes(t.root));
    assert.ok(chord.includes(t.chordRoot));
    assert.ok(chord.includes(`${t.fret} 1`));
    assert.ok(chord.includes(`${t.string} 1`));
    assert.doesNotMatch(chord, /undefined|Fret|String/);
    assert.deepEqual(matchingGuides({ lang, hand: 'left' }), []);
  }
});

test('alternate tuning labels use the selected regional terminology', () => {
  const highC = TUNINGS.find((tuning) => tuning.name === 'High C / EADGC');
  const openD = TUNINGS.find((tuning) => tuning.name === 'Open D');
  for (const [lang, high, open] of [
    ['en', 'High C', 'Open D'],
    ['pt', 'C agudo', 'D aberta'],
    ['es', 'C agudo', 'Abierta en D'],
    ['it', 'C acuto', 'Aperta in D'],
    ['fr', 'C aigu', 'Ouvert en D'],
    ['de', 'Hohes C', 'Offene D-Stimmung'],
  ]) {
    assert.equal(tuningName(highC, lang), `${high} / EADGC`);
    assert.equal(tuningName(openD, lang), open);
  }
});
