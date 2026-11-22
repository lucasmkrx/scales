import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPluckedString, PluckedStringPlayer } from '../src/string-audio.mjs';
const rms = (data, a, b) => {
  let sum = 0;
  for (let i = a; i < b; i++) sum += data[i] ** 2;
  return Math.sqrt(sum / (b - a));
};
function measuredFrequency(data, fs, expected) {
  const start = Math.round(fs * 0.18),
    count = Math.round(fs * 0.16),
    period = fs / expected,
    lo = Math.max(2, Math.floor(period * 0.96)),
    hi = Math.ceil(period * 1.04),
    scores = [];
  for (let lag = lo; lag <= hi; lag++) {
    let dot = 0,
      energy = 0;
    for (let i = start; i < start + count; i++) {
      const a = data[i],
        b = data[i + lag];
      dot += a * b;
      energy += a * a + b * b;
    }
    scores.push((2 * dot) / energy);
  }
  let best = 0;
  for (let i = 1; i < scores.length; i++) if (scores[i] > scores[best]) best = i;
  const a = scores[best - 1],
    b = scores[best],
    c = scores[best + 1];
  const fraction =
    Number.isFinite(a) && Number.isFinite(c) ? (0.5 * (a - c)) / (a - 2 * b + c) : 0;
  return fs / (lo + best + fraction);
}
test('plucked notes stay in tune from low bass to high guitar at both common sample rates', () => {
  for (const sampleRate of [44100, 48000])
    for (const midi of [21, 28, 40, 52, 64, 76, 88]) {
      const instrument = midi < 40 ? 'bass' : 'guitar',
        samples = renderPluckedString(midi, { instrument, sampleRate }),
        expected = 440 * 2 ** ((midi - 69) / 12);
      const cents =
        1200 * Math.log2(measuredFrequency(samples, sampleRate, expected) / expected);
      assert.ok(
        Math.abs(cents) < 3,
        `${instrument} MIDI ${midi}, ${sampleRate} Hz: ${cents} cents`,
      );
      assert.ok(samples.every(Number.isFinite));
      assert.ok(samples.every((v) => Math.abs(v) <= 0.681));
      assert.ok(samples[0] === 0 && samples.at(-1) === 0);
      assert.ok(
        rms(samples, sampleRate, Math.round(1.1 * sampleRate)) <
          rms(samples, Math.round(0.04 * sampleRate), Math.round(0.15 * sampleRate)) *
            0.3,
        'a pluck must decay',
      );
    }
});
test('string generation is repeatable, rejects invalid inputs, and does not alias inaudible notes', () => {
  assert.deepEqual(renderPluckedString(52), renderPluckedString(52));
  assert.throws(() => renderPluckedString(NaN), RangeError);
  assert.throws(() => renderPluckedString(52, { sampleRate: 0 }), RangeError);
  assert.ok(renderPluckedString(151, { sampleRate: 44100 }).every((v) => v === 0));
});

// Windowed correlation measures the actual pitched partial, rather than treating
// loud pick noise as useful bass energy. The old white-noise excitation could
// nearly omit the fundamental on an otherwise correctly tuned string.
function partialAmplitude(samples, frequency, sampleRate) {
  const start = Math.round(sampleRate * 0.08);
  const count = Math.round(sampleRate * 0.22);
  let real = 0,
    imaginary = 0;
  for (let offset = 0; offset < count; offset++) {
    const index = start + offset;
    const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * offset) / count);
    const phase = (2 * Math.PI * frequency * index) / sampleRate;
    real += samples[index] * window * Math.cos(phase);
    imaginary += samples[index] * window * Math.sin(phase);
  }
  return (4 * Math.hypot(real, imaginary)) / count;
}

