// Rectangles follow DOM order; rows come from the current responsive layout.
export function chooseNextIndex(rects, index, key) {
  if (!Number.isInteger(index) || index < 0 || index >= rects.length) return;
  if (key === 'Home') return 0;
  if (key === 'End') return rects.length - 1;
  if (key === 'ArrowLeft') return Math.max(0, index - 1);
  if (key === 'ArrowRight') return Math.min(rects.length - 1, index + 1);
  if (key !== 'ArrowUp' && key !== 'ArrowDown') return;

  const ordered = rects
    .map(({ left, top, width, height }, i) => ({ left, top, width, height, index: i }))
    .sort((a, b) => a.top - b.top || a.left - b.left || a.index - b.index);
  const rows = [];
  for (const rect of ordered) {
    const bottom = rect.top + rect.height;
    const row = rows.at(-1);
    // Use the shared vertical intersection, so a tall wrapped label cannot
    // absorb another row. Gaps from collection headings do not affect movement.
    if (row && rect.top < row.bottom && bottom > row.top) {
      row.top = Math.max(row.top, rect.top);
      row.bottom = Math.min(row.bottom, bottom);
      row.items.push(rect);
    } else {
      rows.push({ top: rect.top, bottom, items: [rect] });
    }
  }

  const rowIndex = rows.findIndex((row) =>
    row.items.some((item) => item.index === index),
  );
  const next = rows[rowIndex + (key === 'ArrowDown' ? 1 : -1)];
  if (!next) return index;
  const center = rects[index].left + rects[index].width / 2;
  return next.items.reduce((nearest, item) =>
    Math.abs(item.left + item.width / 2 - center) <
    Math.abs(nearest.left + nearest.width / 2 - center)
      ? item
      : nearest,
  ).index;
}
