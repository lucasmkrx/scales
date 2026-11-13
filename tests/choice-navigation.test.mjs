import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseNextIndex } from '../src/choice-navigation.mjs';

const grid = (columns, count) =>
  Array.from({ length: count }, (_, i) => ({
    left: (i % columns) * 110,
    top: Math.floor(i / columns) * 50,
    width: 100,
    height: 40,
  }));

test('desktop arrows follow visual columns and find the nearest choice in a short row', () => {
  const rects = grid(4, 10);
  assert.equal(chooseNextIndex(rects, 2, 'ArrowDown'), 6);
  assert.equal(chooseNextIndex(rects, 6, 'ArrowUp'), 2);
  assert.equal(chooseNextIndex(rects, 7, 'ArrowDown'), 9);
  assert.equal(chooseNextIndex(rects, 3, 'ArrowRight'), 4);
  assert.equal(chooseNextIndex(rects, 4, 'ArrowLeft'), 3);
});

test('the same choices navigate correctly after reflowing into two mobile columns', () => {
  const rects = grid(2, 10);
  assert.equal(chooseNextIndex(rects, 2, 'ArrowDown'), 4);
  assert.equal(chooseNextIndex(rects, 6, 'ArrowUp'), 4);
  assert.equal(chooseNextIndex(rects, 7, 'ArrowDown'), 9);
});

test('wrapped labels and collection-heading gaps do not create false rows', () => {
  const rects = [
    { left: 0, top: 0, width: 100, height: 72 },
    { left: 110, top: 15, width: 100, height: 42 },
    { left: 0, top: 84, width: 100, height: 40 },
    { left: 110, top: 84, width: 100, height: 65 },
    { left: 0, top: 210, width: 100, height: 50 },
    { left: 110, top: 210, width: 100, height: 50 },
  ];
  assert.equal(chooseNextIndex(rects, 0, 'ArrowDown'), 2);
  assert.equal(chooseNextIndex(rects, 1, 'ArrowDown'), 3);
  assert.equal(chooseNextIndex(rects, 3, 'ArrowUp'), 1);
  assert.equal(chooseNextIndex(rects, 3, 'ArrowDown'), 5);
  assert.equal(chooseNextIndex(rects, 4, 'ArrowUp'), 2);
});

test('vertical navigation uses horizontal centers across differently sized choices', () => {
  const rects = [
    { left: 100, top: 0, width: 100, height: 40 },
    { left: 0, top: 50, width: 220, height: 40 },
    { left: 230, top: 50, width: 80, height: 40 },
  ];
  assert.equal(chooseNextIndex(rects, 0, 'ArrowDown'), 1);
});

test('edges clamp, Home and End span the catalog, and unrelated input is ignored', () => {
  const rects = grid(4, 10);
  assert.equal(chooseNextIndex(rects, 0, 'ArrowLeft'), 0);
  assert.equal(chooseNextIndex(rects, 9, 'ArrowRight'), 9);
  assert.equal(chooseNextIndex(rects, 2, 'ArrowUp'), 2);
  assert.equal(chooseNextIndex(rects, 8, 'ArrowDown'), 8);
  assert.equal(chooseNextIndex(rects, 5, 'Home'), 0);
  assert.equal(chooseNextIndex(rects, 5, 'End'), 9);
  assert.equal(chooseNextIndex(rects, 5, 'Enter'), undefined);
  for (const index of [-1, 10, 0.5, NaN]) {
    assert.equal(chooseNextIndex(rects, index, 'ArrowDown'), undefined);
  }
  assert.equal(chooseNextIndex([], 0, 'Home'), undefined);
});
