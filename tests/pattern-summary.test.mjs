import test from 'node:test';
import assert from 'node:assert/strict';
import { scalePatterns } from '../src/patterns.mjs';
import { patternSummary } from '../src/pattern-summary.mjs';

test('a CAGED summary shows the lowest note and its degree', () => {
  const state = { root: 0, scale: 'major' };
  const pattern = scalePatterns(state).patterns[0];
  const summary = patternSummary(state, pattern);
  assert.equal(summary.title, 'Pattern 1 · E shape');
  assert.match(summary.detail, /Lowest note: B \(7\)/);
  assert.equal(patternSummary(state, null), null);
});

test('pattern summaries preserve key spelling in every language', () => {
  for (const lang of ['en', 'pt', 'es']) {
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
    assert.ok(summary.title.includes('E'));
    assert.ok(summary.detail.includes('E♯ (7)'));
    assert.ok(!summary.detail.includes('{'));
  }
});

test('bass routes identify their actual starting string', () => {
  const state = { instrument: 'bass', strings: 5, root: 0 };
  const pattern = scalePatterns(state).patterns[0];
  assert.equal(patternSummary(state, pattern).title, `String ${pattern.startRow + 1}`);
});
