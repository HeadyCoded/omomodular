/**
 * OmoModular Web Audio DSP Engine
 * Real-time synthesis, analog modeling, and dynamic patch routing.
 */

class DspEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.masterLimiter = null;
    this.analyser = null;
    this.modules = new Map();
    this.activeCables = [];
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass({ latencyHint: 'interactive' });

    // Master Safety Limiter to prevent clipping on high feedback loops
    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.setValueAtTime(-1.0, this.ctx.currentTime);
    this.masterLimiter.knee.setValueAtTime(0, this.ctx.currentTime);
    this.masterLimiter.ratio.setValueAtTime(20.0, this.ctx.currentTime);
    this.masterLimiter.attack.setValueAtTime(0.002, this.ctx.currentTime);
    this.masterLimiter.release.setValueAtTime(0.1, this.ctx.currentTime);

    // Master Analyser for real-time oscilloscope
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.8;

    // Master Volume Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

    this.masterLimiter.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.ensureContext();
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.8, now, 0.02);
    }
    return this.isMuted;
  }

  setMasterVolume(val) {
    if (!this.ctx || this.isMuted) return;
    const clamped = Math.max(0, Math.min(1.2, val));
    this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.02);
  }

  syncDownbeat() {
    this.ensureContext();
    const now = this.ctx.currentTime;
    let syncedCount = 0;
    for (const [id, mod] of this.modules.entries()) {
      if (typeof mod.resetClock === 'function') {
        mod.resetClock(now);
        syncedCount++;
      }
    }
    return syncedCount;
  }

  createModule(type, id, params = {}) {
    this.ensureContext();
    let mod = null;
    switch (type) {
      case 'vco':
        mod = new VcoModule(this.ctx, id, params);
        break;
      case 'swarm':
        mod = new SwarmModule(this.ctx, id, params);
        break;
      case 'noise':
        mod = new NoiseModule(this.ctx, id, params);
        break;
      case 'filter':
        mod = new FilterModule(this.ctx, id, params);
        break;
      case 'formant':
        mod = new FormantModule(this.ctx, id, params);
        break;
      case 'wavefolder':
        mod = new WavefolderModule(this.ctx, id, params);
        break;
      case 'bitcrusher':
        mod = new BitcrusherModule(this.ctx, id, params);
        break;
      case 'delay':
        mod = new DelayModule(this.ctx, id, params);
        break;
      case 'reverb':
        mod = new ReverbModule(this.ctx, id, params);
        break;
      case 'chorus':
        mod = new ChorusModule(this.ctx, id, params);
        break;
      case 'phaser':
        mod = new PhaserModule(this.ctx, id, params);
        break;
      case 'ringmod':
        mod = new RingModModule(this.ctx, id, params);
        break;
      case 'resonator':
        mod = new ResonatorModule(this.ctx, id, params);
        break;
      case 'granular':
        mod = new GranularModule(this.ctx, id, params);
        break;
      case 'autopan':
        mod = new AutoPanModule(this.ctx, id, params);
        break;
      case 'wavetable':
        mod = new WavetableModule(this.ctx, id, params);
        break;
      case 'fm_quad':
        mod = new FmQuadModule(this.ctx, id, params);
        break;
      case 'percussion':
        mod = new PercussionModule(this.ctx, id, params);
        break;
      case 'acid303':
        mod = new Acid303Module(this.ctx, id, params);
        break;
      case 'eq7':
        mod = new Eq7Module(this.ctx, id, params);
        break;
      case 'comb':
        mod = new CombModule(this.ctx, id, params);
        break;
      case 'compressor':
        mod = new CompressorModule(this.ctx, id, params);
        break;
      case 'fuzz':
        mod = new FuzzModule(this.ctx, id, params);
        break;
      case 'shimmer':
        mod = new ShimmerModule(this.ctx, id, params);
        break;
      case 'sequencer':
        mod = new SequencerModule(this.ctx, id, params);
        break;
      case 'mult':
        mod = new MultModule(this.ctx, id, params);
        break;
      case 'euclid':
        mod = new EuclidModule(this.ctx, id, params);
        break;
      case 'turing':
        mod = new TuringModule(this.ctx, id, params);
        break;
      case 'sample_hold':
        mod = new SampleHoldModule(this.ctx, id, params);
        break;
      case 'adsr':
        mod = new AdsrModule(this.ctx, id, params);
        break;
      case 'maths':
        mod = new MathsModule(this.ctx, id, params);
        break;
      case 'harmonic':
        mod = new HarmonicModule(this.ctx, id, params);
        break;
      case 'bytebeat':
        mod = new BytebeatModule(this.ctx, id, params);
        break;
      case 'spring':
        mod = new SpringReverbModule(this.ctx, id, params);
        break;
      case 'pingpong':
        mod = new PingPongDelayModule(this.ctx, id, params);
        break;
      case 'svf':
        mod = new SvfModule(this.ctx, id, params);
        break;
      case 'rotary':
        mod = new RotaryModule(this.ctx, id, params);
        break;
      case 'tape_warmer':
        mod = new TapeWarmerModule(this.ctx, id, params);
        break;
      case 'sub_harmonic':
        mod = new SubHarmonicModule(this.ctx, id, params);
        break;
      case 'crossfader':
        mod = new CrossfaderModule(this.ctx, id, params);
        break;
      case 'quad_lfo':
        mod = new QuadLfoModule(this.ctx, id, params);
        break;
      case 'midi_player':
        mod = new MidiPlayerModule(this.ctx, id, params);
        break;
      case 'mixer':
        mod = new MixerModule(this.ctx, id, params, this.masterLimiter);
        break;
      default:
        console.warn('Unknown module type:', type);
        return null;
    }
    this.modules.set(id, mod);
    return mod;
  }

  removeModule(id) {
    const mod = this.modules.get(id);
    if (!mod) return;
    // Disconnect any cables connected to this module
    this.activeCables = this.activeCables.filter(c => {
      if (c.from.moduleId === id || c.to.moduleId === id) {
        this.disconnectJack(c.from.moduleId, c.from.jack, c.to.moduleId, c.to.jack);
        return false;
      }
      return true;
    });
    mod.dispose();
    this.modules.delete(id);
  }

  connectJacks(fromModId, fromJack, toModId, toJack) {
    const fromMod = this.modules.get(fromModId);
    const toMod = this.modules.get(toModId);
    if (!fromMod || !toMod) return false;

    const sourceNode = fromMod.getJackOutputNode(fromJack);
    const destNode = toMod.getJackInputNode(toJack);
    if (!sourceNode || !destNode) return false;

    try {
      sourceNode.connect(destNode);
      return true;
    } catch (e) {
      console.error('Failed to connect audio nodes:', e);
      return false;
    }
  }

  disconnectJack(fromModId, fromJack, toModId, toJack) {
    const fromMod = this.modules.get(fromModId);
    const toMod = this.modules.get(toModId);
    if (!fromMod || !toMod) return;

    const sourceNode = fromMod.getJackOutputNode(fromJack);
    const destNode = toMod.getJackInputNode(toJack);
    if (!sourceNode || !destNode) return;

    try {
      sourceNode.disconnect(destNode);
    } catch (e) {
      // AudioNode disconnect can throw if not connected
    }
  }

  clearAll() {
    for (const [id, mod] of this.modules) {
      if (mod.type !== 'mixer') {
        mod.dispose();
        this.modules.delete(id);
      }
    }
    this.activeCables = [];
  }
}

