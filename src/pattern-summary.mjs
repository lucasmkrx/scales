import { selection, prettyDegree } from './music.mjs';
import { copy } from './i18n.mjs';

export function patternSummary(input, pattern) {
  if (!pattern?.points.length) return null;
  const state = selection(input),
    t = copy[state.lang];
  const lowest = pattern.points.reduce((a, b) => (a.midi <= b.midi ? a : b));
  const title =
    state.instrument === 'bass'
      ? `${t.string} ${pattern.startRow + 1}`
      : `${t.pattern} ${pattern.number}${pattern.shape ? ` · ${t.patternShape.replace('{shape}', pattern.shape)}` : ''}`;
  const values = {
    note: lowest.name,
    degree: prettyDegree(lowest.degree),
  };
  return {
    title,
    detail: t.patternDetails.replace(/\{(\w+)\}/g, (_, key) => values[key]),
  };
}
