import test from 'node:test';
import assert from 'node:assert/strict';
import { patternRanges } from '../src/pattern-ranges.mjs';
import { boardModel, layoutBoard, SCALES, STRING_COUNTS } from '../src/music.mjs';
import { scalePatterns } from '../src/patterns.mjs';

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

test('separated brackets share a row and touching brackets stay apart', () => {
  const result = patternRanges([shape(1, 0, 4), shape(2, 3, 7), shape(3, 8, 11)], layout);
  assert.deepEqual(
    result.markers.map((marker) => marker.lane),
    [0, 1, 0],
  );
  assert.equal(result.height, 72);
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

test('D major in E♭ standard places Patterns 1 and 3 on the same row in either orientation', () => {
  const patterns = [
    shape(1, 10, 13),
    shape(2, 0, 4),
    shape(3, 3, 6),
    shape(4, 4, 9),
    shape(5, 7, 11),
  ];
  const right = patternRanges(patterns, layout);
  const left = patternRanges(
    patterns,
    {
      ...layout,
      edges: (fret) => layout.edges(fret).map((edge) => layout.width - edge),
    },
    { hand: 'left' },
  );
  for (const result of [left, right]) {
    assert.deepEqual(
      result.markers.map((marker) => marker.pattern.number),
      [1, 2, 3, 4, 5],
    );
    assert.deepEqual(
      result.markers.map((marker) => marker.lane),
      [1, 0, 1, 2, 0],
    );
    assert.equal(result.height, 104);
    assertNoCollisions(result.markers);
  }
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

function catalogRows(state, hi, patterns, hand) {
  const width = 72 + (hi + 1) * 45;
  const geometry = layoutBoard(boardModel({ ...state, hand }, { hi }), { width });
  const { markers, height } = patternRanges(patterns, geometry, { hand });
  const context = `${state.scale}, frets 0–${hi}, ${hand}`;
  assert.equal(markers.length, patterns.length, context);
  assertNoCollisions(markers);
  for (const { pattern, left, right } of markers) {
    const edges = pattern.points.flatMap((point) => geometry.edges(point.fret));
    assert.equal(left, Math.min(...edges), context);
    assert.equal(right, Math.max(...edges), context);
  }
  // The largest simultaneous overlap is the minimum number of rows needed.
  const overlaps = markers.map(
    ({ hitLeft }) =>
      markers.filter((other) => other.hitLeft <= hitLeft && other.hitRight + 8 > hitLeft)
        .length,
  );
  const minimumRows = Math.max(0, ...overlaps);
  assert.equal(height, minimumRows ? minimumRows * 32 + 8 : 0, context);
  return markers.map(({ pattern, lane }) => [pattern.id, lane]);
}

// D Dorian on six-string bass includes two octave routes that start at the nut.
// Their real fret edges expose rounding differences that integer fixtures cannot.
for (const [instrument, counts] of Object.entries(STRING_COUNTS)) {
  for (const strings of counts) {
    test(`catalog brackets mirror the same frets and rows on ${strings}-string ${instrument}`, () => {
      for (const scale of SCALES) {
        const state = { instrument, strings, scale: scale.id, root: 2, frets: 20 };
        for (const hi of [12, state.frets]) {
          const { patterns } = scalePatterns(state, { hi });
          assert.deepEqual(
            catalogRows(state, hi, patterns, 'right'),
            catalogRows(state, hi, patterns, 'left'),
            `${scale.name.en}, frets 0–${hi}`,
          );
        }
      }
    });
  }
}
