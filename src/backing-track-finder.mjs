import { BACKING_STYLES, backingTrackQuery } from './backing-tracks.mjs';
import { copy } from './i18n.mjs';
import { rootName, selection } from './music.mjs';
import { scaleName } from './workspace.mjs';

const styleKey = 'scales.backingStyle';

export function enableBackingTracks(getState) {
  const style = document.getElementById('backing-style');
  const tempo = document.getElementById('backing-tempo');
  const query = document.getElementById('backing-query');
  const context = document.getElementById('backing-context');
  tempo.value = 'any';
  try {
    const saved = localStorage.getItem(styleKey);
    if (BACKING_STYLES.includes(saved)) style.value = saved;
  } catch {}
  style.addEventListener('change', () => {
    try {
      localStorage.setItem(styleKey, style.value);
    } catch {}
  });
  document.getElementById('backing-form').addEventListener('submit', () => {
    query.value = backingTrackQuery(getState(), {
      style: style.value,
      tempo: tempo.value,
    });
  });

  return () => {
    const state = selection(getState());
    context.textContent = `${rootName(state)} ${scaleName(state.scaleData, state.lang)} · ${copy[state.lang][state.instrument]}`;
  };
}
