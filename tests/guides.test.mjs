import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { GUIDED_BOOKS, matchingGuides } from '../src/guides.mjs';

test('each guided book matches its actual language, instrument, handedness, and tuning', async () => {
  for (const book of GUIDED_BOOKS) {
    assert.deepEqual(
      matchingGuides(book).map((b) => b.file),
      [book.file],
    );
    await access(new URL(`../public/guides/${book.file}`, import.meta.url));
    assert.deepEqual(
      matchingGuides({ ...book, lang: book.lang === 'en' ? 'pt' : 'en' }),
      [],
    );
    assert.deepEqual(
      matchingGuides({ ...book, hand: book.hand === 'left' ? 'right' : 'left' }),
      [],
    );
    assert.ok(
      matchingGuides({
        ...book,
        instrument: book.instrument === 'guitar' ? 'bass' : 'guitar',
      }).every((match) => match.instrument !== book.instrument),
    );
  }
});
test('different tunings and extended string counts do not offer a mismatched guide', () => {
  assert.deepEqual(
    matchingGuides({
      instrument: 'guitar',
      strings: 6,
      lang: 'en',
      hand: 'right',
      tuning: 'guitar-standard',
    }),
    [],
  );
  assert.deepEqual(
    matchingGuides({
      instrument: 'guitar',
      strings: 6,
      lang: 'en',
      hand: 'left',
      tuning: 'guitar-drop-d',
    }),
    [],
  );
  assert.deepEqual(
    matchingGuides({ instrument: 'guitar', strings: 7, lang: 'en', hand: 'left' }),
    [],
  );
  for (const strings of [5, 6])
    assert.deepEqual(
      matchingGuides({ instrument: 'bass', strings, lang: 'en', hand: 'left' }),
      [],
    );
});
test('equivalent custom pitches match, while octave and string-count differences do not', () => {
  const guitar = {
    instrument: 'guitar',
    strings: 6,
    lang: 'en',
    hand: 'left',
    tuning: 'custom',
  };
  assert.equal(
    matchingGuides({ ...guitar, customTuning: 'E2 A2 D3 G3 B3 E4' })[0].file,
    'guitar-standard-left-en.pdf',
  );
  assert.deepEqual(matchingGuides({ ...guitar, customTuning: 'E1 A1 D2 G2 B2 E3' }), []);
  const lowered = {
    ...guitar,
    lang: 'pt',
    hand: 'right',
    customTuning: 'Db2 Gb2 B2 E3 Ab3 Db4',
  };
  assert.equal(matchingGuides(lowered)[0].file, 'guitar-c-sharp-right-pt.pdf');
  assert.equal(
    matchingGuides({
      instrument: 'bass',
      strings: 4,
      lang: 'pt',
      hand: 'right',
      tuning: 'custom',
      customTuning: 'C1 G1 C2 F2',
    })[0].file,
    'bass-drop-c-right-pt.pdf',
  );
});
