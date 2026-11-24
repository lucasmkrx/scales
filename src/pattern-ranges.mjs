// SPDX-License-Identifier: MPL-2.0

const markerGap = 8;
// Compare positions at the same precision in both hands. Mirroring the same fret
// edge can otherwise yield slightly different floating-point values for tied starts.
const packingCoordinate = (pixels) => Math.round(pixels * 1_000_000);

export function patternRanges(
  patterns,
  layout,
  { labelFor, laneHeight = 32, hand } = {},
) {
  const width = Math.max(0, layout.width);
  const markers = patterns.map((pattern) => {
    const edges = [...layout.edges(pattern.lo), ...layout.edges(pattern.hi)];
    const left = Math.min(...edges);
    const right = Math.max(...edges);
    const label = String(labelFor?.(pattern) ?? `Pattern ${pattern.number}`);
    const hitWidth = Math.min(width, Math.max(44, label.length * 7 + 24, right - left));
    const hitLeft = Math.max(
      0,
      Math.min((left + right - hitWidth) / 2, width - hitWidth),
    );
    return { pattern, left, right, hitLeft, hitRight: hitLeft + hitWidth, label };
  });
  markers.sort((a, b) => (a.pattern.number ?? 0) - (b.pattern.number ?? 0));

  // Pack from the nut in either orientation, keeping keyboard order by pattern number.
  const spans = markers.map((marker) => ({
    marker,
    start: packingCoordinate(hand === 'left' ? width - marker.hitRight : marker.hitLeft),
    end: packingCoordinate(hand === 'left' ? width - marker.hitLeft : marker.hitRight),
  }));
  spans.sort((a, b) => a.start - b.start);
  const nextFree = [];
  for (const { marker, start, end } of spans) {
    const available = nextFree.findIndex((position) => position <= start);
    marker.lane = available < 0 ? nextFree.length : available;
    nextFree[marker.lane] = end + packingCoordinate(markerGap);
  }
  return {
    markers,
    height: nextFree.length ? nextFree.length * laneHeight + 8 : 0,
  };
}