// ---------------------------------------------------------------------------
// 1. Dual Drone VCO Module
// ---------------------------------------------------------------------------
class VcoModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'vco';

    this.outGain = ctx.createGain();
    this.outGain.gain.setValueAtTime(0.7, ctx.currentTime);

    // Osc 1 (Primary drone)
    this.osc1 = ctx.createOscillator();
    this.osc1.type = params.wave1 || 'sawtooth';
    this.osc1.frequency.setValueAtTime(params.freq1 || 55.0, ctx.currentTime);

    // Osc 2 (Detuned voice)
    this.osc2 = ctx.createOscillator();
    this.osc2.type = params.wave2 || 'sine';
    this.osc2.frequency.setValueAtTime(params.freq1 || 55.0, ctx.currentTime);
    this.osc2.detune.setValueAtTime(params.detune2 || 7.0, ctx.currentTime);

    // Sub-Oscillator (Square wave 1 octave down)
    this.subOsc = ctx.createOscillator();
    this.subOsc.type = 'square';
    this.subOsc.frequency.setValueAtTime((params.freq1 || 55.0) / 2, ctx.currentTime);

    this.subGain = ctx.createGain();
    this.subGain.gain.setValueAtTime(params.subLevel !== undefined ? params.subLevel : 0.5, ctx.currentTime);
    this.subOsc.connect(this.subGain);

    // Cross-FM Gain (Osc 1 modulates Osc 2 frequency)
    this.fmGain = ctx.createGain();
    this.fmGain.gain.setValueAtTime((params.fmDepth || 0.1) * 200, ctx.currentTime);
    this.osc1.connect(this.fmGain);
    this.fmGain.connect(this.osc2.frequency);

    // Subtle Analog Drift (Ultra-slow LFO)
    this.driftLfo = ctx.createOscillator();
    this.driftLfo.frequency.setValueAtTime(0.12, ctx.currentTime);
    this.driftGain = ctx.createGain();
    this.driftGain.gain.setValueAtTime((params.drift || 0.3) * 6.0, ctx.currentTime);
    this.driftLfo.connect(this.driftGain);
    this.driftGain.connect(this.osc1.detune);

    // Mix to output
    this.osc1.connect(this.outGain);
    this.osc2.connect(this.outGain);
    this.subGain.connect(this.outGain);

    this.osc1.start();
    this.osc2.start();
    this.subOsc.start();
    this.driftLfo.start();
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'freq1') {
      const f = Math.max(10, Math.min(2000, val));
      this.osc1.frequency.setTargetAtTime(f, now, 0.02);
      this.osc2.frequency.setTargetAtTime(f, now, 0.02);
      this.subOsc.frequency.setTargetAtTime(f / 2, now, 0.02);
    } else if (name === 'detune2') {
      this.osc2.detune.setTargetAtTime(val, now, 0.02);
    } else if (name === 'wave1') {
      this.osc1.type = val;
    } else if (name === 'wave2') {
      this.osc2.type = val;
    } else if (name === 'subLevel') {
      this.subGain.gain.setTargetAtTime(Math.max(0, Math.min(1, val)), now, 0.02);
    } else if (name === 'fmDepth') {
      this.fmGain.gain.setTargetAtTime(Math.max(0, val) * 200, now, 0.02);
    } else if (name === 'drift') {
      this.driftGain.gain.setTargetAtTime(Math.max(0, val) * 6.0, now, 0.02);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return null;
  }

  dispose() {
    try {
      this.osc1.stop();
      this.osc2.stop();
      this.subOsc.stop();
      this.driftLfo.stop();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 2. Noise & Texture Generator Module
// ---------------------------------------------------------------------------
class NoiseModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'noise';

    this.outGain = ctx.createGain();
    this.outGain.gain.setValueAtTime(params.level !== undefined ? params.level : 0.4, ctx.currentTime);

    // Pre-generate 4 seconds of seamless noise buffers
    const bufferSize = ctx.sampleRate * 4;
    this.whiteBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    this.pinkBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    this.brownBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);

    const wData = this.whiteBuffer.getChannelData(0);
    const pData = this.pinkBuffer.getChannelData(0);
    const bData = this.brownBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let lastBrown = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      wData[i] = white * 0.5;

      // Paul Kellet's Pink Noise algorithm
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;

      // Brown Noise (Integrated random walk)
      lastBrown = (lastBrown + (0.02 * white)) / 1.02;
      bData[i] = lastBrown * 3.5;
    }

    this.source = ctx.createBufferSource();
    this.source.loop = true;
    this.currentColor = params.color || 'brown';
    this.source.buffer = this.getBufferForColor(this.currentColor);

    this.source.connect(this.outGain);
    this.source.start();
  }

  getBufferForColor(color) {
    if (color === 'white') return this.whiteBuffer;
    if (color === 'pink') return this.pinkBuffer;
    return this.brownBuffer;
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'level') {
      this.outGain.gain.setTargetAtTime(Math.max(0, Math.min(1.0, val)), now, 0.02);
    } else if (name === 'color') {
      if (val !== this.currentColor) {
        this.currentColor = val;
        this.source.buffer = this.getBufferForColor(val);
      }
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return null;
  }

  dispose() {
    try {
      this.source.stop();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 3. Resonant Ladder Filter Module
// ---------------------------------------------------------------------------
class FilterModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'filter';

    this.inputNode = ctx.createGain();
    this.inputNode.gain.setValueAtTime(1.0, ctx.currentTime);

    // Warmth / Saturation stage
    this.driveNode = ctx.createWaveShaper();
    this.setDriveCurve(params.drive || 1.2);

    // 2-pole cascaded filter for steep 24dB/oct response
    this.filter1 = ctx.createBiquadFilter();
    this.filter1.type = params.mode || 'lowpass';
    this.filter1.frequency.setValueAtTime(params.cutoff || 440.0, ctx.currentTime);
    this.filter1.Q.setValueAtTime(params.resonance || 4.0, ctx.currentTime);

    this.filter2 = ctx.createBiquadFilter();
    this.filter2.type = params.mode || 'lowpass';
    this.filter2.frequency.setValueAtTime(params.cutoff || 440.0, ctx.currentTime);
    this.filter2.Q.setValueAtTime(Math.max(0.1, (params.resonance || 4.0) * 0.7), ctx.currentTime);

    this.outGain = ctx.createGain();
    this.outGain.gain.setValueAtTime(0.9, ctx.currentTime);

    this.inputNode.connect(this.driveNode);
    this.driveNode.connect(this.filter1);
    this.filter1.connect(this.filter2);
    this.filter2.connect(this.outGain);
  }

  setDriveCurve(amount) {
    const k = Math.max(1, amount);
    const n_samples = 512;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x * 20 * deg));
    }
    this.driveNode.curve = curve;
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'cutoff') {
      const f = Math.max(20, Math.min(18000, val));
      this.filter1.frequency.setTargetAtTime(f, now, 0.02);
      this.filter2.frequency.setTargetAtTime(f, now, 0.02);
    } else if (name === 'resonance') {
      const q = Math.max(0.1, Math.min(25, val));
      this.filter1.Q.setTargetAtTime(q, now, 0.02);
      this.filter2.Q.setTargetAtTime(q * 0.7, now, 0.02);
    } else if (name === 'mode') {
      this.filter1.type = val;
      this.filter2.type = val;
    } else if (name === 'drive') {
      this.setDriveCurve(val);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    try {
      this.inputNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 4. Wavefolder & Overdrive Module
// ---------------------------------------------------------------------------
class WavefolderModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'wavefolder';

    this.inputNode = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.outGain = ctx.createGain();

    this.shaper = ctx.createWaveShaper();
    this.folds = params.folds || 2.5;
    this.drive = params.drive || 2.0;
    this.updateCurve();

    const mix = params.mix !== undefined ? params.mix : 0.8;
    this.wetGain.gain.setValueAtTime(mix, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1.0 - mix, ctx.currentTime);

    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.shaper);
    this.shaper.connect(this.wetGain);

    this.dryGain.connect(this.outGain);
    this.wetGain.connect(this.outGain);
  }

  updateCurve() {
    const n = 1024;
    const curve = new Float32Array(n);
    const folds = this.folds;
    const drive = this.drive;

    for (let i = 0; i < n; i++) {
      const x = ((i / (n - 1)) * 2 - 1) * drive;
      // Mathematical wavefolding trigonometric function
      curve[i] = Math.sin(x * Math.PI * folds) * 0.85;
    }
    this.shaper.curve = curve;
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'folds') {
      this.folds = Math.max(0.5, Math.min(8.0, val));
      this.updateCurve();
    } else if (name === 'drive') {
      this.drive = Math.max(0.5, Math.min(6.0, val));
      this.updateCurve();
    } else if (name === 'mix') {
      const m = Math.max(0, Math.min(1, val));
      this.wetGain.gain.setTargetAtTime(m, now, 0.02);
      this.dryGain.gain.setTargetAtTime(1 - m, now, 0.02);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    try {
      this.inputNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 5. Bitcrusher Module
// ---------------------------------------------------------------------------
class BitcrusherModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'bitcrusher';

    this.inputNode = ctx.createGain();
    this.outGain = ctx.createGain();

    this.bits = params.bits || 6;
    this.rateReduction = params.rateReduction || 8;

    // Use ScriptProcessor / AudioWorklet fallback for true downsampling & quantization
    const bufferSize = 1024;
    this.processor = ctx.createScriptProcessor(bufferSize, 1, 1);
    let sampleHold = 0;
    let counter = 0;

    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);
      const step = Math.pow(0.5, this.bits);
      const red = Math.max(1, Math.round(this.rateReduction));

      for (let i = 0; i < input.length; i++) {
        if (counter % red === 0) {
          // Bit depth quantization
          sampleHold = step * Math.floor(input[i] / step + 0.5);
        }
        counter++;
        output[i] = sampleHold;
      }
    };

    this.inputNode.connect(this.processor);
    this.processor.connect(this.outGain);
  }

  setParam(name, val) {
    if (name === 'bits') {
      this.bits = Math.max(2, Math.min(16, Math.round(val)));
    } else if (name === 'rateReduction') {
      this.rateReduction = Math.max(1, Math.min(32, Math.round(val)));
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    try {
      this.inputNode.disconnect();
      this.processor.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 6. Stereo Tape Delay Module
// ---------------------------------------------------------------------------
class DelayModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'delay';

    this.inputNode = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.outGain = ctx.createGain();

    this.delayNode = ctx.createDelay(3.0);
    this.delayNode.delayTime.setValueAtTime((params.time || 450.0) / 1000.0, ctx.currentTime);

    // Feedback Loop with High-Frequency Tape Damping
    this.feedbackNode = ctx.createGain();
    this.feedbackNode.gain.setValueAtTime(params.feedback || 0.5, ctx.currentTime);

    this.dampingFilter = ctx.createBiquadFilter();
    this.dampingFilter.type = 'lowpass';
    this.dampingFilter.frequency.setValueAtTime(params.damping || 2400.0, ctx.currentTime);

    // Wow & Flutter (subtle tape motor modulation)
    this.flutterLfo = ctx.createOscillator();
    this.flutterLfo.frequency.setValueAtTime(2.2, ctx.currentTime);
    this.flutterGain = ctx.createGain();
    this.flutterGain.gain.setValueAtTime((params.flutter || 0.2) * 0.003, ctx.currentTime);
    this.flutterLfo.connect(this.flutterGain);
    this.flutterGain.connect(this.delayNode.delayTime);
    this.flutterLfo.start();

    // Wiring the Feedback loop
    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.delayNode);

    this.delayNode.connect(this.dampingFilter);
    this.dampingFilter.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayNode); // feedback loop!

    this.delayNode.connect(this.wetGain);

    const mix = params.mix !== undefined ? params.mix : 0.45;
    this.wetGain.gain.setValueAtTime(mix, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1.0 - mix, ctx.currentTime);

    this.dryGain.connect(this.outGain);
    this.wetGain.connect(this.outGain);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'time') {
      const sec = Math.max(0.01, Math.min(2.5, val / 1000.0));
      this.delayNode.delayTime.setTargetAtTime(sec, now, 0.04);
    } else if (name === 'feedback') {
      const fb = Math.max(0, Math.min(0.95, val));
      this.feedbackNode.gain.setTargetAtTime(fb, now, 0.02);
    } else if (name === 'damping') {
      const d = Math.max(200, Math.min(16000, val));
      this.dampingFilter.frequency.setTargetAtTime(d, now, 0.02);
    } else if (name === 'flutter') {
      this.flutterGain.gain.setTargetAtTime(Math.max(0, val) * 0.003, now, 0.02);
    } else if (name === 'mix') {
      const m = Math.max(0, Math.min(1, val));
      this.wetGain.gain.setTargetAtTime(m, now, 0.02);
      this.dryGain.gain.setTargetAtTime(1 - m, now, 0.02);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    try {
      this.flutterLfo.stop();
      this.inputNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 7. Lush Space Reverb Module
// ---------------------------------------------------------------------------
class ReverbModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'reverb';

    this.inputNode = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.outGain = ctx.createGain();

    this.convolver = ctx.createConvolver();
    this.decay = params.decay || 5.0;
    this.generateImpulseResponse(this.decay);

    const mix = params.mix !== undefined ? params.mix : 0.6;
    this.wetGain.gain.setValueAtTime(mix, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1.0 - mix, ctx.currentTime);

    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.convolver);
    this.convolver.connect(this.wetGain);

    this.dryGain.connect(this.outGain);
    this.wetGain.connect(this.outGain);
  }

  generateImpulseResponse(duration) {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * Math.max(0.5, Math.min(12.0, duration)));
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    const decayConstant = 3.0 / duration;
    for (let i = 0; i < length; i++) {
      const envelope = Math.exp(-i / (rate / decayConstant));
      // Diffuse reflections with subtle stereo decorrelation
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }
    this.convolver.buffer = impulse;
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'decay') {
      this.decay = Math.max(0.5, Math.min(12.0, val));
      this.generateImpulseResponse(this.decay);
    } else if (name === 'mix') {
      const m = Math.max(0, Math.min(1, val));
      this.wetGain.gain.setTargetAtTime(m, now, 0.02);
      this.dryGain.gain.setTargetAtTime(1 - m, now, 0.02);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    try {
      this.inputNode.disconnect();
      this.convolver.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 8. 4-Channel Mixer & Master Out Module
// ---------------------------------------------------------------------------
class MixerModule {
  constructor(ctx, id, params = {}, masterBus) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'mixer';
    this.masterBus = masterBus;

    this.channels = [];
    for (let i = 1; i <= 4; i++) {
      const input = ctx.createGain();
      const panner = ctx.createStereoPanner();
      const gain = ctx.createGain();

      const gVal = params[`ch${i}_gain`] !== undefined ? params[`ch${i}_gain`] : (i === 1 ? 0.8 : 0.0);
      const pVal = params[`ch${i}_pan`] !== undefined ? params[`ch${i}_pan`] : 0.0;

      gain.gain.setValueAtTime(gVal, ctx.currentTime);
      panner.pan.setValueAtTime(pVal, ctx.currentTime);

      input.connect(panner);
      panner.connect(gain);
      gain.connect(this.masterBus);

      this.channels.push({ input, panner, gain });
    }
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    for (let i = 1; i <= 4; i++) {
      if (name === `ch${i}_gain`) {
        this.channels[i - 1].gain.gain.setTargetAtTime(Math.max(0, Math.min(1.2, val)), now, 0.02);
      } else if (name === `ch${i}_pan`) {
        this.channels[i - 1].panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, val)), now, 0.02);
      }
    }
  }

  getJackOutputNode(jack) {
    return null;
  }

  getJackInputNode(jack) {
    if (jack === 'in1') return this.channels[0].input;
    if (jack === 'in2') return this.channels[1].input;
    if (jack === 'in3') return this.channels[2].input;
    if (jack === 'in4') return this.channels[3].input;
    return this.channels[0].input;
  }

  dispose() {
    for (const ch of this.channels) {
      try {
        ch.input.disconnect();
        ch.gain.disconnect();
      } catch (e) {}
    }
  }
}

