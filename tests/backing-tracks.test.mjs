// SPDX-License-Identifier: MPL-2.0

import test from 'node:test';
import assert from 'node:assert/strict';
import { backingTrackChoices } from '../src/backing-tracks.mjs';
import { backingCatalog, rootDrones } from '../src/backing-track-catalog.mjs';
import { SCALES } from '../src/catalog.mjs';
import { copy } from '../src/i18n.mjs';

const guitar = { instrument: 'guitar', root: 9, scale: 'minor-pentatonic' };
const bass = { instrument: 'bass', root: 2, scale: 'dorian' };

test('catalog entries use supported scales, translated style tags, and published tempos where supplied', () => {
  const scales = new Set(SCALES.map((scale) => scale.id));
  for (const track of backingCatalog) {
    assert.ok(Number.isInteger(track.root) && track.root >= 0 && track.root < 12);
    assert.ok(['guitar', 'bass', 'both'].includes(track.instrument));
    assert.ok(
      track.scales.length && track.scales.every((id) => scales.has(id)),
      track.title,
    );
    assert.ok(track.bpm === undefined || (Number.isFinite(track.bpm) && track.bpm > 0));
    if (track.unmetered) assert.equal(track.bpm, undefined);
    for (const locale of Object.values(copy)) {
      assert.ok(locale.backingStyles[track.style], track.style);
    }
  }
});

test('each guitar mode has its own tonic-specific lesson in every key', () => {
  const modes = [
    'major',
    'dorian',
    'phrygian',
    'lydian',
    'mixolydian',
    'natural-minor',
    'locrian',
  ];
  const ids = new Set();
  for (let root = 0; root < 12; root++) {
    for (const scale of modes) {
      const lessons = backingTrackChoices({ root, scale, instrument: 'guitar' }).filter(
        (track) => track.creator === 'Fretmeup',
      );
      assert.equal(lessons.length, 1);
      const [lesson] = lessons;
      assert.equal(lesson.root, root);
      assert.deepEqual(lesson.scales, [scale]);
      ids.add(lesson.videoId);
    }
  }
  assert.equal(ids.size, 84);
});

test('every major key offers bassless swing only to compatible bass selections', () => {
  for (let root = 0; root < 12; root++) {
    const state = { root, scale: 'major', instrument: 'bass' };
    const swing = backingTrackChoices(state).find(
      (track) => track.title === 'Bassless swing · ii–V–I',
    );
    assert.ok(swing);
    assert.equal(swing.bpm, 120);
    assert.equal(swing.style, 'jazz');
    assert.deepEqual(swing.scales, ['major', 'major-pentatonic']);
    for (const change of [{ scale: 'natural-minor' }, { instrument: 'guitar' }]) {
      assert.ok(
        !backingTrackChoices({ ...state, ...change }).some(
          (track) => track.videoId === swing.videoId,
        ),
      );
    }
  }
});

test('every catalog video is unique and every root has guitar and bass arrangements', () => {
  const ids = [...backingCatalog.map((track) => track.videoId), ...rootDrones];
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[\w-]{11}$/);
  for (let root = 0; root < 12; root++) {
    for (const instrument of ['guitar', 'bass']) {
      const tracks = backingTrackChoices({ root, instrument, scale: 'minor-pentatonic' });
      assert.ok(tracks.length > 0);
      assert.ok(
        tracks.every((track) => track.instrument === instrument && track.root === root),
      );
    }
  }
});

test('all compatible styles and tempos are returned together', () => {
  const choices = backingTrackChoices(guitar);
  const matching = backingCatalog.filter(
    (track) =>
      (track.instrument === guitar.instrument || track.instrument === 'both') &&
      track.root === guitar.root &&
      track.scales.includes(guitar.scale),
  );
  assert.deepEqual(
    new Set(choices.map((track) => track.videoId)),
    new Set(matching.map((track) => track.videoId)),
  );
  assert.ok(choices.some((track) => track.style === 'blues' && track.bpm === 60));
  assert.ok(choices.some((track) => track.style === 'metal' && track.bpm === 150));
  assert.equal(new Set(choices.map((track) => track.videoId)).size, choices.length);
  for (const track of choices) {
    assert.equal(track.root, 9);
    assert.ok(track.style.trim());
    assert.match(track.videoId, /^[\w-]{11}$/);
    assert.ok(track.title.trim());
    assert.ok(track.creator.trim());
    if (track.bpm !== undefined) assert.ok(track.bpm > 0);
  }
});

