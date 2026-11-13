// Keep one predictable row per pattern; each bracket shares neck coordinates.
// Labels and hit areas stay within the canvas even on narrow upper frets.
export function patternRanges(patterns, layout, { labelFor, laneHeight = 32 } = {}) {
  const width = Math.max(0, layout.width);
  const markers = patterns.map((pattern, index) => {
    const edges = [...layout.edges(pattern.lo), ...layout.edges(pattern.hi)];
    const left = Math.min(...edges);
    const right = Math.max(...edges);
    const label = String(labelFor?.(pattern) ?? `Pattern ${pattern.number}`);
    const hitWidth = Math.min(width, Math.max(44, label.length * 7 + 24, right - left));
    const hitLeft = Math.max(
      0,
      Math.min((left + right - hitWidth) / 2, width - hitWidth),
    );
    return { pattern, left, right, hitLeft, hitRight: hitLeft + hitWidth, label, index };
  });
  markers.sort(
    (a, b) => (a.pattern.number ?? 0) - (b.pattern.number ?? 0) || a.index - b.index,
  );
  markers.forEach((marker, lane) => (marker.lane = lane));
  return {
    markers: markers.map(({ index, ...marker }) => marker),
    height: markers.length ? markers.length * laneHeight + 8 : 0,
  };
}
