// SPDX-License-Identifier: MPL-2.0

import { backingSearchUrl, backingTrackChoices } from './backing-tracks.mjs';
import { copy } from './i18n.mjs';
import { rootName, selection } from './music.mjs';
import { scaleName } from './workspace.mjs';

export function enableBackingTracks(getState) {
  const context = document.getElementById('backing-context');
  const search = document.getElementById('backing-search');
  const list = document.getElementById('backing-list');
  const playback = document.getElementById('backing-playback');
  const screen = document.getElementById('backing-screen');
  const fallback = document.getElementById('backing-fallback');
  const currentTitle = document.getElementById('backing-current');
  const notice = document.getElementById('backing-player-status');
  let playing = null;
  let youtubePlayer = null;
  let errorKey = null;

  function showError(key) {
    errorKey = key;
    notice.textContent = copy[getState().lang][key];
    notice.hidden = false;
  }

  function observePlayer() {
    const frame = screen.firstElementChild;
    if (!frame || youtubePlayer || !window.YT?.Player) return;
    youtubePlayer = new window.YT.Player(frame, {
      events: {
        onError({ data }) {
          if (frame !== screen.firstElementChild) return;
          showError(
            [100, 101, 150].includes(data) ? 'backingRestricted' : 'backingInterrupted',
          );
        },
      },
    });
  }

  // The iframe plays on its own even if the optional error-reporting API is blocked.
  function loadPlayerObserver() {
    if (window.YT?.Player) return observePlayer();
    if (document.getElementById('backing-youtube-api')) return;
    const script = document.createElement('script');
    script.id = 'backing-youtube-api';
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => script.remove();
    window.onYouTubeIframeAPIReady = observePlayer;
    document.head.append(script);
  }

  function updateTrackButton(button, open) {
    const t = copy[getState().lang];
    const details = [...button.querySelectorAll('strong, small, .backing-tags > span')];
    button.setAttribute(
      'aria-label',
      [
        open ? t.closeBacking : t.playBacking,
        ...details.map((el) => el.textContent),
      ].join(' · '),
    );
    button.setAttribute('aria-expanded', String(open));
    if (open) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
    button.querySelector('i').className = `icon fa-solid fa-${open ? 'stop' : 'play'}`;
  }

  function close() {
    youtubePlayer?.destroy();
    youtubePlayer = null;
    screen.replaceChildren();
    playback.hidden = true;
    notice.hidden = true;
    notice.textContent = '';
    errorKey = null;
    const current = list.querySelector('[aria-current]');
    if (current) updateTrackButton(current, false);
    playing = null;
  }

  list.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-video]');
    if (!button) return;
    const id = button.dataset.video;
    const wasPlaying = id === playing;
    close();
    if (wasPlaying) {
      button.focus({ preventScroll: true });
      return;
    }
    const player = document.createElement('iframe');
    player.id = 'backing-player';
    player.title = button.querySelector('strong').textContent;
    player.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    player.allowFullscreen = true;
    player.referrerPolicy = 'strict-origin-when-cross-origin';
    const url = new URL(`https://www.youtube.com/embed/${id}`);
    url.search = new URLSearchParams({
      autoplay: '1',
      playsinline: '1',
      rel: '0',
      enablejsapi: '1',
      origin: location.origin,
    });
    player.src = url.href;
    player.addEventListener('error', () => {
      if (player === screen.firstElementChild) showError('backingInterrupted');
    });
    screen.append(player);
    updateTrackButton(button, true);
    currentTitle.textContent = player.title;
    playback.hidden = false;
    playing = id;
    if (!navigator.onLine) showError('backingInterrupted');
    loadPlayerObserver();
  });
  document.getElementById('backing-close').addEventListener('click', () => {
    const button = list.querySelector('[aria-current]');
    close();
    button?.focus();
  });

  return function render() {
    const state = selection(getState());
    const t = copy[state.lang];
    const root = rootName(state);
    context.textContent = `${root} ${scaleName(state.scaleData, state.lang)} · ${t[state.instrument]}`;
    search.href = backingSearchUrl(state);
    const choices = backingTrackChoices(state);
    const chord = choices[0].chordSymbol;
    if (playing && !choices.some((track) => track.videoId === playing)) close();
    fallback.hidden = !chord && choices[0].style !== 'drone';
    fallback.textContent = chord
      ? t.chordFallback.replace('{chord}', root + chord)
      : t.backingFallback;
    if (errorKey) notice.textContent = t[errorKey];
    list.replaceChildren(
      ...choices.map((track) => {
        const drone = track.style === 'drone';
        const recordingTitle = t.backingSeries[track.title] ?? track.title;
        const title = drone
          ? `${t.tonicDrone} · ${root}`
          : track.chordSymbol
            ? `${root}${track.chordSymbol} · ${t.tonicChord}`
            : recordingTitle;
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.video = track.videoId;
        button.setAttribute('aria-controls', playback.id);
        const icon = document.createElement('i');
        icon.setAttribute('aria-hidden', 'true');
        const name = document.createElement('strong');
        name.textContent = title;
        const byline = document.createElement('small');
        byline.textContent = track.creator;
        const tags = document.createElement('span');
        tags.className = 'backing-tags';
        const style = document.createElement('span');
        style.textContent = t.backingStyles[track.style];
        const tempo = document.createElement('span');
        tempo.textContent = track.bpm
          ? `${track.bpm} BPM`
          : drone || track.unmetered
            ? t.unmetered
            : t.tempoUnlisted;
        tags.append(style, tempo);
        button.append(icon, name, byline, tags);
        updateTrackButton(button, track.videoId === playing);
        if (track.videoId === playing) {
          currentTitle.textContent = title;
          screen.firstElementChild.title = title;
        }
        const item = document.createElement('li');
        item.append(button);
        return item;
      }),
    );
  };
}
