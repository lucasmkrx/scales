// Original extended Karplus–Strong string model. A shaped pluck supplies stable
// low harmonics, while a little filtered pick noise gives the attack texture.
// Background: Julius O. Smith, Physical Audio Signal Processing, String Excitation.
export const STRING_SOUNDS = Object.freeze({
  guitar: {
    seconds: 3,
    decay: 4,
    pick: 0.21,
    brightness: 0.62,
    lowpass: 5800,
    body: 165,
    harmonicSlope: 1.2,
    pickNoise: 0.2,
  },
  bass: {
    seconds: 3.6,
    decay: 4.8,
    pick: 0.28,
    brightness: 0.3,
    lowpass: 2800,
    body: 95,
    harmonicSlope: 1.6,
    pickNoise: 0.12,
  },
});

export function renderPluckedString(
  midi,
  { instrument = 'guitar', sampleRate = 44100 } = {},
) {
  if (!Number.isFinite(midi) || midi < 0 || midi > 151)
    throw new RangeError('Invalid MIDI pitch');
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000)
    throw new RangeError('Invalid sample rate');
  const sound = STRING_SOUNDS[instrument] ?? STRING_SOUNDS.guitar;
  const frequency = 440 * 2 ** ((midi - 69) / 12),
    length = Math.ceil(sampleRate * sound.seconds),
    data = new Float32Array(length);
  // Pitches above Nyquist cannot be rendered; do not alias them into misleading notes.
  if (frequency >= sampleRate * 0.45) return data;
  // The averaging filter contributes half a sample of delay; the all-pass
  // filter supplies the fractional remainder without rounding the string pitch.
  const period = sampleRate / frequency,
    delay = period - 0.5,
    n = Math.max(1, Math.floor(delay)),
    fraction = delay - n;
  const omega = (2 * Math.PI * frequency) / sampleRate;
  const ratio = Math.tan((omega * fraction) / 2) / Math.tan(omega / 2),
    allpass = (1 - ratio) / (1 + ratio);
  const loop = new Float64Array(n),
    noise = new Float64Array(n),
    pick = Math.max(1, Math.round(n * sound.pick));
  let seed =
    (Math.round(midi * 1000) ^ (instrument === 'bass' ? 0x6e624eb7 : 0x1b873593)) >>> 0;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 2147483648 - 1;
  };
  for (let i = 0; i < n; i++) noise[i] = random();
  let mean = 0,
    previous = 0;
  // A pluck-position comb and harmonic rolloff model a displaced string rather
  // than leaving the fundamental to chance in a white-noise delay line.
  const harmonics = Math.min(24, Math.floor(n / 2));
  const amplitudes = Array.from({ length: harmonics }, (_, index) => {
    const harmonic = index + 1;
    return Math.sin(Math.PI * harmonic * sound.pick) / harmonic ** sound.harmonicSlope;
  });
  const harmonicScale = amplitudes.reduce((sum, value) => sum + Math.abs(value), 0);
  for (let i = 0; i < n; i++) {
    const excitation = noise[i] - 0.6 * noise[(i + pick) % n];
    previous = sound.brightness * excitation + (1 - sound.brightness) * previous;
    const phase = (2 * Math.PI * i) / n;
    let pluck = 0;
    for (let harmonic = 1; harmonic <= harmonics; harmonic++)
      pluck += amplitudes[harmonic - 1] * Math.cos(phase * harmonic);
    loop[i] =
      (1 - sound.pickNoise) * (pluck / (harmonicScale || 1)) + sound.pickNoise * previous;
    mean += loop[i] / n;
  }
  for (let i = 0; i < n; i++) loop[i] -= mean;
  const loss = 10 ** (-3 / (frequency * sound.decay));
  const hp = Math.exp((-2 * Math.PI * (instrument === 'bass' ? 8 : 24)) / sampleRate),
    lp = 1 - Math.exp((-2 * Math.PI * sound.lowpass) / sampleRate);
  // A broad body resonance adds warmth without changing the string's pitch.
  const pole = Math.exp((-Math.PI * 160) / sampleRate),
    bodyA = 2 * pole * Math.cos((2 * Math.PI * sound.body) / sampleRate),
    bodyB = pole * pole;
  let cursor = 0,
    apX = 0,
    apY = 0,
    previousString = 0,
    highpass = 0,
    rawPrevious = 0,
    lowpass = 0,
    body1 = 0,
    body2 = 0,
    bodyInput1 = 0,
    bodyInput2 = 0,
    peak = 0;
  for (let i = 0; i < length; i++) {
    const input = loop[cursor];
    const string = fraction < 1e-8 ? input : allpass * input + apX - allpass * apY;
    apX = input;
    apY = string;
    loop[cursor] = loss * 0.5 * (string + previousString);
    previousString = string;
    cursor = (cursor + 1) % n;
    highpass = hp * (highpass + string - rawPrevious);
    rawPrevious = string;
    lowpass += lp * (highpass - lowpass);
    const body = (1 - pole) * (lowpass - bodyInput2) + bodyA * body1 - bodyB * body2;
    body2 = body1;
    body1 = body;
    bodyInput2 = bodyInput1;
    bodyInput1 = lowpass;
    const attack = Math.min(1, i / (sampleRate * 0.0025)),
      release = Math.min(1, (length - 1 - i) / (sampleRate * 0.045));
    const value = (lowpass + 0.28 * body) * attack * release;
    data[i] = value;
    peak = Math.max(peak, Math.abs(value));
  }
  if (peak > 0) for (let i = 0; i < length; i++) data[i] *= 0.68 / peak;
  return data;
}

