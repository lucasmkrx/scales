import { rootName, SCALES, selection } from './music.mjs';

export const BACKING_STYLES = ['any', 'blues', 'rock', 'funk', 'jazz', 'metal'];
export const BACKING_TEMPOS = ['any', 'slow', 'medium', 'fast'];

function harmonyFor(scale, style) {
  if (scale.id === 'custom') {
    // A tonic drone leaves an uncommon formula free of an assumed chord quality.
    const match = SCALES.find(
      (candidate) => candidate.intervals.join() === scale.intervals.join(),
    );
    if (!match) return 'tonic drone';
    scale = match;
  }
  switch (scale.id) {
    case 'major':
    case 'major-pentatonic':
      return 'major';
    case 'natural-minor':
    case 'minor-pentatonic':
      return 'minor';
    case 'major-blues':
      return style === 'blues' ? 'major' : 'major blues';
    case 'minor-blues':
      return style === 'blues' ? 'minor' : 'minor blues';
    default:
      return scale.name.en.split(/\s*[(\/]/)[0].trim();
  }
}

export function backingTrackQuery(state, { style = 'any', tempo = 'any' } = {}) {
  const music = selection(state);
  const root = rootName(music).split('/')[0].replaceAll('♯', '#').replaceAll('♭', 'b');
  const genre = BACKING_STYLES.includes(style) && style !== 'any' ? style : '';
  const speed = BACKING_TEMPOS.includes(tempo) && tempo !== 'any' ? `${tempo} tempo` : '';
  const accompaniment =
    music.instrument === 'bass'
      ? 'bassless backing track'
      : 'backing track for lead guitar';
  return [root, harmonyFor(music.scaleData, genre), genre, accompaniment, speed]
    .filter(Boolean)
    .join(' ');
}

// YouTube snippets may HTML-escape literal punctuation. Display the resulting string as text.
function snippetText(text) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return text.replace(
    /&(amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-f]+);/gi,
    (original, name) => {
      if (name[0] !== '#') return entities[name.toLowerCase()];
      const point =
        name[1].toLowerCase() === 'x'
          ? parseInt(name.slice(2), 16)
          : Number(name.slice(1));
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : original;
    },
  );
}

function tracksFrom(items) {
  const tracks = [];
  for (const item of items) {
    const id = item?.id?.videoId;
    if (!/^[\w-]{11}$/.test(id ?? '') || tracks.some((track) => track.id === id))
      continue;
    const { title, channelTitle, thumbnails } = item.snippet ?? {};
    if (
      typeof title !== 'string' ||
      !title.trim() ||
      typeof channelTitle !== 'string' ||
      !channelTitle.trim()
    )
      continue;
    const thumbnail = (thumbnails?.medium ?? thumbnails?.default ?? thumbnails?.high)
      ?.url;
    if (typeof thumbnail !== 'string' || !thumbnail.startsWith('https://')) continue;
    tracks.push({
      id,
      title: snippetText(title),
      channel: snippetText(channelTitle),
      thumbnail,
    });
    if (tracks.length === 3) break;
  }
  return tracks;
}

function searchError(code) {
  return Object.assign(new Error(`Backing-track search: ${code}`), { code });
}

function failureCode(status, detail) {
  const reasons = [...(detail?.errors ?? []), ...(detail?.details ?? [])].map(
    (item) => item.reason,
  );
  if (status === 429 || reasons.some((reason) => /quota|limitExceeded/i.test(reason)))
    return 'quota';
  if (
    status === 401 ||
    reasons.some((reason) =>
      /API_KEY|keyInvalid|accessNotConfigured|SERVICE_DISABLED|ipRefererBlocked/i.test(
        reason,
      ),
    )
  )
    return 'setup';
  return 'search';
}

async function requestJson(url, options, fallback) {
  let response;
  let data;
  try {
    response = await fetch(url, options);
    data = await response.json();
  } catch (error) {
    if (options.signal?.aborted || error.name === 'AbortError') throw error;
    throw searchError(response?.status === 429 ? 'quota' : fallback);
  }
  if (!response.ok)
    throw searchError(
      fallback === 'setup' ? 'setup' : failureCode(response.status, data?.error),
    );
  if (!data) throw searchError(fallback);
  return data;
}

export async function findBackingTracks(
  state,
  { style = 'any', tempo = 'any', signal } = {},
) {
  const { apiKey } = await requestJson(
    new URL('../youtube-config.json', import.meta.url),
    { cache: 'no-store', signal },
    'setup',
  );
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw searchError('setup');
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.search = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '3',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    fields: 'items(id/videoId,snippet(title,channelTitle,thumbnails))',
    q: backingTrackQuery(state, { style, tempo }),
  }).toString();
  const data = await requestJson(
    url,
    {
      headers: { 'X-Goog-Api-Key': apiKey },
      signal,
      credentials: 'omit',
      referrerPolicy: 'strict-origin',
    },
    'search',
  );
  if (!Array.isArray(data?.items)) throw searchError('search');
  return tracksFrom(data.items);
}
