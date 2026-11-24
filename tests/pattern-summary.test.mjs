// SPDX-License-Identifier: MPL-2.0

import test from 'node:test';
import assert from 'node:assert/strict';
import { scalePatterns } from '../src/patterns.mjs';
import { patternSummary } from '../src/pattern-summary.mjs';
import { LANGUAGES } from '../src/locales.mjs';
import { copy } from '../src/i18n.mjs';

test('a CAGED summary shows the lowest note and its degree', () => {
  const state = { root: 0, scale: 'major' };
  const pattern = scalePatterns(state).patterns[0];
  const summary = patternSummary(state, pattern);
  assert.equal(summary.title, 'Pattern 1');
  assert.match(summary.detail, /Lowest note: B \(7\)/);
  assert.equal(patternSummary(state, null), null);
});

test('pattern summaries preserve key spelling in every language', () => {
  for (const lang of Object.keys(LANGUAGES)) {
    const state = {
      root: 6,
      tonic: 'F#',
      scale: 'major',
      spelling: 'key',
      lang,
      hand: 'left',
    };
    const pattern = scalePatterns(state).patterns[0];
    const summary = patternSummary(state, pattern);
    assert.equal(summary.title, `${copy[lang].pattern} 1`);
    assert.equal(
      summary.detail,
      copy[lang].patternDetails.replace('{note}', 'E♯').replace('{degree}', '7'),
    );
  }
});

test('bass routes use the same numbering as the bracket', () => {
  const state = { instrument: 'bass', strings: 5, root: 0 };
  const pattern = scalePatterns(state).patterns[0];
  assert.equal(patternSummary(state, pattern).title, `Pattern ${pattern.number}`);
});