test('plucks retain a useful fundamental, upper string harmonics, and a clean decay', () => {
  for (const sampleRate of [44100, 48000])
    for (const instrument of ['guitar', 'bass'])
      for (const midi of instrument === 'bass' ? [21, 28, 40] : [40, 52, 64, 76]) {
        const samples = renderPluckedString(midi, { instrument, sampleRate });
        const frequency = 440 * 2 ** ((midi - 69) / 12);
        const fundamental = partialAmplitude(samples, frequency, sampleRate);
        const second = partialAmplitude(samples, frequency * 2, sampleRate);
        const third = partialAmplitude(samples, frequency * 3, sampleRate);
        assert.ok(fundamental > 0.12, `${instrument} ${midi}: audible fundamental`);
        assert.ok(second > fundamental * 0.15, 'a string is richer than a sine tone');
        assert.ok(second < fundamental, 'the upper octave does not obscure the tonic');
        assert.ok(third < fundamental, 'higher partials do not overwhelm the bass');
        const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
        assert.ok(Math.abs(mean) < 0.0005, 'the rendered note has negligible DC');
        const ending = rms(
          samples,
          samples.length - Math.round(0.02 * sampleRate),
          samples.length,
        );
        const beforeRelease = rms(
          samples,
          samples.length - Math.round(0.1 * sampleRate),
          samples.length - Math.round(0.05 * sampleRate),
        );
        assert.ok(ending < beforeRelease * 0.5 && ending < 0.001);
        assert.ok(Math.abs(samples.at(-2)) < 0.00001, 'no discontinuity at the tail');
      }
});

function droneContext({ hold = false } = {}) {
  const oscillators = [],
    gains = [];
  const parameter = () => ({
    value: 0,
    events: [],
    setValueAtTime(...values) {
      this.events.push(['set', ...values]);
    },
    linearRampToValueAtTime(...values) {
      this.events.push(['ramp', ...values]);
    },
    cancelScheduledValues(...values) {
      this.events.push(['cancel', ...values]);
    },
    ...(hold && {
      cancelAndHoldAtTime(...values) {
        this.events.push(['hold', ...values]);
      },
    }),
  });
  const context = {
    currentTime: 1,
    sampleRate: 48000,
    destination: {},
    createGain() {
      const gain = {
        gain: parameter(),
        disconnected: false,
        connect() {},
        disconnect() {
          this.disconnected = true;
        },
      };
      gains.push(gain);
      return gain;
    },
    createDynamicsCompressor() {
      return {
        threshold: parameter(),
        knee: parameter(),
        ratio: parameter(),
        attack: parameter(),
        release: parameter(),
        connect() {},
      };
    },
    createOscillator() {
      const source = {
        frequency: parameter(),
        type: '',
        stops: [],
        starts: [],
        disconnected: false,
        connect() {},
        disconnect() {
          this.disconnected = true;
        },
        start(when) {
          this.starts.push(when);
        },
        stop(when) {
          this.stops.push(when);
        },
      };
      oscillators.push(source);
      return source;
    },
  };
  return { context, oscillators, gains };
}

test('the tonic drone survives stopping plucks, reuses its pitch, and releases every node', () => {
  const { context, oscillators, gains } = droneContext({ hold: true });
  const player = new PluckedStringPlayer(context);
  const first = player.startDrone(45);
  assert.equal(oscillators.length, 2);
  assert.equal(oscillators[0].type, 'sine');
  assert.deepEqual(oscillators[0].frequency.events[0], ['set', 110, 1]);
  assert.deepEqual(oscillators[1].frequency.events[0], ['set', 220, 1]);
  assert.equal(player.startDrone(45), first, 'identical tonic creates no extra voices');
  player.stop();
  assert.ok(oscillators.every((source) => source.stops.length === 0));
  assert.equal(player.drone, first);
  context.currentTime = 1.06;
  player.startDrone(47, { instrument: 'bass' });
  assert.equal(oscillators.length, 4);
  assert.equal(player.drone.midi, 47);
  assert.ok(first.gain.gain.events.some((event) => event[0] === 'hold'));
  const release = first.gain.gain.events.at(-1);
  assert.deepEqual(release.slice(0, 2), ['ramp', 0]);
  assert.ok(Math.abs(release[2] - 1.18) < 1e-9);
  oscillators.slice(0, 2).forEach((source) => {
    assert.equal(source.stops.length, 1);
    assert.ok(Math.abs(source.stops[0] - 1.19) < 1e-9);
    source.onended();
    assert.equal(source.disconnected, true);
  });
  assert.equal(first.gain.disconnected, true);
  context.currentTime = 2;
  player.stopDrone();
  player.stopDrone();
  assert.equal(player.drone, null);
  oscillators.slice(2).forEach((source) => {
    assert.equal(source.stops.length, 1);
    source.onended();
  });
  assert.ok(gains.slice(1).every((gain) => gain.disconnected));
});