test('bass and custom scales with matching intervals get compatible backing tracks', () => {
  const choices = backingTrackChoices(bass);
  assert.ok(choices.length > 0);
  assert.ok(choices.every((track) => track.root === 2));
  assert.ok(choices.some((track) => track.style === 'funk' && track.bpm === undefined));
  assert.ok(choices.every((track) => track.instrument === 'bass'));
  const guitarChoices = backingTrackChoices({ ...bass, instrument: 'guitar' });
  assert.ok(guitarChoices.every((track) => track.instrument === 'guitar'));
  assert.deepEqual(
    backingTrackChoices({ ...bass, scale: 'custom', formula: '1 2 b3 4 5 6 b7' }),
    choices,
  );
});

test('E Phrygian and E Phrygian dominant get their distinct Quist arrangements', () => {
  const state = { root: 4, instrument: 'guitar' };
  const phrygian = backingTrackChoices({ ...state, scale: 'phrygian' });
  const dominant = backingTrackChoices({ ...state, scale: 'phrygian-dominant' });
  assert.ok(phrygian.some((track) => track.videoId === '0Y7O6MTSZXA'));
  assert.ok(dominant.some((track) => track.videoId === 'V1e3dIVGd_Y'));
  assert.ok(
    !phrygian.some((track) => dominant.some((other) => other.videoId === track.videoId)),
  );
  assert.deepEqual(
    backingTrackChoices({ ...state, scale: 'custom', formula: '1 b2 3 4 5 b6 b7' }),
    dominant,
  );
});

test('bass has a dedicated arrangement for all seven major modes and harmonic minor in every key', () => {
  for (const scale of [
    ...SCALES.filter((s) => s.family === 'major').map((s) => s.id),
    'harmonic-minor',
  ]) {
    for (let root = 0; root < 12; root++) {
      const options = backingTrackChoices({ scale, root, instrument: 'bass' });
      assert.ok(
        options.some(
          (t) => t.instrument === 'bass' && t.root === root && t.scales.includes(scale),
        ),
      );
    }
  }
});

test('every guitar arpeggio has an exact recording and solo piano is available to both instruments', () => {
  for (const scale of SCALES.filter((s) => s.family === 'arpeggio')) {
    for (let root = 0; root < 12; root++) {
      const tracks = backingTrackChoices({ root, scale: scale.id, instrument: 'guitar' });
      assert.ok(tracks.some((t) => t.scales?.includes(scale.id) && t.root === root));
    }
  }
  for (const instrument of ['guitar', 'bass']) {
    const choices = backingTrackChoices({ root: 0, scale: 'sus4', instrument });
    assert.ok(
      choices.some((t) => t.videoId === 'kJPh6rkNE_8' && t.instrument === instrument),
    );
  }
});

test('supplemental piano recordings contain a compatible tonic chord and are followed by a drone', () => {
  for (const scale of SCALES) {
    for (const instrument of ['bass', 'guitar']) {
      for (let root = 0; root < 12; root++) {
        const choices = backingTrackChoices({ root, instrument, scale: scale.id });
        const [track, drone] = choices;
        if (!track.chordSymbol) continue;
        assert.equal(track.tonicVamp, true);
        assert.equal(track.root, root);
        assert.equal(track.instrument, instrument);
        const arpeggio = SCALES.find((s) => s.id === track.scales[0]);
        assert.ok(
          arpeggio.intervals.every((p) => scale.intervals.includes(p)),
          scale.id,
        );
        assert.equal(drone.videoId, rootDrones[root]);
      }
    }
  }
  const state = { root: 0, instrument: 'bass', scale: 'bebop-dominant' };
  assert.equal(backingTrackChoices(state)[0].chordSymbol, '7');
  assert.deepEqual(
    backingTrackChoices({ ...state, scale: 'custom', formula: '1 2 3 4 5 6 b7 7' }),
    backingTrackChoices(state),
  );
  assert.equal(backingTrackChoices({ ...state, scale: 'chromatic' })[0].style, 'drone');
});

test('the melodic minor chord pads in every key are unmetered and shared between instruments', () => {
  for (let root = 0; root < 12; root++) {
    for (const instrument of ['guitar', 'bass']) {
      const choices = backingTrackChoices({ root, instrument, scale: 'melodic-minor' });
      assert.ok(
        choices.some(
          (t) =>
            t.root === root &&
            t.unmetered &&
            t.style === 'ambient' &&
            t.instrument === instrument,
        ),
      );
    }
  }
});

test('unfamiliar intervals get one playable drone on the selected root in every key', () => {
  const ids = new Set();
  for (let root = 0; root < 12; root++) {
    const state = { root, scale: 'custom', formula: '1 b2 #4' };
    const choices = backingTrackChoices(state);
    assert.equal(choices.length, 1);
    const [drone] = choices;
    assert.equal(drone.style, 'drone');
    assert.equal(drone.root, root);
    assert.match(drone.videoId, /^[\w-]{11}$/);
    assert.ok(drone.creator.trim());
    ids.add(drone.videoId);
    assert.deepEqual(backingTrackChoices({ ...state, instrument: 'bass' }), choices);
  }
  assert.equal(ids.size, 12);
});
