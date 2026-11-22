import test from 'node:test';
import assert from 'node:assert/strict';
import { backingTrackQuery } from '../src/backing-tracks.mjs';

test('backing searches retain root and modal harmony and adapt to instrument, style, and tempo', () => {
  assert.equal(
    backingTrackQuery({ root: 9, scale: 'minor-pentatonic' }, { style: 'blues' }),
    'blues guitar backing track in A minor',
  );
  assert.equal(
    backingTrackQuery(
      { root: 9, scale: 'dorian', instrument: 'bass', lang: 'pt' },
      { style: 'funk', tempo: 'fast' },
    ),
    'fast funk backing track in A Dorian no bass',
  );
  assert.equal(
    backingTrackQuery({ root: 1, tonic: 'Db', spelling: 'key', scale: 'phrygian' }),
    'guitar backing track in Db Phrygian',
  );
  assert.equal(
    backingTrackQuery({ scale: 'custom', formula: '1 2 b3 4 5 6 b7' }),
    'guitar backing track in C Dorian',
  );
  assert.equal(
    backingTrackQuery(
      { scale: 'custom', formula: '1 b2 #4' },
      { style: 'funk', tempo: 'slow' },
    ),
    'C drone for improvisation',
  );
});

test('queries keep the blues style and the details that distinguish similar scales', () => {
  assert.equal(
    backingTrackQuery(
      { root: 9, scale: 'minor-blues' },
      { style: 'blues', tempo: 'slow' },
    ),
    'slow blues guitar backing track in A minor',
  );
  assert.equal(
    backingTrackQuery({ root: 9, scale: 'major-blues' }, { style: 'rock' }),
    'blues rock guitar backing track in A major',
  );
  assert.equal(
    backingTrackQuery({ root: 6, tonic: 'F#', scale: 'dorian-sharp-4' }),
    'guitar backing track in F# Dorian #4',
  );
  assert.equal(
    backingTrackQuery({ scale: 'diminished-hw' }),
    'guitar backing track in C half whole diminished',
  );
  assert.equal(
    backingTrackQuery({ scale: 'diminished-wh' }),
    'guitar backing track in C whole half diminished',
  );
});