test('drone release handles partial attacks without cancel-and-hold and rejects invalid pitches', () => {
  const { context, oscillators } = droneContext();
  const player = new PluckedStringPlayer(context);
  const drone = player.startDrone(40, { instrument: 'bass' });
  context.currentTime = 1.06;
  player.stopDrone();
  const held = drone.gain.gain.events.findLast((event) => event[0] === 'set');
  assert.ok(Math.abs(held[1] - 0.075) < 1e-9, 'release holds halfway through attack');
  const release = drone.gain.gain.events.at(-1);
  assert.deepEqual(release.slice(0, 2), ['ramp', 0]);
  assert.ok(Math.abs(release[2] - 1.18) < 1e-9);
  oscillators.forEach((source) => source.onended());
  assert.throws(() => player.startDrone(NaN), RangeError);
  assert.throws(() => player.startDrone(-1), RangeError);
  assert.throws(() => player.startDrone(151), RangeError);
  assert.equal(player.drone, null);
});
test('plucks reuse cached buffers, signal completion, and fade when stopped', () => {
  const sources = [],
    gains = [];
  const param = () => ({
    value: 0,
    events: [],
    setValueAtTime(...v) {
      this.events.push(['set', ...v]);
    },
    linearRampToValueAtTime(...v) {
      this.events.push(['ramp', ...v]);
    },
    cancelScheduledValues(...v) {
      this.events.push(['cancel', ...v]);
    },
    setTargetAtTime(...v) {
      this.events.push(['target', ...v]);
    },
  });
  const ctx = {
    currentTime: 1,
    sampleRate: 44100,
    destination: {},
    createGain() {
      const node = { gain: param(), connect() {}, disconnect() {} };
      gains.push(node);
      return node;
    },
    createDynamicsCompressor() {
      return {
        threshold: param(),
        knee: param(),
        ratio: param(),
        attack: param(),
        release: param(),
        connect() {},
      };
    },
    createBuffer(channels, length, rate) {
      return { duration: length / rate, copyToChannel() {} };
    },
    createBufferSource() {
      const node = {
        connect() {},
        disconnect() {},
        starts: [],
        stops: [],
        start(t) {
          this.starts.push(t);
        },
        stop(t) {
          this.stops.push(t);
        },
      };
      sources.push(node);
      return node;
    },
  };
  const player = new PluckedStringPlayer(ctx),
    buffer = player.buffer(52, 'guitar');
  assert.equal(player.buffer(52, 'guitar'), buffer);
  let ended = 0;
  player.play(52, { onEnded: () => ended++ });
  assert.deepEqual(sources[0].starts, [1]);
  sources[0].onended();
  assert.equal(ended, 1);
  assert.equal(player.voices.size, 0);

  player.play(55);
  ctx.currentTime = 1.2;
  player.stop();
  assert.equal(player.voices.size, 0);
  assert.ok(Math.abs(sources[1].stops.at(-1) - 1.225) < 1e-9);
  assert.ok(
    gains.at(-1).gain.events.some((event) => event[0] === 'target' && event[1] === 0),
  );
  sources[1].onended();
});
