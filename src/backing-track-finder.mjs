import {
  BACKING_STYLES,
  backingTrackQuery,
  findBackingTracks,
} from './backing-tracks.mjs';
import { copy } from './i18n.mjs';
import { rootName, selection } from './music.mjs';
import { scaleName } from './workspace.mjs';

const styleKey = 'scales.backingStyle';
let playerApi;
function loadPlayerApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!playerApi) {
    playerApi = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      window.onYouTubeIframeAPIReady = () => resolve(window.YT);
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        script.remove();
        playerApi = undefined;
        reject(new Error('Player API unavailable'));
      };
      document.head.append(script);
    });
  }
  return playerApi;
}

export function enableBackingTracks(getState) {
  const el = (id) => document.getElementById(id);
  const style = el('backing-style');
  const tempo = el('backing-tempo');
  tempo.value = 'any';
  const results = el('backing-results');
  const panel = el('backing-player');
  const mount = el('backing-embed');
  let request, signature, apiPlayer, activeTrack;
  let tracks = [];
  let searchStatus = '',
    playerStatus = '';
  const strings = () => copy[getState().lang];
  try {
    const saved = localStorage.getItem(styleKey);
    if (BACKING_STYLES.includes(saved)) style.value = saved;
  } catch {}

  function updateStatus() {
    const t = strings();
    const status = el('backing-status');
    const hasMatches = !searchStatus && tracks.length > 0;
    status.classList.toggle('sr-only', hasMatches);
    status.textContent = hasMatches
      ? `${tracks.length} ${tracks.length === 1 ? t.result : t.results}`
      : t[searchStatus] || '';
    el('backing-player-status').textContent = t[playerStatus] || '';
    el('backing-find').disabled = Boolean(request);
    results.setAttribute('aria-busy', String(Boolean(request)));
  }

  function updateTrackLabels() {
    const t = strings();
    for (const button of results.querySelectorAll('button')) {
      const track = tracks.find((item) => item.id === button.dataset.video);
      button.setAttribute(
        'aria-label',
        t.playBacking.replace('{title}', () => track.title),
      );
      if (track.id === activeTrack?.id) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
  }

  function refresh() {
    const state = selection(getState());
    el('backing-context').textContent =
      `${rootName(state)} ${scaleName(state.scaleData, state.lang)} · ${strings()[state.instrument]}`;
    const next = backingTrackQuery(state, { style: style.value, tempo: tempo.value });
    if (signature !== next) {
      signature = next;
      request?.abort();
      request = undefined;
      tracks = [];
      searchStatus = '';
      results.replaceChildren();
    }
    updateStatus();
    updateTrackLabels();
  }

  function showResults() {
    const rows = tracks.map((track) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'backing-result';
      button.dataset.video = track.id;
      const image = document.createElement('img');
      image.src = track.thumbnail;
      image.alt = '';
      image.width = 80;
      image.height = 45;
      const text = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = track.title;
      const channel = document.createElement('small');
      channel.textContent = track.channel;
      text.append(title, channel);
      const play = document.createElement('i');
      play.className = 'icon fa-solid fa-play';
      play.setAttribute('aria-hidden', 'true');
      button.append(image, text, play);
      item.append(button);
      return item;
    });
    results.replaceChildren(...rows);
    updateTrackLabels();
  }

  el('backing-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    request?.abort();
    const current = new AbortController();
    request = current;
    searchStatus = 'backingLoading';
    updateStatus();
    try {
      const found = await findBackingTracks(getState(), {
        style: style.value,
        tempo: tempo.value,
        signal: current.signal,
      });
      if (request !== current) return;
      tracks = found;
      showResults();
      searchStatus = found.length ? '' : 'backingEmpty';
    } catch (error) {
      if (request !== current) return;
      tracks = [];
      results.replaceChildren();
      searchStatus =
        { setup: 'backingSetup', quota: 'backingQuota' }[error.code] || 'backingFailure';
    } finally {
      if (request === current) {
        request = undefined;
        updateStatus();
      }
    }
  });

  style.addEventListener('change', () => {
    try {
      localStorage.setItem(styleKey, style.value);
    } catch {}
    refresh();
  });
  tempo.addEventListener('change', refresh);

  function removePlayer() {
    apiPlayer?.destroy();
    apiPlayer = undefined;
    mount.replaceChildren();
    activeTrack = undefined;
    playerStatus = '';
  }

  results.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-video]');
    if (!button) return;
    const track = tracks.find((item) => item.id === button.dataset.video);
    removePlayer();
    activeTrack = track;
    const frame = document.createElement('iframe');
    const src = new URL(`https://www.youtube.com/embed/${track.id}`);
    src.search = new URLSearchParams({
      autoplay: '1',
      playsinline: '1',
      enablejsapi: '1',
      origin: location.origin,
    });
    frame.title = track.title;
    frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.src = src;
    mount.replaceChildren(frame);
    el('backing-watch').href = `https://www.youtube.com/watch?v=${track.id}`;
    el('backing-current').textContent = track.title;
    panel.hidden = false;
    updateTrackLabels();
    updateStatus();
    // Anchor the player at the bottom of the viewport with the diagram above it.
    frame.focus({ preventScroll: true });
    frame.scrollIntoView({ block: 'end', behavior: 'instant' });
    try {
      const api = await loadPlayerApi();
      if (!frame.isConnected) return;
      const setMessage = (key) => {
        if (frame.isConnected) {
          playerStatus = key;
          updateStatus();
        }
      };
      apiPlayer = new api.Player(frame, {
        events: {
          onError: () => setMessage('backingUnplayable'),
          onAutoplayBlocked: () => setMessage('backingPlayHint'),
          onStateChange: (state) => {
            if (state.data === 1) setMessage('');
          },
        },
      });
    } catch {
      // The iframe and direct watch link work independently of the optional events API.
    }
  });

  el('backing-close').addEventListener('click', () => {
    const opener = results.querySelector('[aria-current="true"]') || el('backing-find');
    removePlayer();
    panel.hidden = true;
    updateTrackLabels();
    updateStatus();
    opener.focus({ preventScroll: true });
  });
  return refresh;
}
