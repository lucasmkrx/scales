// Original Karplus–Strong string model. See docs/references.md for DSP background.
export const STRING_SOUNDS = Object.freeze({
  guitar: {
    seconds: 2.2,
    decay: 3.4,
    pick: 0.19,
    brightness: 0.74,
    lowpass: 6200,
    body: 180,
  },
  bass: {
    seconds: 2.8,
    decay: 4.6,
    pick: 0.28,
    brightness: 0.38,
    lowpass: 3400,
    body: 95,
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
  for (let i = 0; i < n; i++) {
    const excitation = noise[i] - 0.6 * noise[(i + pick) % n];
    previous = sound.brightness * excitation + (1 - sound.brightness) * previous;
    loop[i] = previous;
    mean += previous / n;
  }
  for (let i = 0; i < n; i++) loop[i] -= mean;
  const loss = 10 ** (-3 / (frequency * sound.decay));
  const hp = Math.exp((-2 * Math.PI * (instrument === 'bass' ? 12 : 28)) / sampleRate),
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
