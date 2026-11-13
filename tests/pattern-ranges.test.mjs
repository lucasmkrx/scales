import test from 'node:test';
import assert from 'node:assert/strict';
import { patternRanges } from '../src/pattern-ranges.mjs';

const layout = {
  width: 1000,
  edges: (fret) => [fret * 40, (fret + 1) * 40],
};
const shape = (number, lo, hi) => ({ number, lo, hi });

function assertNoCollisions(markers) {
  for (const a of markers)
    for (const b of markers) {
      if (a === b || a.lane !== b.lane) continue;
      assert.ok(a.hitRight + 8 <= b.hitLeft || b.hitRight + 8 <= a.hitLeft);
    }
}

test('each pattern has its own predictable row even when spans do not overlap', () => {
  const result = patternRanges([shape(1, 0, 4), shape(2, 3, 7), shape(3, 8, 11)], layout);
  assert.deepEqual(
    result.markers.map((marker) => marker.lane),
    [0, 1, 2],
  );
  assert.equal(result.height, 104);
  assertNoCollisions(result.markers);
  assert.deepEqual(
    result.markers.map(({ left, right }) => [left, right]),
    [
      [0, 200],
      [120, 320],
      [320, 480],
    ],
  );
});

test('reversed fret edges mirror spans while keeping numbered row order stable', () => {
  const patterns = [shape(1, 2, 4), shape(2, 7, 9)];
  const right = patternRanges(patterns, layout);
  const left = patternRanges(patterns, {
    ...layout,
    edges: (fret) => layout.edges(fret).map((edge) => layout.width - edge),
  });
  assert.deepEqual(
    left.markers.map((marker) => marker.pattern.number),
    [1, 2],
  );
  for (const marker of right.markers) {
    const mirror = left.markers.find((other) => other.pattern === marker.pattern);
    assert.equal(mirror.left, layout.width - marker.right);
    assert.equal(mirror.right, layout.width - marker.left);
    assert.equal(mirror.hitLeft, layout.width - marker.hitRight);
    assert.equal(mirror.hitRight, layout.width - marker.hitLeft);
  }
});

test('long localized labels get collision-free hit areas beyond their fret spans', () => {
  const patterns = [shape(1, 5, 5), shape(2, 7, 7), shape(3, 11, 11)];
  const result = patternRanges(patterns, layout, {
    labelFor: ({ number }) => `Desenho ${number} · casas selecionadas`,
    laneHeight: 42,
  });
  for (const marker of result.markers) {
    assert.ok(marker.hitRight - marker.hitLeft >= marker.label.length * 7 + 24);
    assert.ok(marker.hitRight - marker.hitLeft > marker.right - marker.left);
  }
  assertNoCollisions(result.markers);
  assert.equal(
    result.height,
    42 * (Math.max(...result.markers.map((m) => m.lane)) + 1) + 8,
  );
});

test('hit areas clamp to both canvas edges and keep a minimum touch width', () => {
  const result = patternRanges([shape(1, 0, 0), shape(2, 24, 24)], layout, {
    labelFor: () => '1',
  });
  assert.equal(result.markers[0].hitLeft, 0);
  assert.equal(result.markers[1].hitRight, 1000);
  for (const marker of result.markers) {
    assert.ok(marker.hitLeft >= 0);
    assert.ok(marker.hitRight <= layout.width);
    assert.ok(marker.hitRight - marker.hitLeft >= 44);
  }
  const narrow = patternRanges([shape(1, 0, 0)], { width: 30, edges: () => [0, 30] });
  assert.equal(narrow.markers[0].hitLeft, 0);
  assert.equal(narrow.markers[0].hitRight, 30);
});

test('ties are stable by pattern number and an empty catalog has no marker height', () => {
  const tied = patternRanges([shape(3, 2, 3), shape(1, 2, 3), shape(2, 2, 3)], layout);
  assert.deepEqual(
    tied.markers.map((marker) => marker.pattern.number),
    [1, 2, 3],
  );
  assert.deepEqual(
    tied.markers.map((marker) => marker.lane),
    [0, 1, 2],
  );
  assert.deepEqual(patternRanges([], layout), { markers: [], height: 0 });
});