export class PluckedStringPlayer {
  constructor(context) {
    this.context = context;
    this.cache = new Map();
    this.voices = new Set();
    this.drone = null;
    this.output = context.createGain();
    this.output.gain.value = 0.65;
    this.compressor = context.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.15;
    this.output.connect(this.compressor);
    this.compressor.connect(context.destination);
  }
  buffer(midi, instrument) {
    const key = `${instrument}:${midi}`;
    if (this.cache.has(key)) {
      const buffer = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, buffer);
      return buffer;
    }
    const samples = renderPluckedString(midi, {
        instrument,
        sampleRate: this.context.sampleRate,
      }),
      buffer = this.context.createBuffer(1, samples.length, this.context.sampleRate);
    buffer.copyToChannel(samples, 0);
    this.cache.set(key, buffer);
    if (this.cache.size > 48) this.cache.delete(this.cache.keys().next().value);
    return buffer;
  }
  play(midi, { instrument = 'guitar', when = this.context.currentTime, duration } = {}) {
    const source = this.context.createBufferSource(),
      gain = this.context.createGain();
    source.buffer = this.buffer(midi, instrument);
    const start = Math.max(when, this.context.currentTime),
      seconds = Math.min(duration ?? source.buffer.duration, source.buffer.duration),
      end = start + seconds;
    gain.gain.setValueAtTime(1, start);
    gain.gain.setValueAtTime(1, Math.max(start, end - 0.06));
    gain.gain.linearRampToValueAtTime(0, end);
    source.connect(gain);
    gain.connect(this.output);
    const voice = { source, gain };
    this.voices.add(voice);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      this.voices.delete(voice);
    };
    source.start(start);
    source.stop(end + 0.01);
    return end;
  }
  startDrone(midi, { instrument = 'guitar' } = {}) {
    if (!Number.isFinite(midi) || midi < 0 || midi > 151)
      throw new RangeError('Invalid MIDI pitch');
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    if (frequency >= this.context.sampleRate * 0.45)
      throw new RangeError('Drone pitch is above the audible range');
    if (this.drone?.midi === midi && this.drone.instrument === instrument)
      return this.drone;
    this.stopDrone();
    const now = this.context.currentTime;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(instrument === 'bass' ? 0.15 : 0.12, now + 0.12);
    gain.connect(this.output);
    // The octave adds definition on small speakers without introducing another
    // chord tone. Each oscillator has its own harmonic gain before the shared fade.
    const oscillators = [1, 2]
      .filter((harmonic) => frequency * harmonic < this.context.sampleRate * 0.45)
      .map((harmonic) => {
        const source = this.context.createOscillator();
        const level = this.context.createGain();
        source.type = 'sine';
        source.frequency.setValueAtTime(frequency * harmonic, now);
        level.gain.value = harmonic === 1 ? 1 : 0.16;
        source.connect(level);
        level.connect(gain);
        source.onended = () => {
          source.disconnect();
          level.disconnect();
        };
        source.start(now);
        return source;
      });
    this.drone = { midi, instrument, gain, oscillators, started: now };
    return this.drone;
  }
  stopDrone() {
    const drone = this.drone;
    if (!drone) return;
    this.drone = null;
    const now = this.context.currentTime;
    // cancelAndHold preserves an in-progress attack before the release. The
    // fallback computes that linear attack for older Web Audio implementations.
    if (typeof drone.gain.gain.cancelAndHoldAtTime === 'function')
      drone.gain.gain.cancelAndHoldAtTime(now);
    else {
      const level = drone.instrument === 'bass' ? 0.15 : 0.12;
      drone.gain.gain.cancelScheduledValues(now);
      drone.gain.gain.setValueAtTime(
        level * Math.min(1, Math.max(0, (now - drone.started) / 0.12)),
        now,
      );
    }
    drone.gain.gain.linearRampToValueAtTime(0, now + 0.12);
    let remaining = drone.oscillators.length;
    for (const source of drone.oscillators) {
      const cleanup = source.onended;
      source.onended = () => {
        cleanup();
        if (--remaining === 0) drone.gain.disconnect();
      };
      source.stop(now + 0.13);
    }
  }
  stop() {
    const now = this.context.currentTime;
    for (const { source, gain } of this.voices) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, 0.004);
      try {
        source.stop(now + 0.025);
      } catch {}
    }
    this.voices.clear();
  }
}
