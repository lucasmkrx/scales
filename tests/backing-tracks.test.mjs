import test from 'node:test';
import assert from 'node:assert/strict';
import { backingTrackQuery } from '../src/backing-tracks.mjs';

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
