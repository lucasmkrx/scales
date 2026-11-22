import test from 'node:test';
import assert from 'node:assert/strict';
import { backingTrackQuery, findBackingTracks } from '../src/backing-tracks.mjs';

test('backing searches retain root and modal harmony and adapt to instrument, style, and tempo', () => {
  assert.equal(
    backingTrackQuery({ root: 9, scale: 'minor-pentatonic' }, { style: 'blues' }),
    'A minor blues backing track for lead guitar',
  );
  assert.equal(
    backingTrackQuery(
      { root: 9, scale: 'dorian', instrument: 'bass', lang: 'pt' },
      { style: 'funk', tempo: 'fast' },
    ),
    'A Dorian funk bassless backing track fast tempo',
  );
  assert.match(
    backingTrackQuery({ root: 1, tonic: 'Db', spelling: 'key', scale: 'phrygian' }),
    /^Db Phrygian /,
  );
  assert.match(
    backingTrackQuery({ scale: 'custom', formula: '1 2 b3 4 5 6 b7' }),
    /^C Dorian /,
  );
  assert.match(
    backingTrackQuery({ scale: 'custom', formula: '1 b2 #4' }),
    /^C tonic drone /,
  );
});

const video = (id) => ({
  id: { videoId: id },
  snippet: {
    title: 'Rock &amp; blues &#39;jam&#39; 90 BPM',
    channelTitle: 'Rhythm &amp; Co',
    thumbnails: { medium: { url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` } },
  },
});

test('a search makes one embeddable video query, filters unusable rows and returns source metadata', async (t) => {
  const ids = ['testClip000', 'testClip001', 'testClip002', 'testClip003'];
  const items = [
    { id: { channelId: 'channel' } },
    video(ids[0]),
    video(ids[0]),
    ...ids.slice(1).map(video),
  ];
  const fetch = t.mock.method(globalThis, 'fetch', async (url) =>
    Response.json(
      url.pathname.endsWith('youtube-config.json') ? { apiKey: 'test' } : { items },
    ),
  );
  const tracks = await findBackingTracks({ root: 9, scale: 'dorian' }, { style: 'funk' });
  assert.deepEqual(
    tracks.map((track) => track.id),
    ids.slice(0, 3),
  );
  assert.deepEqual(tracks[0], {
    id: ids[0],
    title: "Rock & blues 'jam' 90 BPM",
    channel: 'Rhythm & Co',
    thumbnail: items[1].snippet.thumbnails.medium.url,
  });
  assert.equal(fetch.mock.callCount(), 2);
  const [url, options] = fetch.mock.calls[1].arguments;
  assert.equal(url.origin + url.pathname, 'https://www.googleapis.com/youtube/v3/search');
  assert.equal(url.searchParams.get('type'), 'video');
  assert.equal(url.searchParams.get('videoEmbeddable'), 'true');
  assert.equal(url.searchParams.get('videoSyndicated'), 'true');
  assert.equal(url.searchParams.get('maxResults'), '3');
  assert.equal(url.searchParams.get('q'), 'A Dorian funk backing track for lead guitar');
  assert.equal(options.headers['X-Goog-Api-Key'], 'test');
  assert.equal(url.searchParams.has('key'), false);
});

test('empty configurations stop locally and quota, authorization and search failures stay distinguishable', async (t) => {
  const config = { apiKey: '' };
  let response;
  const fetch = t.mock.method(globalThis, 'fetch', async (url) =>
    url.pathname.endsWith('youtube-config.json') ? Response.json(config) : response,
  );
  await assert.rejects(findBackingTracks({}), { code: 'setup' });
  assert.equal(fetch.mock.callCount(), 1);
  config.apiKey = 'test';
  for (const [status, reason, expected] of [
    [403, 'quotaExceeded', 'quota'],
    [429, '', 'quota'],
    [403, 'API_KEY_HTTP_REFERRER_BLOCKED', 'setup'],
    [500, 'internalError', 'search'],
  ]) {
    response = Response.json({ error: { errors: [{ reason }] } }, { status });
    await assert.rejects(findBackingTracks({}), { code: expected });
  }
  response = Response.json({ items: [] });
  assert.deepEqual(await findBackingTracks({}), []);
});