// ---------------------------------------------------------------------------
// 9. Chord Swarm VCO Module
// ---------------------------------------------------------------------------
class SwarmModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'swarm';

    this.outGain = ctx.createGain();
    this.outGain.gain.setValueAtTime(0.65, ctx.currentTime);

    this.baseFreq = params.freq || 65.41; // C2
    this.chordMode = params.chord || 'minor7';
    this.spread = params.spread !== undefined ? params.spread : 12.0;
    this.wave = params.wave || 'sawtooth';

    // 4 Voices
    this.voices = [];
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      osc.type = this.wave;
      osc.connect(gain);
      gain.connect(this.outGain);
      osc.start();
      this.voices.push({ osc, gain });
    }

    // Sub oscillator
    this.subOsc = ctx.createOscillator();
    this.subOsc.type = 'sine';
    this.subGain = ctx.createGain();
    this.subGain.gain.setValueAtTime(params.subLevel !== undefined ? params.subLevel : 0.4, ctx.currentTime);
    this.subOsc.connect(this.subGain);
    this.subGain.connect(this.outGain);
    this.subOsc.start();

    // Subtle drift
    this.driftLfo = ctx.createOscillator();
    this.driftLfo.frequency.setValueAtTime(0.08, ctx.currentTime);
    this.driftGain = ctx.createGain();
    this.driftGain.gain.setValueAtTime(4.0, ctx.currentTime);
    this.driftLfo.connect(this.driftGain);
    this.driftLfo.start();
    for (const v of this.voices) {
      this.driftGain.connect(v.osc.detune);
    }

    this.updatePitches();
  }

  getChordSemitones(mode) {
    switch (mode) {
      case 'unison': return [0, 0.05, -0.05, 0.1];
      case 'minor7': return [0, 3, 7, 10];
      case 'major7': return [0, 4, 7, 11];
      case 'fifth': return [0, 7, 12, 19];
      case 'sus4': return [0, 5, 7, 12];
      default: return [0, 3, 7, 10];
    }
  }

  updatePitches() {
    const semitones = this.getChordSemitones(this.chordMode);
    const now = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const semi = semitones[i];
      const targetFreq = this.baseFreq * Math.pow(2, semi / 12);
      const detuneCents = (i - 1.5) * this.spread;
      this.voices[i].osc.frequency.setTargetAtTime(targetFreq, now, 0.02);
      this.voices[i].osc.detune.setTargetAtTime(detuneCents, now, 0.02);
    }
    this.subOsc.frequency.setTargetAtTime(this.baseFreq / 2, now, 0.02);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'freq') {
      this.baseFreq = Math.max(20, Math.min(1000, val));
      this.updatePitches();
    } else if (name === 'spread') {
      this.spread = Math.max(0, Math.min(50, val));
      this.updatePitches();
    } else if (name === 'chord') {
      this.chordMode = val;
      this.updatePitches();
    } else if (name === 'wave') {
      this.wave = val;
      for (const v of this.voices) {
        v.osc.type = val;
      }
    } else if (name === 'subLevel') {
      this.subGain.gain.setTargetAtTime(Math.max(0, Math.min(1, val)), now, 0.02);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return null;
  }

  dispose() {
    try {
      for (const v of this.voices) v.osc.stop();
      this.subOsc.stop();
      this.driftLfo.stop();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 10. Granular Clouds Module
// ---------------------------------------------------------------------------
class GranularModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'granular';

    this.inputNode = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.outGain = ctx.createGain();

    this.grainSize = params.grainSize || 0.12; // 120ms
    this.density = params.density || 8; // grains/sec
    this.pitchSpray = params.pitchSpray || 0.3;
    const mix = params.mix !== undefined ? params.mix : 0.7;

    this.wetGain.gain.setValueAtTime(mix, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1 - mix, ctx.currentTime);

    // Circular recording buffer (2 seconds)
    this.bufferSeconds = 2.0;
    this.buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * this.bufferSeconds), ctx.sampleRate);
    this.channelData = this.buffer.getChannelData(0);
    this.writeIndex = 0;

    // Recording processor
    const procSize = 1024;
    this.recordNode = ctx.createScriptProcessor(procSize, 1, 1);
    this.recordNode.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const len = this.channelData.length;
      for (let i = 0; i < input.length; i++) {
        this.channelData[this.writeIndex] = input[i];
        this.writeIndex = (this.writeIndex + 1) % len;
      }
    };

    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.recordNode);
    this.recordNode.connect(this.ctx.destination); // Keep script processor active

    this.dryGain.connect(this.outGain);
    this.wetGain.connect(this.outGain);

    // Grain trigger loop
    this.isRunning = true;
    this.scheduleGrains();
  }

  scheduleGrains() {
    if (!this.isRunning) return;
    const interval = Math.max(30, Math.floor(1000 / Math.max(1, this.density)));
    this.spawnGrain();
    this.timer = setTimeout(() => this.scheduleGrains(), interval);
  }

  spawnGrain() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    try {
      const grainDur = Math.max(0.02, Math.min(0.4, this.grainSize));
      const grainNode = this.ctx.createBufferSource();
      grainNode.buffer = this.buffer;

      // Random pitch playback rate
      const sprayFactor = (Math.random() * 2 - 1) * this.pitchSpray;
      grainNode.playbackRate.setValueAtTime(1.0 + sprayFactor, this.ctx.currentTime);

      // Grain envelope
      const env = this.ctx.createGain();
      const now = this.ctx.currentTime;
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.4, now + grainDur * 0.3);
      env.gain.linearRampToValueAtTime(0, now + grainDur);

      grainNode.connect(env);
      env.connect(this.wetGain);

      // Random read offset behind write position
      const offset = Math.random() * (this.bufferSeconds - grainDur);
      grainNode.start(now, offset, grainDur);
    } catch (e) {}
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'grainSize') {
      this.grainSize = Math.max(0.02, Math.min(0.4, val));
    } else if (name === 'density') {
      this.density = Math.max(1, Math.min(30, val));
    } else if (name === 'pitchSpray') {
      this.pitchSpray = Math.max(0, Math.min(1.0, val));
    } else if (name === 'mix') {
      const m = Math.max(0, Math.min(1, val));
      this.wetGain.gain.setTargetAtTime(m, now, 0.02);
      this.dryGain.gain.setTargetAtTime(1 - m, now, 0.02);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    this.isRunning = false;
    clearTimeout(this.timer);
    try {
      this.inputNode.disconnect();
      this.recordNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 11. Karplus Resonator Module
// ---------------------------------------------------------------------------
class ResonatorModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'resonator';

    this.inputNode = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.outGain = ctx.createGain();

    this.freq = params.freq || 130.81; // C3
    this.decay = params.decay || 0.94;
    this.damping = params.damping || 3500.0;

    // Tuned Feedback Delay
    this.delayNode = ctx.createDelay(0.1);
    this.delayNode.delayTime.setValueAtTime(1.0 / Math.max(20, this.freq), ctx.currentTime);

    this.feedbackNode = ctx.createGain();
    this.feedbackNode.gain.setValueAtTime(this.decay, ctx.currentTime);

    this.dampFilter = ctx.createBiquadFilter();
    this.dampFilter.type = 'lowpass';
    this.dampFilter.frequency.setValueAtTime(this.damping, ctx.currentTime);

    // Wiring feedback loop
    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.delayNode);

    this.delayNode.connect(this.dampFilter);
    this.dampFilter.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayNode); // loop!

    this.delayNode.connect(this.wetGain);

    const mix = params.mix !== undefined ? params.mix : 0.8;
    this.wetGain.gain.setValueAtTime(mix, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1 - mix, ctx.currentTime);

    this.dryGain.connect(this.outGain);
    this.wetGain.connect(this.outGain);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'freq') {
      this.freq = Math.max(25, Math.min(1200, val));
      this.delayNode.delayTime.setTargetAtTime(1.0 / this.freq, now, 0.02);
    } else if (name === 'decay') {
      const fb = Math.max(0.5, Math.min(0.995, val));
      this.feedbackNode.gain.setTargetAtTime(fb, now, 0.02);
    } else if (name === 'damping') {
      const d = Math.max(200, Math.min(14000, val));
      this.dampFilter.frequency.setTargetAtTime(d, now, 0.02);
    } else if (name === 'mix') {
      const m = Math.max(0, Math.min(1, val));
      this.wetGain.gain.setTargetAtTime(m, now, 0.02);
      this.dryGain.gain.setTargetAtTime(1 - m, now, 0.02);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    try {
      this.inputNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 12. Formant Dual Filter Module
// ---------------------------------------------------------------------------
class FormantModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'formant';

    this.inputNode = ctx.createGain();
    this.outGain = ctx.createGain();
    this.outGain.gain.setValueAtTime(1.1, ctx.currentTime);

    // Two parallel bandpass filters modeling vocal tract peaks
    this.filter1 = ctx.createBiquadFilter();
    this.filter1.type = 'bandpass';

    this.filter2 = ctx.createBiquadFilter();
    this.filter2.type = 'bandpass';

    this.q = params.resonance || 8.0;
    this.vowelVal = params.vowel !== undefined ? params.vowel : 1.0;

    this.filter1.Q.setValueAtTime(this.q, ctx.currentTime);
    this.filter2.Q.setValueAtTime(this.q, ctx.currentTime);

    this.inputNode.connect(this.filter1);
    this.inputNode.connect(this.filter2);

    this.filter1.connect(this.outGain);
    this.filter2.connect(this.outGain);

    this.updateVowel();
  }

  updateVowel() {
    // English vowels: 1: A [800, 1200], 2: E [400, 2200], 3: I [250, 2400], 4: O [500, 900], 5: U [300, 700]
    const formants = [
      [800, 1200],
      [400, 2200],
      [250, 2400],
      [500, 900],
      [300, 700],
    ];
    const clamped = Math.max(1, Math.min(5, this.vowelVal));
    const idx = Math.floor(clamped) - 1;
    const nextIdx = Math.min(4, idx + 1);
    const frac = clamped - (idx + 1);

    const f1 = formants[idx][0] + (formants[nextIdx][0] - formants[idx][0]) * frac;
    const f2 = formants[idx][1] + (formants[nextIdx][1] - formants[idx][1]) * frac;

    const now = this.ctx.currentTime;
    this.filter1.frequency.setTargetAtTime(f1, now, 0.03);
    this.filter2.frequency.setTargetAtTime(f2, now, 0.03);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'vowel') {
      this.vowelVal = val;
      this.updateVowel();
    } else if (name === 'resonance') {
      this.q = Math.max(1.0, Math.min(25.0, val));
      this.filter1.Q.setTargetAtTime(this.q, now, 0.02);
      this.filter2.Q.setTargetAtTime(this.q, now, 0.02);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    try {
      this.inputNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 13. Stereo Dimension Chorus Module
// ---------------------------------------------------------------------------
class ChorusModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'chorus';

    this.inputNode = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.outGain = ctx.createGain();

    this.splitter = ctx.createChannelSplitter(2);
    this.merger = ctx.createChannelMerger(2);

    // Left delay & Right delay
    this.delayL = ctx.createDelay(0.06);
    this.delayR = ctx.createDelay(0.06);
    this.delayL.delayTime.setValueAtTime(0.025, ctx.currentTime);
    this.delayR.delayTime.setValueAtTime(0.030, ctx.currentTime);

    // Quadrature LFOs (90 deg phase difference for wide stereo field)
    this.rate = params.rate || 0.8;
    this.depth = params.depth || 0.5;

    this.lfoL = ctx.createOscillator();
    this.lfoR = ctx.createOscillator();
    this.lfoL.frequency.setValueAtTime(this.rate, ctx.currentTime);
    this.lfoR.frequency.setValueAtTime(this.rate, ctx.currentTime);

    this.gainL = ctx.createGain();
    this.gainR = ctx.createGain();
    this.gainL.gain.setValueAtTime(this.depth * 0.006, ctx.currentTime);
    this.gainR.gain.setValueAtTime(this.depth * 0.006, ctx.currentTime);

    this.lfoL.connect(this.gainL);
    this.lfoR.connect(this.gainR);
    this.gainL.connect(this.delayL.delayTime);
    this.gainR.connect(this.delayR.delayTime);

    this.lfoL.start();
    this.lfoR.start();

    // Wiring
    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.delayL);
    this.inputNode.connect(this.delayR);

    this.delayL.connect(this.merger, 0, 0);
    this.delayR.connect(this.merger, 0, 1);

    this.merger.connect(this.wetGain);

    const mix = params.mix !== undefined ? params.mix : 0.6;
    this.wetGain.gain.setValueAtTime(mix, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1 - mix, ctx.currentTime);

    this.dryGain.connect(this.outGain);
    this.wetGain.connect(this.outGain);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'rate') {
      const r = Math.max(0.05, Math.min(8.0, val));
      this.lfoL.frequency.setTargetAtTime(r, now, 0.02);
      this.lfoR.frequency.setTargetAtTime(r, now, 0.02);
    } else if (name === 'depth') {
      const d = Math.max(0, Math.min(1.0, val));
      this.gainL.gain.setTargetAtTime(d * 0.006, now, 0.02);
      this.gainR.gain.setTargetAtTime(d * 0.006, now, 0.02);
    } else if (name === 'mix') {
      const m = Math.max(0, Math.min(1, val));
      this.wetGain.gain.setTargetAtTime(m, now, 0.02);
      this.dryGain.gain.setTargetAtTime(1 - m, now, 0.02);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    try {
      this.lfoL.stop();
      this.lfoR.stop();
      this.inputNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 14. 12-Stage Optical Phaser Module
// ---------------------------------------------------------------------------
class PhaserModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'phaser';

    this.inputNode = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.outGain = ctx.createGain();

    // 6 Cascaded allpass filter stages
    this.stages = [];
    let prev = this.inputNode;
    for (let i = 0; i < 6; i++) {
      const ap = ctx.createBiquadFilter();
      ap.type = 'allpass';
      ap.frequency.setValueAtTime(800, ctx.currentTime);
      prev.connect(ap);
      prev = ap;
      this.stages.push(ap);
    }

    // Feedback
    this.feedback = ctx.createGain();
    this.feedback.gain.setValueAtTime(params.feedback || 0.6, ctx.currentTime);
    prev.connect(this.feedback);
    this.feedback.connect(this.stages[0]);

    prev.connect(this.wetGain);

    // LFO Sweeper
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.setValueAtTime(params.rate || 0.4, ctx.currentTime);
    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.setValueAtTime((params.depth || 0.7) * 700, ctx.currentTime);

    this.lfo.connect(this.lfoGain);
    for (const st of this.stages) {
      this.lfoGain.connect(st.frequency);
    }
    this.lfo.start();

    const mix = params.mix !== undefined ? params.mix : 0.65;
    this.wetGain.gain.setValueAtTime(mix, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1 - mix, ctx.currentTime);

    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outGain);
    this.wetGain.connect(this.outGain);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'rate') {
      this.lfo.frequency.setTargetAtTime(Math.max(0.05, Math.min(6.0, val)), now, 0.02);
    } else if (name === 'depth') {
      this.lfoGain.gain.setTargetAtTime(Math.max(0, Math.min(1.0, val)) * 700, now, 0.02);
    } else if (name === 'feedback') {
      this.feedback.gain.setTargetAtTime(Math.max(0, Math.min(0.9, val)), now, 0.02);
    } else if (name === 'mix') {
      const m = Math.max(0, Math.min(1, val));
      this.wetGain.gain.setTargetAtTime(m, now, 0.02);
      this.dryGain.gain.setTargetAtTime(1 - m, now, 0.02);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    try {
      this.lfo.stop();
      this.inputNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 15. Ring Modulator & Frequency Shifter Module
// ---------------------------------------------------------------------------
class RingModModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'ringmod';

    this.inputNode = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.outGain = ctx.createGain();

    // Carrier Oscillator
    this.carrier = ctx.createOscillator();
    this.carrier.type = params.shape || 'sine';
    this.carrier.frequency.setValueAtTime(params.freq || 180.0, ctx.currentTime);

    // Modulation stage
    this.modGain = ctx.createGain();
    this.modGain.gain.setValueAtTime(0, ctx.currentTime);

    this.carrier.connect(this.modGain.gain);
    this.inputNode.connect(this.modGain);
    this.modGain.connect(this.wetGain);

    this.carrier.start();

    const mix = params.mix !== undefined ? params.mix : 0.75;
    this.wetGain.gain.setValueAtTime(mix, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1 - mix, ctx.currentTime);

    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outGain);
    this.wetGain.connect(this.outGain);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'freq') {
      const f = Math.max(1.0, Math.min(2500.0, val));
      this.carrier.frequency.setTargetAtTime(f, now, 0.02);
    } else if (name === 'shape') {
      this.carrier.type = val;
    } else if (name === 'mix') {
      const m = Math.max(0, Math.min(1, val));
      this.wetGain.gain.setTargetAtTime(m, now, 0.02);
      this.dryGain.gain.setTargetAtTime(1 - m, now, 0.02);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    try {
      this.carrier.stop();
      this.inputNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 16. Auto-Panner & Tremolo Module
// ---------------------------------------------------------------------------
class AutoPanModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'autopan';

    this.inputNode = ctx.createGain();
    this.panner = ctx.createStereoPanner();
    this.outGain = ctx.createGain();

    this.lfo = ctx.createOscillator();
    this.lfo.type = params.shape || 'sine';
    this.lfo.frequency.setValueAtTime(params.rate || 1.5, ctx.currentTime);

    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.setValueAtTime(params.depth !== undefined ? params.depth : 0.8, ctx.currentTime);

    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.panner.pan);
    this.lfo.start();

    this.inputNode.connect(this.panner);
    this.panner.connect(this.outGain);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'rate') {
      this.lfo.frequency.setTargetAtTime(Math.max(0.1, Math.min(15.0, val)), now, 0.02);
    } else if (name === 'depth') {
      this.lfoGain.gain.setTargetAtTime(Math.max(0, Math.min(1.0, val)), now, 0.02);
    } else if (name === 'shape') {
      this.lfo.type = val;
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    try {
      this.lfo.stop();
      this.inputNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 17. Wavetable / Vector Oscillator Module
// ---------------------------------------------------------------------------
class WavetableModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'wavetable';

    this.outGain = ctx.createGain();
    this.outGain.gain.setValueAtTime(0.7, ctx.currentTime);

    this.osc = ctx.createOscillator();
    this.freq = params.freq || 65.41;
    this.tableType = params.table || 'glass';

    this.subOsc = ctx.createOscillator();
    this.subOsc.type = 'sine';
    this.subGain = ctx.createGain();
    this.subGain.gain.setValueAtTime(params.subLevel !== undefined ? params.subLevel : 0.4, ctx.currentTime);

    this.subOsc.connect(this.subGain);
    this.subGain.connect(this.outGain);
    this.osc.connect(this.outGain);

    this.updateWave();
    this.osc.frequency.setValueAtTime(this.freq, ctx.currentTime);
    this.subOsc.frequency.setValueAtTime(this.freq / 2, ctx.currentTime);

    this.osc.start();
    this.subOsc.start();
  }

  updateWave() {
    const n = 16;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    real[0] = 0; imag[0] = 0;

    if (this.tableType === 'glass') {
      // High bell-like harmonics
      for (let i = 1; i < n; i++) imag[i] = (i % 2 === 1) ? 1.0 / (i * 0.8) : 0.2 / i;
    } else if (this.tableType === 'organ') {
      // Drawbar organ harmonics: 1, 2, 3, 4, 6, 8
      imag[1] = 1.0; imag[2] = 0.8; imag[3] = 0.6; imag[4] = 0.4; imag[6] = 0.3; imag[8] = 0.2;
    } else if (this.tableType === 'vocal') {
      // Odd vowel formants
      imag[1] = 1.0; imag[3] = 0.7; imag[5] = 0.5; imag[7] = 0.3; imag[9] = 0.2;
    } else {
      // Metallic inharmonics
      for (let i = 1; i < n; i++) imag[i] = Math.sin(i * 1.7) * (1.0 / Math.sqrt(i));
    }

    const wave = this.ctx.createPeriodicWave(real, imag);
    this.osc.setPeriodicWave(wave);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'freq') {
      this.freq = Math.max(20, Math.min(1200, val));
      this.osc.frequency.setTargetAtTime(this.freq, now, 0.02);
      this.subOsc.frequency.setTargetAtTime(this.freq / 2, now, 0.02);
    } else if (name === 'table') {
      this.tableType = val;
      this.updateWave();
    } else if (name === 'subLevel') {
      this.subGain.gain.setTargetAtTime(Math.max(0, Math.min(1, val)), now, 0.02);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return null;
  }

  dispose() {
    try {
      this.osc.stop();
      this.subOsc.stop();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 18. FM Quad Operator Module
// ---------------------------------------------------------------------------
class FmQuadModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'fm_quad';

    this.outGain = ctx.createGain();
    this.outGain.gain.setValueAtTime(0.7, ctx.currentTime);

    this.baseFreq = params.freq || 110.0;
    this.ratio2 = params.ratio2 || 2.0;
    this.ratio3 = params.ratio3 || 3.5;
    this.depth = params.index || 0.6;

    // Carrier (Op 1)
    this.op1 = ctx.createOscillator();
    this.op1.frequency.setValueAtTime(this.baseFreq, ctx.currentTime);

    // Modulator (Op 2)
    this.op2 = ctx.createOscillator();
    this.op2.frequency.setValueAtTime(this.baseFreq * this.ratio2, ctx.currentTime);
    this.mod2Gain = ctx.createGain();
    this.mod2Gain.gain.setValueAtTime(this.depth * 300, ctx.currentTime);

    // Sub-modulator (Op 3)
    this.op3 = ctx.createOscillator();
    this.op3.frequency.setValueAtTime(this.baseFreq * this.ratio3, ctx.currentTime);
    this.mod3Gain = ctx.createGain();
    this.mod3Gain.gain.setValueAtTime(this.depth * 150, ctx.currentTime);

    this.op3.connect(this.mod3Gain);
    this.mod3Gain.connect(this.op2.frequency);

    this.op2.connect(this.mod2Gain);
    this.mod2Gain.connect(this.op1.frequency);

    this.op1.connect(this.outGain);

    this.op1.start();
    this.op2.start();
    this.op3.start();
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'freq') {
      this.baseFreq = Math.max(20, Math.min(1000, val));
      this.op1.frequency.setTargetAtTime(this.baseFreq, now, 0.02);
      this.op2.frequency.setTargetAtTime(this.baseFreq * this.ratio2, now, 0.02);
      this.op3.frequency.setTargetAtTime(this.baseFreq * this.ratio3, now, 0.02);
    } else if (name === 'ratio2') {
      this.ratio2 = Math.max(0.25, Math.min(12, val));
      this.op2.frequency.setTargetAtTime(this.baseFreq * this.ratio2, now, 0.02);
    } else if (name === 'ratio3') {
      this.ratio3 = Math.max(0.25, Math.min(12, val));
      this.op3.frequency.setTargetAtTime(this.baseFreq * this.ratio3, now, 0.02);
    } else if (name === 'index') {
      this.depth = Math.max(0, Math.min(2.0, val));
      this.mod2Gain.gain.setTargetAtTime(this.depth * 300, now, 0.02);
      this.mod3Gain.gain.setTargetAtTime(this.depth * 150, now, 0.02);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return null;
  }

  dispose() {
    try {
      this.op1.stop();
      this.op2.stop();
      this.op3.stop();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 19. Percussion / Analog Drum Generator Module
// ---------------------------------------------------------------------------
class PercussionModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'percussion';

    this.outGain = ctx.createGain();
    this.outGain.gain.setValueAtTime(0.85, ctx.currentTime);

    this.bpm = params.bpm || 120;
    this.decay = params.decay || 0.35;
    this.mode = params.mode || '808kick'; // 808kick, snare, hihat
    this.pattern = params.pattern || 'auto';
    this.currentStep = 0; // 16 steps (0-15)
    this.isRunning = true;

    this.runStep();
  }

  isStepActive(step) {
    const p = this.pattern === 'auto' ? (
      this.mode === '808kick' ? 'four_floor' :
      this.mode === 'snare' ? 'backbeat' : 'every_8th'
    ) : this.pattern;

    if (p === 'four_floor') {
      return step % 4 === 0; // Steps 0, 4, 8, 12 (Beats 1, 2, 3, 4)
    }
    if (p === 'backbeat') {
      return step === 4 || step === 12; // Beats 2 and 4
    }
    if (p === 'every_8th') {
      return step % 2 === 0; // Steps 0, 2, 4, 6, 8, 10, 12, 14
    }
    if (p === 'syncopated') {
      return step === 0 || step === 3 || step === 6 || step === 10 || step === 12;
    }
    if (p === 'every_16th') {
      return true;
    }
    return step % 4 === 0;
  }

  triggerHit(scheduledTime = null) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = scheduledTime || this.ctx.currentTime;

    if (this.mode === '808kick') {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.07);

      env.gain.setValueAtTime(1.1, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + this.decay);

      osc.connect(env);
      env.connect(this.outGain);
      osc.start(now);
      osc.stop(now + this.decay);
    } else if (this.mode === 'snare') {
      const bSize = Math.floor(this.ctx.sampleRate * 0.2);
      const b = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < bSize; i++) d[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = b;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1200, now);

      // Body tone for punchy 808 snare
      const osc = this.ctx.createOscillator();
      const oscEnv = this.ctx.createGain();
      osc.frequency.setValueAtTime(185, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);
      oscEnv.gain.setValueAtTime(0.7, now);
      oscEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(oscEnv);
      oscEnv.connect(this.outGain);
      osc.start(now);
      osc.stop(now + 0.09);

      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0.85, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + this.decay * 0.7);

      noise.connect(filter);
      filter.connect(env);
      env.connect(this.outGain);
      noise.start(now);
    } else {
      // Hi-hat metallic noise
      const bSize = Math.floor(this.ctx.sampleRate * 0.08);
      const b = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < bSize; i++) d[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = b;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7500, now);

      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0.65, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      noise.connect(filter);
      filter.connect(env);
      env.connect(this.outGain);
      noise.start(now);
    }
  }

  runStep(scheduledTime = null) {
    if (!this.isRunning) return;
    const now = scheduledTime || this.ctx.currentTime;

    if (this.isStepActive(this.currentStep)) {
      this.triggerHit(now);
    }

    this.currentStep = (this.currentStep + 1) % 16;
    const stepIntervalMs = Math.floor((60000 / this.bpm) / 4); // 16th notes
    this.timer = setTimeout(() => this.runStep(), stepIntervalMs);
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this.currentStep = 0;
    this.runStep(now || this.ctx.currentTime);
  }

  setParam(name, val) {
    if (name === 'bpm') {
      this.bpm = Math.max(30, Math.min(240, Math.round(val)));
    } else if (name === 'decay') {
      this.decay = Math.max(0.05, Math.min(1.2, val));
    } else if (name === 'mode') {
      this.mode = val;
    } else if (name === 'pattern') {
      this.pattern = val;
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return null;
  }

  dispose() {
    this.isRunning = false;
    clearTimeout(this.timer);
    try {
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 20. Acid 303 Synth Voice Module
// ---------------------------------------------------------------------------
class Acid303Module {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'acid303';

    this.outGain = ctx.createGain();
    this.outGain.gain.setValueAtTime(0.8, ctx.currentTime);

    this.bpm = params.bpm || 120;
    this.currentStep = 0;
    this.isRunning = true;

    this.osc = ctx.createOscillator();
    this.osc.type = params.wave || 'sawtooth';
    this.freq = params.freq || 55.0; // A1
    this.osc.frequency.setValueAtTime(this.freq, ctx.currentTime);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.cutoff = params.cutoff || 420.0;
    this.res = params.resonance || 14.0;
    this.filter.frequency.setValueAtTime(this.cutoff, ctx.currentTime);
    this.filter.Q.setValueAtTime(this.res, ctx.currentTime);

    this.vca = ctx.createGain();
    this.vca.gain.setValueAtTime(0.001, ctx.currentTime);

    this.envMod = params.envMod !== undefined ? params.envMod : 0.6;
    this.notes = [55.0, 55.0, 65.41, 55.0, 73.42, 55.0, 82.41, 98.0, 55.0, 65.41, 55.0, 73.42, 65.41, 55.0, 49.0, 55.0];
    this.accents = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0];

    this.osc.connect(this.filter);
    this.filter.connect(this.vca);
    this.vca.connect(this.outGain);
    this.osc.start();

    this.runStep();
  }

  runStep(scheduledTime = null) {
    if (!this.isRunning) return;
    const now = scheduledTime || this.ctx.currentTime;

    const noteFreq = this.notes[this.currentStep];
    const isAccent = this.accents[this.currentStep] === 1;

    this.osc.frequency.setTargetAtTime(noteFreq, now, 0.015);

    const sweepCutoff = this.cutoff * (1 + this.envMod * (isAccent ? 5.5 : 2.8));
    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(sweepCutoff, now);
    this.filter.frequency.exponentialRampToValueAtTime(Math.max(40, this.cutoff), now + (isAccent ? 0.18 : 0.11));

    this.vca.gain.cancelScheduledValues(now);
    this.vca.gain.setValueAtTime(isAccent ? 0.95 : 0.65, now);
    this.vca.gain.exponentialRampToValueAtTime(0.001, now + (isAccent ? 0.18 : 0.11));

    this.currentStep = (this.currentStep + 1) % 16;
    const stepIntervalMs = Math.floor((60000 / this.bpm) / 4);
    this.timer = setTimeout(() => this.runStep(), stepIntervalMs);
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this.currentStep = 0;
    this.runStep(now || this.ctx.currentTime);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'bpm') {
      this.bpm = Math.max(30, Math.min(240, Math.round(val)));
    } else if (name === 'cutoff') {
      this.cutoff = Math.max(40, Math.min(8000, val));
    } else if (name === 'resonance') {
      this.res = Math.max(0.5, Math.min(24, val));
      this.filter.Q.setTargetAtTime(this.res, now, 0.02);
    } else if (name === 'envMod') {
      this.envMod = Math.max(0, Math.min(1, val));
    } else if (name === 'wave') {
      this.osc.type = val;
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return null;
  }

  dispose() {
    this.isRunning = false;
    clearTimeout(this.timer);
    try {
      this.osc.stop();
      this.osc.disconnect();
      this.filter.disconnect();
      this.vca.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 21. 7-Band Graphic Equalizer Module
// ---------------------------------------------------------------------------
class Eq7Module {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'eq7';

    this.inputNode = ctx.createGain();
    this.outGain = ctx.createGain();

    this.frequencies = [60, 150, 400, 1000, 2400, 6000, 14000];
    this.filters = [];

    let prev = this.inputNode;
    for (const f of this.frequencies) {
      const eq = ctx.createBiquadFilter();
      eq.type = 'peaking';
      eq.frequency.setValueAtTime(f, ctx.currentTime);
      eq.Q.setValueAtTime(1.4, ctx.currentTime);
      eq.gain.setValueAtTime(params[`b_${f}`] || 0.0, ctx.currentTime);
      prev.connect(eq);
      prev = eq;
      this.filters.push(eq);
    }

    prev.connect(this.outGain);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    for (let i = 0; i < this.frequencies.length; i++) {
      const f = this.frequencies[i];
      if (name === `b_${f}`) {
        this.filters[i].gain.setTargetAtTime(Math.max(-14, Math.min(14, val)), now, 0.02);
      }
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    try {
      this.inputNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 22. Dual Comb Filter Module
// ---------------------------------------------------------------------------
class CombModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'comb';

    this.inputNode = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.outGain = ctx.createGain();

    this.freq = params.freq || 220.0;
    this.feedback = params.feedback || 0.85;

    this.delayNode = ctx.createDelay(0.1);
    this.delayNode.delayTime.setValueAtTime(1.0 / Math.max(20, this.freq), ctx.currentTime);

    this.fbGain = ctx.createGain();
    this.fbGain.gain.setValueAtTime(this.feedback, ctx.currentTime);

    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.delayNode);

    this.delayNode.connect(this.fbGain);
    this.fbGain.connect(this.delayNode);

    this.delayNode.connect(this.wetGain);

    const mix = params.mix !== undefined ? params.mix : 0.7;
    this.wetGain.gain.setValueAtTime(mix, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1 - mix, ctx.currentTime);

    this.dryGain.connect(this.outGain);
    this.wetGain.connect(this.outGain);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'freq') {
      this.freq = Math.max(30, Math.min(1500, val));
      this.delayNode.delayTime.setTargetAtTime(1.0 / this.freq, now, 0.02);
    } else if (name === 'feedback') {
      this.feedback = Math.max(0, Math.min(0.98, val));
      this.fbGain.gain.setTargetAtTime(this.feedback, now, 0.02);
    } else if (name === 'mix') {
      const m = Math.max(0, Math.min(1, val));
      this.wetGain.gain.setTargetAtTime(m, now, 0.02);
      this.dryGain.gain.setTargetAtTime(1 - m, now, 0.02);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    try {
      this.inputNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 23. VCA Glue Compressor Module
// ---------------------------------------------------------------------------
class CompressorModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'compressor';

    this.inputNode = ctx.createGain();
    this.comp = ctx.createDynamicsCompressor();
    this.makeup = ctx.createGain();
    this.outGain = ctx.createGain();

    this.comp.threshold.setValueAtTime(params.threshold || -18.0, ctx.currentTime);
    this.comp.ratio.setValueAtTime(params.ratio || 4.0, ctx.currentTime);
    this.comp.attack.setValueAtTime(params.attack || 0.01, ctx.currentTime);
    this.comp.release.setValueAtTime(params.release || 0.15, ctx.currentTime);
    this.makeup.gain.setValueAtTime(params.makeup || 1.3, ctx.currentTime);

    this.inputNode.connect(this.comp);
    this.comp.connect(this.makeup);
    this.makeup.connect(this.outGain);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'threshold') {
      this.comp.threshold.setTargetAtTime(Math.max(-50, Math.min(0, val)), now, 0.02);
    } else if (name === 'ratio') {
      this.comp.ratio.setTargetAtTime(Math.max(1, Math.min(20, val)), now, 0.02);
    } else if (name === 'makeup') {
      this.makeup.gain.setTargetAtTime(Math.max(0.5, Math.min(3.0, val)), now, 0.02);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    try {
      this.inputNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 24. Germanium Fuzz Module
// ---------------------------------------------------------------------------
class FuzzModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'fuzz';

    this.inputNode = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.outGain = ctx.createGain();

    this.shaper = ctx.createWaveShaper();
    this.toneFilter = ctx.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.setValueAtTime(params.tone || 3200, ctx.currentTime);

    this.fuzzGain = params.gain || 8.0;
    this.updateFuzzCurve();

    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.shaper);
    this.shaper.connect(this.toneFilter);
    this.toneFilter.connect(this.wetGain);

    const mix = params.mix !== undefined ? params.mix : 0.85;
    this.wetGain.gain.setValueAtTime(mix, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1 - mix, ctx.currentTime);

    this.dryGain.connect(this.outGain);
    this.wetGain.connect(this.outGain);
  }

  updateFuzzCurve() {
    const n = 512;
    const curve = new Float32Array(n);
    const k = this.fuzzGain;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      // Asymmetric Germanium diode clipping
      curve[i] = Math.tanh(x * k) + 0.15 * Math.sin(x * Math.PI * 2);
    }
    this.shaper.curve = curve;
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'gain') {
      this.fuzzGain = Math.max(1.0, Math.min(25.0, val));
      this.updateFuzzCurve();
    } else if (name === 'tone') {
      this.toneFilter.frequency.setTargetAtTime(Math.max(400, Math.min(12000, val)), now, 0.02);
    } else if (name === 'mix') {
      const m = Math.max(0, Math.min(1, val));
      this.wetGain.gain.setTargetAtTime(m, now, 0.02);
      this.dryGain.gain.setTargetAtTime(1 - m, now, 0.02);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    try {
      this.inputNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 25. Shimmer Reverb Module
// ---------------------------------------------------------------------------
class ShimmerModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'shimmer';

    this.inputNode = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.outGain = ctx.createGain();

    this.convolver = ctx.createConvolver();
    this.decay = params.decay || 8.0;
    this.generateShimmerImpulse(this.decay);

    // Subtle pitch harmonic shimmer feed
    this.shimmerOsc = ctx.createOscillator();
    this.shimmerOsc.type = 'sine';
    this.shimmerOsc.frequency.setValueAtTime(880, ctx.currentTime);
    this.shimmerGain = ctx.createGain();
    this.shimmerGain.gain.setValueAtTime(0.08, ctx.currentTime);
    this.shimmerOsc.connect(this.shimmerGain);
    this.shimmerGain.connect(this.wetGain);
    this.shimmerOsc.start();

    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.convolver);
    this.convolver.connect(this.wetGain);

    const mix = params.mix !== undefined ? params.mix : 0.75;
    this.wetGain.gain.setValueAtTime(mix, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1 - mix, ctx.currentTime);

    this.dryGain.connect(this.outGain);
    this.wetGain.connect(this.outGain);
  }

  generateShimmerImpulse(duration) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * Math.max(1, Math.min(14, duration)));
    const buf = this.ctx.createBuffer(2, len, rate);
    const l = buf.getChannelData(0);
    const r = buf.getChannelData(1);

    for (let i = 0; i < len; i++) {
      const decay = Math.exp(-i / (rate * (duration / 4)));
      l[i] = (Math.random() * 2 - 1) * decay;
      r[i] = (Math.random() * 2 - 1) * decay;
    }
    this.convolver.buffer = buf;
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'decay') {
      this.decay = Math.max(1.0, Math.min(14.0, val));
      this.generateShimmerImpulse(this.decay);
    } else if (name === 'mix') {
      const m = Math.max(0, Math.min(1, val));
      this.wetGain.gain.setTargetAtTime(m, now, 0.02);
      this.dryGain.gain.setTargetAtTime(1 - m, now, 0.02);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    try {
      this.shimmerOsc.stop();
      this.inputNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 26. 8-Step Rhythmic Gate Sequencer Module
// ---------------------------------------------------------------------------
class SequencerModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'sequencer';

    this.inputNode = ctx.createGain();
    this.gateGain = ctx.createGain();
    this.outGain = ctx.createGain();

    this.bpm = params.bpm || 110;
    this.currentStep = 0;
    this.pattern = [1, 0, 1, 1, 0, 1, 0, 1]; // 8 steps
    this.isRunning = true;

    this.inputNode.connect(this.gateGain);
    this.gateGain.connect(this.outGain);

    this.runClock();
  }

  runClock(scheduledTime = null) {
    if (!this.isRunning) return;
    const now = scheduledTime || this.ctx.currentTime;
    const isOpen = this.pattern[this.currentStep] === 1;
    this.gateGain.gain.cancelScheduledValues(now);
    this.gateGain.gain.setTargetAtTime(isOpen ? 1.0 : 0.05, now, 0.01);

    this.currentStep = (this.currentStep + 1) % 8;
    const interval = Math.floor((60000 / this.bpm) / 2); // 8th note
    this.timer = setTimeout(() => this.runClock(), interval);
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this.currentStep = 0;
    this.runClock(now || this.ctx.currentTime);
  }

  setParam(name, val) {
    if (name === 'bpm') {
      this.bpm = Math.max(40, Math.min(240, Math.round(val)));
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    this.isRunning = false;
    clearTimeout(this.timer);
    try {
      this.inputNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 27. Multiple / Splitter & Inverter Module
// ---------------------------------------------------------------------------
class MultModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'mult';

    this.inputNode = ctx.createGain();
    this.out1 = ctx.createGain();
    this.out2 = ctx.createGain();
    this.outInv = ctx.createGain();

    this.outInv.gain.setValueAtTime(-1.0, ctx.currentTime); // Phase invert!

    this.inputNode.connect(this.out1);
    this.inputNode.connect(this.out2);
    this.inputNode.connect(this.outInv);
  }

  setParam(name, val) {}

  getJackOutputNode(jack) {
    if (jack === 'out2') return this.out2;
    if (jack === 'inv') return this.outInv;
    return this.out1;
  }

  getJackInputNode(jack) {
    return this.inputNode;
  }

  dispose() {
    try {
      this.inputNode.disconnect();
      this.out1.disconnect();
      this.out2.disconnect();
      this.outInv.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 28. Euclidean Rhythm Generator Module
// ---------------------------------------------------------------------------
class EuclidModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'euclid';

    this.inputNode = ctx.createGain();
    this.gateGain = ctx.createGain();
    this.pulseGain = ctx.createGain();
    this.outGain = ctx.createGain();

    this.bpm = params.bpm || 120;
    this.steps = params.steps || 16;
    this.pulses = params.pulses || 7;
    this.offset = params.offset || 0;
    this.currentStep = 0;
    this.isRunning = true;

    this.inputNode.connect(this.gateGain);
    this.gateGain.connect(this.outGain);
    this.pulseGain.connect(this.outGain);

    this.calcPattern();
    this.runClock();
  }

  calcPattern() {
    const k = Math.min(this.pulses, this.steps);
    const n = Math.max(1, this.steps);
    const pattern = new Array(n).fill(0);
    for (let i = 0; i < k; i++) {
      pattern[Math.floor((i * n) / k)] = 1;
    }
    this.pattern = [];
    for (let i = 0; i < n; i++) {
      this.pattern.push(pattern[(i + this.offset) % n]);
    }
  }

  runClock(scheduledTime = null) {
    if (!this.isRunning) return;
    const now = scheduledTime || this.ctx.currentTime;
    const isActive = this.pattern[this.currentStep % this.pattern.length] === 1;

    this.gateGain.gain.cancelScheduledValues(now);
    this.gateGain.gain.setTargetAtTime(isActive ? 1.0 : 0.05, now, 0.005);

    if (isActive) {
      const osc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.04);
      clickGain.gain.setValueAtTime(0.35, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(clickGain);
      clickGain.connect(this.pulseGain);
      osc.start(now);
      osc.stop(now + 0.05);
    }

    this.currentStep = (this.currentStep + 1) % this.pattern.length;
    const stepInterval = Math.floor((60000 / this.bpm) / 4);
    this.timer = setTimeout(() => this.runClock(), stepInterval);
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this.currentStep = 0;
    this.runClock(now || this.ctx.currentTime);
  }

  setParam(name, val) {
    if (name === 'bpm') this.bpm = Math.max(40, Math.min(240, Math.round(val)));
    else if (name === 'steps') { this.steps = Math.max(2, Math.min(16, Math.round(val))); this.calcPattern(); }
    else if (name === 'pulses') { this.pulses = Math.max(1, Math.min(16, Math.round(val))); this.calcPattern(); }
    else if (name === 'offset') { this.offset = Math.max(0, Math.min(15, Math.round(val))); this.calcPattern(); }
  }

  getJackOutputNode(jack) { return this.outGain; }
  getJackInputNode(jack) { return this.inputNode; }

  dispose() {
    this.isRunning = false;
    clearTimeout(this.timer);
    try {
      this.inputNode.disconnect();
      this.gateGain.disconnect();
      this.pulseGain.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 29. Turing Machine Pseudo-Random Shift Register Module
// ---------------------------------------------------------------------------
class TuringModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'turing';

    this.outGain = ctx.createGain();
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(2400, ctx.currentTime);
    this.filter.connect(this.outGain);

    this.rate = params.rate || 4.0;
    this.length = params.length || 16;
    this.lock = params.lock !== undefined ? params.lock : 0.85;
    this.scale = params.scale || 'minor';

    this.register = 0xACE1;
    this.isRunning = true;
    this.runClock();
  }

  quantizePitch(val) {
    const scales = {
      minor: [0, 2, 3, 5, 7, 8, 10],
      pentatonic: [0, 3, 5, 7, 10],
      dorian: [0, 2, 3, 5, 7, 9, 10],
      chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    };
    const scale = scales[this.scale] || scales.minor;
    const root = 110.0;
    const degree = val % (scale.length * 3);
    const oct = Math.floor(degree / scale.length);
    const semitone = scale[degree % scale.length] + oct * 12;
    return root * Math.pow(2, semitone / 12);
  }

  runClock(scheduledTime = null) {
    if (!this.isRunning) return;
    const now = scheduledTime || this.ctx.currentTime;

    let bit = this.register & 1;
    if (Math.random() > this.lock) {
      bit = bit ^ 1;
    }
    this.register = ((this.register >> 1) | (bit << (this.length - 1))) & 0xFFFF;

    const pitchVal = this.register & 0xFF;
    const freq = this.quantizePitch(pitchVal);

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = (pitchVal % 2 === 0) ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    const dur = 1.0 / this.rate;
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.35, now + 0.008);
    env.gain.exponentialRampToValueAtTime(0.001, now + Math.min(0.35, dur * 0.9));

    osc.connect(env);
    env.connect(this.filter);
    osc.start(now);
    osc.stop(now + dur);

    const interval = Math.floor(1000 / this.rate);
    this.timer = setTimeout(() => this.runClock(), interval);
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this.runClock(now || this.ctx.currentTime);
  }

  setParam(name, val) {
    if (name === 'rate') this.rate = Math.max(0.5, Math.min(20, val));
    else if (name === 'length') this.length = Math.max(4, Math.min(32, Math.round(val)));
    else if (name === 'lock') this.lock = Math.max(0, Math.min(1, val));
    else if (name === 'scale') this.scale = val;
  }

  getJackOutputNode(jack) { return this.outGain; }
  getJackInputNode(jack) { return null; }

  dispose() {
    this.isRunning = false;
    clearTimeout(this.timer);
    try {
      this.filter.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 30. Sample & Hold with Pink/White Noise & Slew Module
// ---------------------------------------------------------------------------
class SampleHoldModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'sample_hold';

    this.inputNode = ctx.createGain();
    this.heldGain = ctx.createGain();
    this.slewFilter = ctx.createBiquadFilter();
    this.slewFilter.type = 'lowpass';
    this.slewFilter.frequency.setValueAtTime(20, ctx.currentTime);

    this.carrierOsc = ctx.createOscillator();
    this.carrierOsc.type = 'sawtooth';
    this.carrierOsc.frequency.setValueAtTime(220, ctx.currentTime);

    this.outGain = ctx.createGain();
    this.carrierOsc.connect(this.heldGain);
    this.heldGain.connect(this.slewFilter);
    this.slewFilter.connect(this.outGain);
    this.carrierOsc.start();

    this.rate = params.rate || 6.0;
    this.glide = params.glide !== undefined ? params.glide : 0.05;
    this.source = params.source || 'internal_noise';
    this.isRunning = true;

    this.updateGlide();
    this.runClock();
  }

  updateGlide() {
    const cutoff = 4000 * Math.exp(-this.glide * 10);
    this.slewFilter.frequency.setTargetAtTime(Math.max(5, cutoff), this.ctx.currentTime, 0.02);
  }

  runClock(scheduledTime = null) {
    if (!this.isRunning) return;
    const now = scheduledTime || this.ctx.currentTime;
    const sampledVal = Math.random() * 2 - 1;

    const targetFreq = 220 * Math.pow(2, sampledVal * 1.5);
    this.carrierOsc.frequency.setTargetAtTime(targetFreq, now, Math.max(0.005, this.glide));
    this.heldGain.gain.setTargetAtTime(0.25 + Math.abs(sampledVal) * 0.35, now, 0.005);

    const interval = Math.floor(1000 / this.rate);
    this.timer = setTimeout(() => this.runClock(), interval);
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this.runClock(now || this.ctx.currentTime);
  }

  setParam(name, val) {
    if (name === 'rate') this.rate = Math.max(0.5, Math.min(30, val));
    else if (name === 'glide') { this.glide = Math.max(0, Math.min(0.5, val)); this.updateGlide(); }
    else if (name === 'source') this.source = val;
  }

  getJackOutputNode(jack) { return this.outGain; }
  getJackInputNode(jack) { return this.inputNode; }

  dispose() {
    this.isRunning = false;
    clearTimeout(this.timer);
    try {
      this.carrierOsc.stop();
      this.carrierOsc.disconnect();
      this.heldGain.disconnect();
      this.slewFilter.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 31. ADSR Envelope Generator & VCA Module
// ---------------------------------------------------------------------------
class AdsrModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'adsr';

    this.inputNode = ctx.createGain();
    this.vcaNode = ctx.createGain();
    this.outGain = ctx.createGain();

    this.internalOsc = ctx.createOscillator();
    this.internalOsc.type = 'triangle';
    this.internalOsc.frequency.setValueAtTime(130.81, ctx.currentTime);
    this.internalOsc.connect(this.inputNode);
    this.internalOsc.start();

    this.inputNode.connect(this.vcaNode);
    this.vcaNode.connect(this.outGain);

    this.attack = params.attack || 40;
    this.decay = params.decay || 250;
    this.sustain = params.sustain !== undefined ? params.sustain : 0.6;
    this.release = params.release || 600;
    this.cycle = params.cycle || 'loop';

    this.isRunning = true;
    this.triggerEnv();
  }

  triggerEnv(scheduledTime = null) {
    if (!this.isRunning) return;
    const now = scheduledTime || this.ctx.currentTime;
    const a = this.attack / 1000;
    const d = this.decay / 1000;
    const s = this.sustain;
    const r = this.release / 1000;

    this.vcaNode.gain.cancelScheduledValues(now);
    this.vcaNode.gain.setValueAtTime(0.001, now);
    this.vcaNode.gain.linearRampToValueAtTime(1.0, now + a);
    this.vcaNode.gain.exponentialRampToValueAtTime(Math.max(0.001, s), now + a + d);

    if (this.cycle === 'loop') {
      const holdTime = 0.2;
      const releaseStart = now + a + d + holdTime;
      this.vcaNode.gain.exponentialRampToValueAtTime(0.001, releaseStart + r);
      const totalDur = (a + d + holdTime + r + 0.05) * 1000;
      this.timer = setTimeout(() => this.triggerEnv(), totalDur);
    }
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this.triggerEnv(now || this.ctx.currentTime);
  }

  setParam(name, val) {
    if (name === 'attack') this.attack = Math.max(1, Math.min(2000, val));
    else if (name === 'decay') this.decay = Math.max(10, Math.min(3000, val));
    else if (name === 'sustain') this.sustain = Math.max(0, Math.min(1, val));
    else if (name === 'release') this.release = Math.max(10, Math.min(4000, val));
    else if (name === 'cycle') {
      this.cycle = val;
      if (this.cycle === 'loop' && !this.timer) this.triggerEnv();
    }
  }

  getJackOutputNode(jack) { return this.outGain; }
  getJackInputNode(jack) { return this.inputNode; }

  dispose() {
    this.isRunning = false;
    clearTimeout(this.timer);
    try {
      this.internalOsc.stop();
      this.internalOsc.disconnect();
      this.inputNode.disconnect();
      this.vcaNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 32. Dual Function Generator & Slew (Maths) Module
// ---------------------------------------------------------------------------
class MathsModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'maths';

    this.inputNode = ctx.createGain();
    this.slewNode = ctx.createGain();
    this.outGain = ctx.createGain();

    this.droneOsc = ctx.createOscillator();
    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.setValueAtTime(110, ctx.currentTime);
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(400, ctx.currentTime);

    this.droneOsc.connect(this.filter);
    this.filter.connect(this.slewNode);
    this.inputNode.connect(this.slewNode);
    this.slewNode.connect(this.outGain);
    this.droneOsc.start();

    this.rise = params.rise || 80;
    this.fall = params.fall || 350;
    this.curve = params.curve !== undefined ? params.curve : 0;
    this.level = params.level !== undefined ? params.level : 0.8;

    this.isRunning = true;
    this.runFunction();
  }

  runFunction(scheduledTime = null) {
    if (!this.isRunning) return;
    const now = scheduledTime || this.ctx.currentTime;
    const r = this.rise / 1000;
    const f = this.fall / 1000;

    this.slewNode.gain.cancelScheduledValues(now);
    this.slewNode.gain.setValueAtTime(0.001, now);
    this.slewNode.gain.exponentialRampToValueAtTime(this.level, now + r);
    this.slewNode.gain.exponentialRampToValueAtTime(0.001, now + r + f);

    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(200, now);
    this.filter.frequency.exponentialRampToValueAtTime(3200, now + r);
    this.filter.frequency.exponentialRampToValueAtTime(200, now + r + f);

    const totalDur = (r + f + 0.02) * 1000;
    this.timer = setTimeout(() => this.runFunction(), totalDur);
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this.runFunction(now || this.ctx.currentTime);
  }

  setParam(name, val) {
    if (name === 'rise') this.rise = Math.max(5, Math.min(2000, val));
    else if (name === 'fall') this.fall = Math.max(10, Math.min(3000, val));
    else if (name === 'curve') this.curve = Math.max(-1, Math.min(1, val));
    else if (name === 'level') this.level = Math.max(0, Math.min(1, val));
  }

  getJackOutputNode(jack) { return this.outGain; }
  getJackInputNode(jack) { return this.inputNode; }

  dispose() {
    this.isRunning = false;
    clearTimeout(this.timer);
    try {
      this.droneOsc.stop();
      this.droneOsc.disconnect();
      this.filter.disconnect();
      this.inputNode.disconnect();
      this.slewNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 33. Harmonic Additive Sine Synthesizer Module
// ---------------------------------------------------------------------------
class HarmonicModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'harmonic';

    this.freq = params.freq || 110;
    this.hLevels = [
      params.h1 !== undefined ? params.h1 : 0.9,
      params.h2 !== undefined ? params.h2 : 0.5,
      params.h3 !== undefined ? params.h3 : 0.4,
      params.h4 !== undefined ? params.h4 : 0.25,
      params.h5 !== undefined ? params.h5 : 0.15,
      params.h6 !== undefined ? params.h6 : 0.1
    ];

    this.oscs = [];
    this.gains = [];
    this.outGain = ctx.createGain();
    this.outGain.gain.setValueAtTime(0.45, ctx.currentTime);

    for (let i = 0; i < 6; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(this.freq * (i + 1), ctx.currentTime);
      g.gain.setValueAtTime(this.hLevels[i] * 0.4, ctx.currentTime);
      osc.connect(g);
      g.connect(this.outGain);
      osc.start();
      this.oscs.push(osc);
      this.gains.push(g);
    }
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'freq') {
      this.freq = Math.max(30, Math.min(600, val));
      for (let i = 0; i < 6; i++) {
        this.oscs[i].frequency.setTargetAtTime(this.freq * (i + 1), now, 0.02);
      }
    } else if (name.startsWith('h')) {
      const idx = parseInt(name.substr(1), 10) - 1;
      if (idx >= 0 && idx < 6) {
        this.hLevels[idx] = Math.max(0, Math.min(1, val));
        this.gains[idx].gain.setTargetAtTime(this.hLevels[idx] * 0.4, now, 0.02);
      }
    }
  }

  getJackOutputNode(jack) { return this.outGain; }
  getJackInputNode(jack) { return null; }

  dispose() {
    try {
      this.oscs.forEach(o => { o.stop(); o.disconnect(); });
      this.gains.forEach(g => g.disconnect());
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 34. Bytebeat Algorithmic Glitch Oscillator Module
// ---------------------------------------------------------------------------
class BytebeatModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'bytebeat';

    this.clock = params.clock || 8000;
    this.algo = params.algo || 'viznut';
    this.p1 = params.p1 !== undefined ? params.p1 : 5;
    this.p2 = params.p2 !== undefined ? params.p2 : 7;
    this.t = 0;

    this.outGain = ctx.createGain();
    this.outGain.gain.setValueAtTime(0.2, ctx.currentTime);

    this.bufferSize = 2048;
    this.scriptNode = ctx.createScriptProcessor ? ctx.createScriptProcessor(this.bufferSize, 0, 1) : null;

    if (this.scriptNode) {
      this.scriptNode.onaudioprocess = (e) => {
        const out = e.outputBuffer.getChannelData(0);
        const p1 = this.p1;
        const p2 = this.p2;
        const algo = this.algo;
        for (let i = 0; i < this.bufferSize; i++) {
          let b = 0;
          const t = this.t++;
          if (algo === 'viznut') {
            b = ((t * p1) & (t >> p2)) | (t >> 4);
          } else if (algo === 'crowd') {
            b = (t * (t >> p1 | t >> p2)) & (t >> 4);
          } else if (algo === 'fractal') {
            b = (t * p1) ^ (t >> p2) ^ ((t * 3) & (t >> 6));
          } else {
            b = (t >> 6 | t | t >> (t >> 16)) * (p1 + ((t >> 11) & p2));
          }
          out[i] = ((b & 0xFF) / 128.0 - 1.0) * 0.4;
        }
      };
      this.scriptNode.connect(this.outGain);
    }
  }

  resetClock(now = null) {
    this.t = 0;
  }

  setParam(name, val) {
    if (name === 'clock') this.clock = Math.max(4000, Math.min(24000, val));
    else if (name === 'algo') this.algo = val;
    else if (name === 'p1') this.p1 = Math.max(1, Math.min(32, Math.round(val)));
    else if (name === 'p2') this.p2 = Math.max(1, Math.min(16, Math.round(val)));
  }

  getJackOutputNode(jack) { return this.outGain; }
  getJackInputNode(jack) { return null; }

  dispose() {
    try {
      if (this.scriptNode) {
        this.scriptNode.disconnect();
        this.scriptNode.onaudioprocess = null;
      }
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 35. Mechanical Spring Reverb Tank Module
// ---------------------------------------------------------------------------
class SpringReverbModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'spring';

    this.inputNode = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.outGain = ctx.createGain();

    this.driveGain = ctx.createGain();
    this.drive = params.drive || 1.8;
    this.driveGain.gain.setValueAtTime(this.drive, ctx.currentTime);

    this.delay1 = ctx.createDelay();
    this.delay1.delayTime.setValueAtTime(0.027, ctx.currentTime);
    this.delay2 = ctx.createDelay();
    this.delay2.delayTime.setValueAtTime(0.039, ctx.currentTime);

    this.fbGain = ctx.createGain();
    this.tension = params.tension || 2.2;
    this.fbGain.gain.setValueAtTime(Math.min(0.85, 0.3 + this.tension * 0.1), ctx.currentTime);

    this.dampFilter = ctx.createBiquadFilter();
    this.dampFilter.type = 'lowpass';
    this.damp = params.damp || 3400;
    this.dampFilter.frequency.setValueAtTime(this.damp, ctx.currentTime);

    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.driveGain);
    this.driveGain.connect(this.delay1);
    this.delay1.connect(this.delay2);
    this.delay2.connect(this.dampFilter);
    this.dampFilter.connect(this.fbGain);
    this.fbGain.connect(this.delay1);

    this.dampFilter.connect(this.wetGain);

    const mix = params.mix !== undefined ? params.mix : 0.55;
    this.wetGain.gain.setValueAtTime(mix, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1 - mix, ctx.currentTime);

    this.dryGain.connect(this.outGain);
    this.wetGain.connect(this.outGain);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'drive') {
      this.drive = Math.max(1, Math.min(4, val));
      this.driveGain.gain.setTargetAtTime(this.drive, now, 0.02);
    } else if (name === 'tension') {
      this.tension = Math.max(0.1, Math.min(5, val));
      this.fbGain.gain.setTargetAtTime(Math.min(0.88, 0.3 + this.tension * 0.1), now, 0.02);
    } else if (name === 'damp') {
      this.damp = Math.max(1000, Math.min(8000, val));
      this.dampFilter.frequency.setTargetAtTime(this.damp, now, 0.02);
    } else if (name === 'mix') {
      const m = Math.max(0, Math.min(1, val));
      this.wetGain.gain.setTargetAtTime(m, now, 0.02);
      this.dryGain.gain.setTargetAtTime(1 - m, now, 0.02);
    }
  }

  getJackOutputNode(jack) { return this.outGain; }
  getJackInputNode(jack) { return this.inputNode; }

  dispose() {
    try {
      this.inputNode.disconnect();
      this.driveGain.disconnect();
      this.delay1.disconnect();
      this.delay2.disconnect();
      this.dampFilter.disconnect();
      this.fbGain.disconnect();
      this.dryGain.disconnect();
      this.wetGain.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 36. Stereo Ping-Pong BBD Delay Module
// ---------------------------------------------------------------------------
class PingPongDelayModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'pingpong';

    this.inputNode = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.outGain = ctx.createGain();

    this.delayL = ctx.createDelay();
    this.delayR = ctx.createDelay();
    this.fbL = ctx.createGain();
    this.fbR = ctx.createGain();
    this.pannerL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    this.pannerR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

    this.time = (params.time || 320) / 1000;
    this.feedback = params.feedback !== undefined ? params.feedback : 0.6;
    this.spread = params.spread !== undefined ? params.spread : 0.85;

    this.delayL.delayTime.setValueAtTime(this.time, ctx.currentTime);
    this.delayR.delayTime.setValueAtTime(this.time * 1.5, ctx.currentTime);
    this.fbL.gain.setValueAtTime(this.feedback, ctx.currentTime);
    this.fbR.gain.setValueAtTime(this.feedback, ctx.currentTime);

    if (this.pannerL) this.pannerL.pan.setValueAtTime(-this.spread, ctx.currentTime);
    if (this.pannerR) this.pannerR.pan.setValueAtTime(this.spread, ctx.currentTime);

    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.delayL);

    this.delayL.connect(this.fbL);
    this.fbL.connect(this.delayR);
    this.delayR.connect(this.fbR);
    this.fbR.connect(this.delayL);

    if (this.pannerL && this.pannerR) {
      this.delayL.connect(this.pannerL);
      this.delayR.connect(this.pannerR);
      this.pannerL.connect(this.wetGain);
      this.pannerR.connect(this.wetGain);
    } else {
      this.delayL.connect(this.wetGain);
      this.delayR.connect(this.wetGain);
    }

    const mix = params.mix !== undefined ? params.mix : 0.5;
    this.wetGain.gain.setValueAtTime(mix, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1 - mix, ctx.currentTime);

    this.dryGain.connect(this.outGain);
    this.wetGain.connect(this.outGain);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'time') {
      this.time = Math.max(0.03, Math.min(1.0, val / 1000));
      this.delayL.delayTime.setTargetAtTime(this.time, now, 0.03);
      this.delayR.delayTime.setTargetAtTime(this.time * 1.5, now, 0.03);
    } else if (name === 'feedback') {
      this.feedback = Math.max(0, Math.min(0.95, val));
      this.fbL.gain.setTargetAtTime(this.feedback, now, 0.02);
      this.fbR.gain.setTargetAtTime(this.feedback, now, 0.02);
    } else if (name === 'spread') {
      this.spread = Math.max(0, Math.min(1, val));
      if (this.pannerL) this.pannerL.pan.setTargetAtTime(-this.spread, now, 0.02);
      if (this.pannerR) this.pannerR.pan.setTargetAtTime(this.spread, now, 0.02);
    } else if (name === 'mix') {
      const m = Math.max(0, Math.min(1, val));
      this.wetGain.gain.setTargetAtTime(m, now, 0.02);
      this.dryGain.gain.setTargetAtTime(1 - m, now, 0.02);
    }
  }

  getJackOutputNode(jack) { return this.outGain; }
  getJackInputNode(jack) { return this.inputNode; }

  dispose() {
    try {
      this.inputNode.disconnect();
      this.delayL.disconnect();
      this.delayR.disconnect();
      this.fbL.disconnect();
      this.fbR.disconnect();
      this.dryGain.disconnect();
      this.wetGain.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 37. State Variable Morphing SVF Filter Module
// ---------------------------------------------------------------------------
class SvfModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'svf';

    this.inputNode = ctx.createGain();
    this.driveGain = ctx.createGain();
    this.lpFilter = ctx.createBiquadFilter();
    this.hpFilter = ctx.createBiquadFilter();
    this.lpGain = ctx.createGain();
    this.hpGain = ctx.createGain();
    this.outGain = ctx.createGain();

    this.lpFilter.type = 'lowpass';
    this.hpFilter.type = 'highpass';

    const cutoff = params.cutoff || 650;
    const res = params.res || 4.0;
    const drive = params.drive || 1.2;
    this.morph = params.morph !== undefined ? params.morph : 0.25;

    this.driveGain.gain.setValueAtTime(drive, ctx.currentTime);
    this.lpFilter.frequency.setValueAtTime(cutoff, ctx.currentTime);
    this.hpFilter.frequency.setValueAtTime(cutoff, ctx.currentTime);
    this.lpFilter.Q.setValueAtTime(res, ctx.currentTime);
    this.hpFilter.Q.setValueAtTime(res, ctx.currentTime);

    this.updateMorph();

    this.inputNode.connect(this.driveGain);
    this.driveGain.connect(this.lpFilter);
    this.driveGain.connect(this.hpFilter);
    this.lpFilter.connect(this.lpGain);
    this.hpFilter.connect(this.hpGain);
    this.lpGain.connect(this.outGain);
    this.hpGain.connect(this.outGain);
  }

  updateMorph() {
    const now = this.ctx.currentTime;
    const lpVal = Math.cos(this.morph * Math.PI * 0.5);
    const hpVal = Math.sin(this.morph * Math.PI * 0.5);
    this.lpGain.gain.setTargetAtTime(lpVal, now, 0.02);
    this.hpGain.gain.setTargetAtTime(hpVal, now, 0.02);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'cutoff') {
      const c = Math.max(40, Math.min(12000, val));
      this.lpFilter.frequency.setTargetAtTime(c, now, 0.02);
      this.hpFilter.frequency.setTargetAtTime(c, now, 0.02);
    } else if (name === 'res') {
      const q = Math.max(0.5, Math.min(15, val));
      this.lpFilter.Q.setTargetAtTime(q, now, 0.02);
      this.hpFilter.Q.setTargetAtTime(q, now, 0.02);
    } else if (name === 'morph') {
      this.morph = Math.max(0, Math.min(1, val));
      this.updateMorph();
    } else if (name === 'drive') {
      this.driveGain.gain.setTargetAtTime(Math.max(1, Math.min(3, val)), now, 0.02);
    }
  }

  getJackOutputNode(jack) { return this.outGain; }
  getJackInputNode(jack) { return this.inputNode; }

  dispose() {
    try {
      this.inputNode.disconnect();
      this.driveGain.disconnect();
      this.lpFilter.disconnect();
      this.hpFilter.disconnect();
      this.lpGain.disconnect();
      this.hpGain.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 38. Leslie Rotary Cabinet Doppler Module
// ---------------------------------------------------------------------------
class RotaryModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'rotary';

    this.inputNode = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.outGain = ctx.createGain();

    this.hornDelay = ctx.createDelay();
    this.drumDelay = ctx.createDelay();
    this.hornDelay.delayTime.setValueAtTime(0.015, ctx.currentTime);
    this.drumDelay.delayTime.setValueAtTime(0.025, ctx.currentTime);

    this.crossover = ctx.createBiquadFilter();
    this.crossover.type = 'lowpass';
    this.crossover.frequency.setValueAtTime(params.crossover || 800, ctx.currentTime);

    this.hornFilter = ctx.createBiquadFilter();
    this.hornFilter.type = 'highpass';
    this.hornFilter.frequency.setValueAtTime(params.crossover || 800, ctx.currentTime);

    this.lfoHorn = ctx.createOscillator();
    this.lfoDrum = ctx.createOscillator();
    this.lfoHornGain = ctx.createGain();
    this.lfoDrumGain = ctx.createGain();

    this.speed = params.speed || 'fast';
    this.depth = params.depth !== undefined ? params.depth : 0.7;
    this.updateSpeeds();

    this.lfoHorn.connect(this.lfoHornGain);
    this.lfoHornGain.connect(this.hornDelay.delayTime);
    this.lfoDrum.connect(this.lfoDrumGain);
    this.lfoDrumGain.connect(this.drumDelay.delayTime);
    this.lfoHorn.start();
    this.lfoDrum.start();

    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.crossover);
    this.inputNode.connect(this.hornFilter);
    this.crossover.connect(this.drumDelay);
    this.hornFilter.connect(this.hornDelay);

    this.drumDelay.connect(this.wetGain);
    this.hornDelay.connect(this.wetGain);

    const mix = params.mix !== undefined ? params.mix : 0.8;
    this.wetGain.gain.setValueAtTime(mix, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1 - mix, ctx.currentTime);

    this.dryGain.connect(this.outGain);
    this.wetGain.connect(this.outGain);
  }

  updateSpeeds() {
    const now = this.ctx.currentTime;
    let hornHz = 6.8;
    let drumHz = 5.9;
    if (this.speed === 'slow') {
      hornHz = 0.8;
      drumHz = 0.7;
    } else if (this.speed === 'brake') {
      hornHz = 0.001;
      drumHz = 0.001;
    }
    this.lfoHorn.frequency.setTargetAtTime(hornHz, now, 0.1);
    this.lfoDrum.frequency.setTargetAtTime(drumHz, now, 0.1);
    this.lfoHornGain.gain.setTargetAtTime(0.003 * this.depth, now, 0.05);
    this.lfoDrumGain.gain.setTargetAtTime(0.002 * this.depth, now, 0.05);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'speed') {
      this.speed = val;
      this.updateSpeeds();
    } else if (name === 'depth') {
      this.depth = Math.max(0, Math.min(1, val));
      this.updateSpeeds();
    } else if (name === 'crossover') {
      const c = Math.max(400, Math.min(1200, val));
      this.crossover.frequency.setTargetAtTime(c, now, 0.02);
      this.hornFilter.frequency.setTargetAtTime(c, now, 0.02);
    } else if (name === 'mix') {
      const m = Math.max(0, Math.min(1, val));
      this.wetGain.gain.setTargetAtTime(m, now, 0.02);
      this.dryGain.gain.setTargetAtTime(1 - m, now, 0.02);
    }
  }

  getJackOutputNode(jack) { return this.outGain; }
  getJackInputNode(jack) { return this.inputNode; }

  dispose() {
    try {
      this.lfoHorn.stop();
      this.lfoDrum.stop();
      this.inputNode.disconnect();
      this.crossover.disconnect();
      this.hornFilter.disconnect();
      this.drumDelay.disconnect();
      this.hornDelay.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 39. Portastudio 4-Track Cassette Tape Warmer Module
// ---------------------------------------------------------------------------
class TapeWarmerModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'tape_warmer';

    this.inputNode = ctx.createGain();
    this.shaper = ctx.createWaveShaper();
    this.lowShelf = ctx.createBiquadFilter();
    this.highShelf = ctx.createBiquadFilter();
    this.flutterDelay = ctx.createDelay();
    this.flutterDelay.delayTime.setValueAtTime(0.02, ctx.currentTime);

    this.wowOsc = ctx.createOscillator();
    this.wowGain = ctx.createGain();
    this.wowOsc.frequency.setValueAtTime(0.5, ctx.currentTime);
    this.wowGain.gain.setValueAtTime(0.0015, ctx.currentTime);
    this.wowOsc.connect(this.wowGain);
    this.wowGain.connect(this.flutterDelay.delayTime);
    this.wowOsc.start();

    this.hissGain = ctx.createGain();
    this.hissGain.gain.setValueAtTime(params.hiss !== undefined ? params.hiss : 0.04, ctx.currentTime);
    this.initHiss();

    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.setValueAtTime(180, ctx.currentTime);
    this.lowShelf.gain.setValueAtTime(3.5, ctx.currentTime);

    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.setValueAtTime(7500, ctx.currentTime);
    this.highShelf.gain.setValueAtTime(-4.0, ctx.currentTime);

    this.saturation = params.saturation || 2.4;
    this.updateCurve();

    this.outGain = ctx.createGain();

    this.inputNode.connect(this.shaper);
    this.shaper.connect(this.lowShelf);
    this.lowShelf.connect(this.highShelf);
    this.highShelf.connect(this.flutterDelay);
    this.flutterDelay.connect(this.outGain);
    this.hissGain.connect(this.outGain);
  }

  initHiss() {
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, rate * 2, rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.05;
    }
    this.hissSource = this.ctx.createBufferSource();
    this.hissSource.buffer = buf;
    this.hissSource.loop = true;
    this.hissSource.connect(this.hissGain);
    this.hissSource.start();
  }

  updateCurve() {
    const n = 1024;
    const curve = new Float32Array(n);
    const k = this.saturation * 2;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    this.shaper.curve = curve;
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'saturation') {
      this.saturation = Math.max(1, Math.min(5, val));
      this.updateCurve();
    } else if (name === 'warmth') {
      const w = Math.max(0, Math.min(1, val));
      this.lowShelf.gain.setTargetAtTime(w * 6, now, 0.02);
      this.highShelf.gain.setTargetAtTime(-w * 8, now, 0.02);
    } else if (name === 'wow') {
      const w = Math.max(0, Math.min(1, val));
      this.wowGain.gain.setTargetAtTime(0.003 * w, now, 0.02);
    } else if (name === 'hiss') {
      this.hissGain.gain.setTargetAtTime(Math.max(0, Math.min(0.3, val)), now, 0.02);
    }
  }

  getJackOutputNode(jack) { return this.outGain; }
  getJackInputNode(jack) { return this.inputNode; }

  dispose() {
    try {
      this.wowOsc.stop();
      if (this.hissSource) this.hissSource.stop();
      this.inputNode.disconnect();
      this.shaper.disconnect();
      this.flutterDelay.disconnect();
      this.hissGain.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 40. Sub-Bass Frequency Divider Module
// ---------------------------------------------------------------------------
class SubHarmonicModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'sub_harmonic';

    this.inputNode = ctx.createGain();
    this.sub1Osc = ctx.createOscillator();
    this.sub2Osc = ctx.createOscillator();
    this.sub1Gain = ctx.createGain();
    this.sub2Gain = ctx.createGain();
    this.lowFilter = ctx.createBiquadFilter();
    this.outGain = ctx.createGain();

    this.sub1Osc.type = 'sine';
    this.sub2Osc.type = 'sine';
    this.sub1Osc.frequency.setValueAtTime(55, ctx.currentTime);
    this.sub2Osc.frequency.setValueAtTime(27.5, ctx.currentTime);

    this.sub1Gain.gain.setValueAtTime(params.sub1 !== undefined ? params.sub1 : 0.7, ctx.currentTime);
    this.sub2Gain.gain.setValueAtTime(params.sub2 !== undefined ? params.sub2 : 0.45, ctx.currentTime);

    this.lowFilter.type = 'lowpass';
    this.lowFilter.frequency.setValueAtTime(140, ctx.currentTime);

    this.sub1Osc.connect(this.sub1Gain);
    this.sub2Osc.connect(this.sub2Gain);
    this.sub1Gain.connect(this.lowFilter);
    this.sub2Gain.connect(this.lowFilter);
    this.lowFilter.connect(this.outGain);
    this.inputNode.connect(this.outGain);

    this.sub1Osc.start();
    this.sub2Osc.start();
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'sub1') {
      this.sub1Gain.gain.setTargetAtTime(Math.max(0, Math.min(1, val)), now, 0.02);
    } else if (name === 'sub2') {
      this.sub2Gain.gain.setTargetAtTime(Math.max(0, Math.min(1, val)), now, 0.02);
    } else if (name === 'lowCut') {
      this.lowFilter.frequency.setTargetAtTime(Math.max(40, Math.min(250, val * 2)), now, 0.02);
    }
  }

  getJackOutputNode(jack) { return this.outGain; }
  getJackInputNode(jack) { return this.inputNode; }

  dispose() {
    try {
      this.sub1Osc.stop();
      this.sub2Osc.stop();
      this.sub1Osc.disconnect();
      this.sub2Osc.disconnect();
      this.lowFilter.disconnect();
      this.inputNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 41. Equal-Power A/B Crossfader Module
// ---------------------------------------------------------------------------
class CrossfaderModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'crossfader';

    this.inA = ctx.createGain();
    this.inB = ctx.createGain();
    this.gainA = ctx.createGain();
    this.gainB = ctx.createGain();
    this.outGain = ctx.createGain();

    this.fade = params.fade !== undefined ? params.fade : 0.5;
    this.curve = params.curve || 'equal_power';

    this.inA.connect(this.gainA);
    this.inB.connect(this.gainB);
    this.gainA.connect(this.outGain);
    this.gainB.connect(this.outGain);

    this.updateGains();
  }

  updateGains() {
    const now = this.ctx.currentTime;
    let gA = 1.0;
    let gB = 0.0;
    if (this.curve === 'equal_power') {
      gA = Math.cos(this.fade * Math.PI * 0.5);
      gB = Math.sin(this.fade * Math.PI * 0.5);
    } else if (this.curve === 'linear') {
      gA = 1.0 - this.fade;
      gB = this.fade;
    } else {
      gA = this.fade < 0.5 ? 1.0 : 0.0;
      gB = this.fade >= 0.5 ? 1.0 : 0.0;
    }
    this.gainA.gain.setTargetAtTime(gA, now, 0.02);
    this.gainB.gain.setTargetAtTime(gB, now, 0.02);
  }

  setParam(name, val) {
    if (name === 'fade') {
      this.fade = Math.max(0, Math.min(1, val));
      this.updateGains();
    } else if (name === 'curve') {
      this.curve = val;
      this.updateGains();
    }
  }

  getJackOutputNode(jack) { return this.outGain; }
  getJackInputNode(jack) { return jack === 'inB' ? this.inB : this.inA; }

  dispose() {
    try {
      this.inA.disconnect();
      this.inB.disconnect();
      this.gainA.disconnect();
      this.gainB.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 42. Quad 4-Phase Morphing LFO Module
// ---------------------------------------------------------------------------
class QuadLfoModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'quad_lfo';

    this.outGain = ctx.createGain();
    this.rate = params.rate || 1.2;
    this.shape = params.shape || 'sine';
    this.level = params.level !== undefined ? params.level : 0.8;

    this.osc1 = ctx.createOscillator();
    this.osc2 = ctx.createOscillator();
    this.gain1 = ctx.createGain();
    this.gain2 = ctx.createGain();

    this.osc1.type = this.shape;
    this.osc2.type = 'triangle';
    this.osc1.frequency.setValueAtTime(this.rate, ctx.currentTime);
    this.osc2.frequency.setValueAtTime(this.rate * 1.5, ctx.currentTime);

    this.gain1.gain.setValueAtTime(this.level * 0.3, ctx.currentTime);
    this.gain2.gain.setValueAtTime(this.level * 0.2, ctx.currentTime);

    this.osc1.connect(this.gain1);
    this.osc2.connect(this.gain2);
    this.gain1.connect(this.outGain);
    this.gain2.connect(this.outGain);

    this.osc1.start();
    this.osc2.start();
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'rate') {
      this.rate = Math.max(0.05, Math.min(20, val));
      this.osc1.frequency.setTargetAtTime(this.rate, now, 0.02);
      this.osc2.frequency.setTargetAtTime(this.rate * 1.5, now, 0.02);
    } else if (name === 'shape') {
      this.shape = val;
      this.osc1.type = this.shape;
    } else if (name === 'level') {
      this.level = Math.max(0, Math.min(1, val));
      this.gain1.gain.setTargetAtTime(this.level * 0.3, now, 0.02);
      this.gain2.gain.setTargetAtTime(this.level * 0.2, now, 0.02);
    }
  }

  getJackOutputNode(jack) { return this.outGain; }
  getJackInputNode(jack) { return null; }

  dispose() {
    try {
      this.osc1.stop();
      this.osc2.stop();
      this.osc1.disconnect();
      this.osc2.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 43. Multi-Track MIDI File Player Module
class MidiPlayerModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'midi_player';
    this.rate = params.rate !== undefined ? parseFloat(params.rate) : 1.0;
    this.transpose = params.transpose !== undefined ? parseInt(params.transpose) : 0;
    this.level = params.level !== undefined ? parseFloat(params.level) : 0.8;
    this.timbre = params.timbre || 'analog_saw';

    // Master Audio Out
    this.outGain = ctx.createGain();
    this.outGain.gain.setValueAtTime(this.level, ctx.currentTime);

    // CV Pitch out (Frequency in Hz)
    this.pitchNode = ctx.createConstantSource();
    this.pitchNode.offset.setValueAtTime(440, ctx.currentTime);
    this.pitchNode.start();

    // CV Gate out (0.0 or 1.0)
    this.gateNode = ctx.createConstantSource();
    this.gateNode.offset.setValueAtTime(0, ctx.currentTime);
    this.gateNode.start();

    // CV Velocity out (0.0 to 1.0)
    this.velNode = ctx.createConstantSource();
    this.velNode.offset.setValueAtTime(0, ctx.currentTime);
    this.velNode.start();

    this.midiData = null;
    this.fileName = '';
    this.isPlaying = true;
    this.isLooping = true;
    this.currentTime = 0; // Virtual song time in seconds
    this.lastAudioTime = ctx.currentTime;
    this.activeVoices = [];
    this.scheduledNotes = new Set();
    this.onProgressUpdate = null; // UI callback

    // Scheduler tick (every 25ms)
    this.intervalId = setInterval(() => this.scheduleTick(), 25);
  }

  loadMidi(parsedData, fileName = '') {
    this.midiData = parsedData;
    this.fileName = fileName || parsedData.title || 'Loaded MIDI';
    this.currentTime = 0;
    this.scheduledNotes.clear();
    this.lastAudioTime = this.ctx.currentTime;
    this.silenceActiveVoices();
    if (this.onProgressUpdate) {
      this.onProgressUpdate({
        currentTime: 0,
        totalDuration: this.midiData.duration || 1.0,
        tracks: this.midiData.tracks,
        activeTrackIds: new Set(),
      });
    }
  }

  resetClock(now) {
    this.currentTime = 0;
    this.scheduledNotes.clear();
    this.lastAudioTime = now || this.ctx.currentTime;
    this.silenceActiveVoices();
  }

  silenceActiveVoices() {
    const now = this.ctx.currentTime;
    for (const v of this.activeVoices) {
      try {
        if (v.gain) v.gain.gain.setValueAtTime(0, now);
        if (v.osc) v.osc.stop(now + 0.01);
      } catch (e) {}
    }
    this.activeVoices = [];
    if (this.gateNode) this.gateNode.offset.setValueAtTime(0, now);
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    if (!this.isPlaying) {
      this.silenceActiveVoices();
    } else {
      this.lastAudioTime = this.ctx.currentTime;
    }
    return this.isPlaying;
  }

  rewind() {
    this.currentTime = 0;
    this.scheduledNotes.clear();
    this.silenceActiveVoices();
  }

  toggleLoop() {
    this.isLooping = !this.isLooping;
    return this.isLooping;
  }

  toggleTrackMute(trackId) {
    if (!this.midiData) return;
    const track = this.midiData.tracks.find(t => t.id === trackId);
    if (track) {
      track.muted = !track.muted;
    }
  }

  toggleTrackSolo(trackId) {
    if (!this.midiData) return;
    const track = this.midiData.tracks.find(t => t.id === trackId);
    if (track) {
      track.solo = !track.solo;
    }
  }

  isolateTrack(trackId) {
    if (!this.midiData || !this.midiData.tracks) return;
    for (const track of this.midiData.tracks) {
      track.muted = (track.id !== trackId);
      track.solo = false;
    }
    this.scheduledNotes.clear();
    this.silenceActiveVoices();
  }


  scheduleTick() {
    if (!this.midiData || !this.isPlaying || !this.midiData.tracks || !this.midiData.tracks.length) return;

    const audioNow = this.ctx.currentTime;
    const deltaReal = audioNow - this.lastAudioTime;
    this.lastAudioTime = audioNow;

    this.currentTime += deltaReal * this.rate;
    const totalDur = this.midiData.duration || 1.0;

    if (this.currentTime >= totalDur) {
      if (this.isLooping) {
        this.currentTime = this.currentTime % totalDur;
        this.scheduledNotes.clear();
      } else {
        this.isPlaying = false;
        this.silenceActiveVoices();
        return;
      }
    }

    const lookahead = 0.12 * this.rate;
    const windowStart = Math.max(0, this.currentTime);
    const windowEnd = windowStart + lookahead;

    const hasSolo = this.midiData.tracks.some(t => t.solo);
    const activeTrackIds = new Set();

    for (const track of this.midiData.tracks) {
      if (track.muted) continue;
      if (hasSolo && !track.solo) continue;

      for (const note of track.notes) {
        if (note.start >= windowStart && note.start < windowEnd) {
          const noteKey = `${track.id}_${note.note}_${note.start.toFixed(4)}`;
          if (this.scheduledNotes.has(noteKey)) continue;
          this.scheduledNotes.add(noteKey);

          const delaySec = Math.max(0, (note.start - windowStart) / Math.max(0.1, this.rate));
          const startAudioTime = audioNow + delaySec;
          const noteDur = Math.max(0.04, note.duration / Math.max(0.1, this.rate));

          activeTrackIds.add(track.id);
          this.triggerNote(track, note, startAudioTime, noteDur);
        }
      }
    }

    // Retain only voices that are still playing
    this.activeVoices = this.activeVoices.filter(v => v.stopTime > audioNow);

    if (this.onProgressUpdate) {
      this.onProgressUpdate({
        currentTime: this.currentTime,
        totalDuration: totalDur,
        tracks: this.midiData.tracks,
        activeTrackIds,
      });
    }
  }

  triggerNote(track, note, startTime, duration) {
    const midiPitch = Math.max(12, Math.min(127, note.note + this.transpose));
    const freq = 440 * Math.pow(2, (midiPitch - 69) / 12);
    const velNormalized = Math.max(0.1, Math.min(1.0, (note.velocity || 90) / 127));

    // Update CV Pitch & Gate
    const stopTime = startTime + duration;
    this.pitchNode.offset.setValueAtTime(freq, startTime);
    this.gateNode.offset.setValueAtTime(1.0, startTime);
    this.gateNode.offset.setValueAtTime(0.0, stopTime);
    this.velNode.offset.setValueAtTime(velNormalized, startTime);

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    const noteGain = velNormalized * 0.22;

    switch (this.timbre) {
      case 'poly_epiano': {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        env.gain.setValueAtTime(0, startTime);
        env.gain.linearRampToValueAtTime(noteGain, startTime + 0.008);
        env.gain.exponentialRampToValueAtTime(0.001, stopTime + 0.12);
        break;
      }
      case 'chiptune': {
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, startTime);
        env.gain.setValueAtTime(noteGain * 0.7, startTime);
        env.gain.setValueAtTime(0, stopTime);
        break;
      }
      case 'fm_bell': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        const mod = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        mod.type = 'sine';
        mod.frequency.setValueAtTime(freq * 2.0, startTime);
        modGain.gain.setValueAtTime(freq * 1.5, startTime);
        modGain.gain.exponentialRampToValueAtTime(1, stopTime);
        mod.connect(modGain);
        modGain.connect(osc.frequency);
        mod.start(startTime);
        mod.stop(stopTime + 0.15);
        env.gain.setValueAtTime(noteGain, startTime);
        env.gain.exponentialRampToValueAtTime(0.001, stopTime + 0.15);
        break;
      }
      case 'sine_sub': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        env.gain.setValueAtTime(0, startTime);
        env.gain.linearRampToValueAtTime(noteGain * 1.1, startTime + 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, stopTime + 0.06);
        break;
      }
      case 'analog_saw':
      default: {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(9000, freq * 4), startTime);
        filter.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.5), stopTime);
        osc.connect(filter);
        filter.connect(env);
        env.gain.setValueAtTime(0, startTime);
        env.gain.linearRampToValueAtTime(noteGain * 0.8, startTime + 0.006);
        env.gain.exponentialRampToValueAtTime(0.001, stopTime + 0.05);
        osc.start(startTime);
        osc.stop(stopTime + 0.1);
        env.connect(this.outGain);
        this.activeVoices.push({ osc, gain: env, stopTime: stopTime + 0.1 });
        return;
      }
    }

    osc.connect(env);
    env.connect(this.outGain);
    osc.start(startTime);
    osc.stop(stopTime + 0.2);
    this.activeVoices.push({ osc, gain: env, stopTime: stopTime + 0.2 });
  }

  setParam(name, val) {
    if (name === 'rate') {
      this.rate = Math.max(0.1, Math.min(4.0, parseFloat(val)));
    } else if (name === 'transpose') {
      this.transpose = parseInt(val) || 0;
    } else if (name === 'level') {
      this.level = Math.max(0, Math.min(1, parseFloat(val)));
      this.outGain.gain.setTargetAtTime(this.level, this.ctx.currentTime, 0.02);
    } else if (name === 'timbre') {
      this.timbre = val;
    }
  }

  getJackOutputNode(jack) {
    if (jack === 'pitch') return this.pitchNode;
    if (jack === 'gate') return this.gateNode;
    if (jack === 'vel') return this.velNode;
    return this.outGain;
  }

  getJackInputNode(jack) {
    return null;
  }

  dispose() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.silenceActiveVoices();
    try {
      this.pitchNode.stop();
      this.gateNode.stop();
      this.velNode.stop();
      this.pitchNode.disconnect();
      this.gateNode.disconnect();
      this.velNode.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

window.DspEngine = DspEngine;




