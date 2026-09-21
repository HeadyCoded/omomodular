/**
 * OmoModular Web Audio DSP Engine
 * Real-time synthesis, analog modeling, and dynamic patch routing.
 */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Self-correcting setTimeout scheduler for the step sequencers below. Plain
 * `setTimeout(fn, interval)` chains drift because each call computes the
 * next delay from "now" at fire time, which accumulates jitter; this instead
 * tracks a fixed next-tick audio-clock target and schedules relative to it,
 * so independent sequencers don't slowly drift apart. Falls back to a fresh
 * `now + interval` target if the module hasn't ticked in over an interval
 * (freshly started, or after resetClock()/a pause), so SYNC stays instant.
 */
function scheduleNextTick(mod, fn, intervalMs) {
  const now = mod.ctx.currentTime;
  const intervalSec = Math.max(0.001, intervalMs / 1000);
  if (mod._nextTickTime == null || mod._nextTickTime < now - intervalSec) {
    mod._nextTickTime = now + intervalSec;
  } else {
    mod._nextTickTime += intervalSec;
  }
  const delayMs = Math.max(0, (mod._nextTickTime - now) * 1000);
  mod.timer = setTimeout(fn, delayMs);
}

/**
 * Creates dry/wet gain nodes wired the way most modules here do it by hand:
 * inputNode -> dryGain -> outputNode, wetGain -> outputNode, with gains set
 * from `mix` (0 = fully dry, 1 = fully wet). The caller still connects its
 * own wet-processing chain between inputNode and the returned wetGain.
 */
function wireDryWet(ctx, inputNode, outputNode, mix) {
  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  dryGain.gain.setValueAtTime(1.0 - mix, ctx.currentTime);
  wetGain.gain.setValueAtTime(mix, ctx.currentTime);
  inputNode.connect(dryGain);
  dryGain.connect(outputNode);
  wetGain.connect(outputNode);
  return { dryGain, wetGain };
}

class DspEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.masterLimiter = null;
    this.analyser = null;
    this.modules = new Map();
    this.activeCables = [];
    this.masterBpm = 120;
    this.snapRatio = 1.0;
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
    const clamped = clamp(val, 0, 1.2);
    this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.02);
  }

  setMasterBpm(bpm) {
    this.masterBpm = clamp(Math.round(bpm), 30, 260);
    return this.masterBpm;
  }

  setSnapRatio(ratio) {
    this.snapRatio = ratio;
    return this.snapRatio;
  }

  snapModuleBpm(modId, targetBpm = null, ratio = 1.0) {
    const mod = this.modules.get(modId);
    if (!mod) return null;

    let baseBpm = (targetBpm !== null) ? targetBpm : this.masterBpm;
    let effRatio = typeof ratio === 'number' ? ratio : (parseFloat(ratio) || 1.0);

    if (mod.type === 'percussion' || mod.type === 'acid303' || mod.type === 'sequencer' || mod.type === 'amen_slicer' || mod.type === 'quad_euclid' || mod.type === 'tr_matrix_seq') {
      const calculatedBpm = clamp(Math.round(baseBpm * effRatio), 30, 240);
      mod.setParam('bpm', calculatedBpm);
      return { type: 'bpm', value: calculatedBpm };
    } else if (mod.type === 'midi_player') {
      const midiBpm = (mod.midiData && mod.midiData.bpm) ? mod.midiData.bpm : baseBpm;
      const calculatedRate = clamp((baseBpm / midiBpm) * effRatio, 0.1, 4.0);
      mod.setParam('rate', calculatedRate);
      return { type: 'rate', value: calculatedRate };
    }
    return null;
  }

  snapAllBpm(targetBpm = null, ratio = '1', resyncPhase = true) {
    this.ensureContext();
    let baseBpm = (targetBpm !== null && targetBpm !== 'from_midi') ? targetBpm : this.masterBpm;
    let effRatio = ratio;

    if (effRatio === 'from_midi' || targetBpm === 'from_midi') {
      for (const [id, mod] of this.modules.entries()) {
        if (mod.type === 'midi_player' && mod.midiData && mod.midiData.bpm) {
          baseBpm = mod.midiData.bpm;
          this.masterBpm = baseBpm;
          effRatio = '1';
          break;
        }
      }
      if (effRatio === 'from_midi') effRatio = '1';
    }

    const numRatio = parseFloat(effRatio) || 1.0;
    const snapped = [];

    for (const [id, mod] of this.modules.entries()) {
      const res = this.snapModuleBpm(id, baseBpm, numRatio);
      if (res) {
        snapped.push({ id, type: mod.type, param: res.type, value: res.value });
      }
    }

    if (resyncPhase) {
      this.syncDownbeat();
    }

    return { masterBpm: baseBpm, ratio: numRatio, snapped };
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
      case 'sample_player':
        mod = new SamplePlayerModule(this.ctx, id, params);
        break;
      case 'macro_percussion':
        mod = new MacroPercussionModule(this.ctx, id, params);
        break;
      case 'amen_slicer':
        mod = new AmenSlicerModule(this.ctx, id, params);
        break;
      case 'quad_euclid':
        mod = new QuadEuclidModule(this.ctx, id, params);
        break;
      case 'stochastic_vault':
        mod = new StochasticVaultModule(this.ctx, id, params);
        break;
      case 'wavetable_dual':
        mod = new DualWavetableModule(this.ctx, id, params);
        break;
      case 'sidechain_vca':
        mod = new SidechainVcaModule(this.ctx, id, params);
        break;
      case 'tr_matrix_seq':
        mod = new TrMatrixSeqModule(this.ctx, id, params);
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
      if (typeof toMod.onConnectJack === 'function') {
        toMod.onConnectJack(toJack, fromMod, fromJack);
      }
      if (typeof fromMod.onConnectOutputJack === 'function') {
        fromMod.onConnectOutputJack(fromJack, toMod, toJack);
      }
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
    if (typeof toMod.onDisconnectJack === 'function') {
      toMod.onDisconnectJack(toJack, fromMod, fromJack);
    }
    if (typeof fromMod.onDisconnectOutputJack === 'function') {
      fromMod.onDisconnectOutputJack(fromJack, toMod, toJack);
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
      const f = clamp(val, 10, 2000);
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
      this.subGain.gain.setTargetAtTime(clamp(val, 0, 1), now, 0.02);
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
      this.outGain.gain.setTargetAtTime(clamp(val, 0, 1.0), now, 0.02);
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
      const f = clamp(val, 20, 18000);
      this.filter1.frequency.setTargetAtTime(f, now, 0.02);
      this.filter2.frequency.setTargetAtTime(f, now, 0.02);
    } else if (name === 'resonance') {
      const q = clamp(val, 0.1, 25);
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
      this.folds = clamp(val, 0.5, 8.0);
      this.updateCurve();
    } else if (name === 'drive') {
      this.drive = clamp(val, 0.5, 6.0);
      this.updateCurve();
    } else if (name === 'mix') {
      const m = clamp(val, 0, 1);
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
      this.bits = clamp(Math.round(val), 2, 16);
    } else if (name === 'rateReduction') {
      this.rateReduction = clamp(Math.round(val), 1, 32);
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
      const sec = clamp(val / 1000.0, 0.01, 2.5);
      this.delayNode.delayTime.setTargetAtTime(sec, now, 0.04);
    } else if (name === 'feedback') {
      const fb = clamp(val, 0, 0.95);
      this.feedbackNode.gain.setTargetAtTime(fb, now, 0.02);
    } else if (name === 'damping') {
      const d = clamp(val, 200, 16000);
      this.dampingFilter.frequency.setTargetAtTime(d, now, 0.02);
    } else if (name === 'flutter') {
      this.flutterGain.gain.setTargetAtTime(Math.max(0, val) * 0.003, now, 0.02);
    } else if (name === 'mix') {
      const m = clamp(val, 0, 1);
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
    this.outGain = ctx.createGain();

    this.convolver = ctx.createConvolver();
    this.decay = params.decay || 5.0;
    this.generateImpulseResponse(this.decay);

    const mix = params.mix !== undefined ? params.mix : 0.6;
    const { dryGain, wetGain } = wireDryWet(ctx, this.inputNode, this.outGain, mix);
    this.dryGain = dryGain;
    this.wetGain = wetGain;

    this.inputNode.connect(this.convolver);
    this.convolver.connect(this.wetGain);
  }

  generateImpulseResponse(duration) {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * clamp(duration, 0.5, 12.0));
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
      this.decay = clamp(val, 0.5, 12.0);
      // generateImpulseResponse resynthesizes a multi-second buffer on the
      // main thread; debounce so a knob drag doesn't fire it on every tick.
      clearTimeout(this._irDebounce);
      this._irDebounce = setTimeout(() => this.generateImpulseResponse(this.decay), 100);
    } else if (name === 'mix') {
      const m = clamp(val, 0, 1);
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
    clearTimeout(this._irDebounce);
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
    this.channelCount = 8;

    this.channels = [];
    for (let i = 1; i <= this.channelCount; i++) {
      const input = ctx.createGain();
      const panner = ctx.createStereoPanner();
      const gain = ctx.createGain();

      const gVal = params[`ch${i}_gain`] !== undefined ? params[`ch${i}_gain`] : (i <= 2 ? 0.85 : 0.0);
      const pVal = params[`ch${i}_pan`] !== undefined ? params[`ch${i}_pan`] : 0.0;
      const isMuted = !!params[`ch${i}_mute`];
      const isSolo = !!params[`ch${i}_solo`];

      gain.gain.setValueAtTime(isMuted ? 0 : gVal, ctx.currentTime);
      panner.pan.setValueAtTime(pVal, ctx.currentTime);

      input.connect(panner);
      panner.connect(gain);
      gain.connect(this.masterBus);

      this.channels.push({
        input,
        panner,
        gain,
        gainVal: gVal,
        panVal: pVal,
        muted: isMuted,
        solo: isSolo
      });
    }
    this.updateGains();
  }

  updateGains() {
    const now = this.ctx.currentTime;
    const hasSolo = this.channels.some(ch => ch.solo);
    for (const ch of this.channels) {
      let targetGain = 0;
      if (hasSolo) {
        targetGain = (ch.solo && !ch.muted) ? ch.gainVal : 0;
      } else {
        targetGain = !ch.muted ? ch.gainVal : 0;
      }
      ch.gain.gain.cancelScheduledValues(now);
      ch.gain.gain.setTargetAtTime(targetGain, now, 0.015);
    }
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    for (let i = 1; i <= this.channelCount; i++) {
      if (name === `ch${i}_gain`) {
        const clamped = clamp(parseFloat(val) || 0, 0, 1.5);
        this.channels[i - 1].gainVal = clamped;
        this.updateGains();
        return;
      } else if (name === `ch${i}_pan`) {
        const clamped = clamp(parseFloat(val) || 0, -1, 1);
        this.channels[i - 1].panVal = clamped;
        this.channels[i - 1].panner.pan.setTargetAtTime(clamped, now, 0.02);
        return;
      } else if (name === `ch${i}_mute`) {
        this.channels[i - 1].muted = !!val;
        this.updateGains();
        return;
      } else if (name === `ch${i}_solo`) {
        this.channels[i - 1].solo = !!val;
        this.updateGains();
        return;
      }
    }
  }

  getJackOutputNode(jack) {
    return null;
  }

  getJackInputNode(jack) {
    const match = jack && jack.match(/^in(\d+)$/);
    if (match) {
      const idx = parseInt(match[1], 10) - 1;
      if (idx >= 0 && idx < this.channels.length) {
        return this.channels[idx].input;
      }
    }
    return this.channels[0].input;
  }

  dispose() {
    for (const ch of this.channels) {
      try {
        ch.input.disconnect();
        ch.panner.disconnect();
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
      this.baseFreq = clamp(val, 20, 1000);
      this.updatePitches();
    } else if (name === 'spread') {
      this.spread = clamp(val, 0, 50);
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
      this.subGain.gain.setTargetAtTime(clamp(val, 0, 1), now, 0.02);
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
      const grainDur = clamp(this.grainSize, 0.02, 0.4);
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
      this.grainSize = clamp(val, 0.02, 0.4);
    } else if (name === 'density') {
      this.density = clamp(val, 1, 30);
    } else if (name === 'pitchSpray') {
      this.pitchSpray = clamp(val, 0, 1.0);
    } else if (name === 'mix') {
      const m = clamp(val, 0, 1);
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
      this.freq = clamp(val, 25, 1200);
      this.delayNode.delayTime.setTargetAtTime(1.0 / this.freq, now, 0.02);
    } else if (name === 'decay') {
      const fb = clamp(val, 0.5, 0.995);
      this.feedbackNode.gain.setTargetAtTime(fb, now, 0.02);
    } else if (name === 'damping') {
      const d = clamp(val, 200, 14000);
      this.dampFilter.frequency.setTargetAtTime(d, now, 0.02);
    } else if (name === 'mix') {
      const m = clamp(val, 0, 1);
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
    const clamped = clamp(this.vowelVal, 1, 5);
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
      this.q = clamp(val, 1.0, 25.0);
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
      const r = clamp(val, 0.05, 8.0);
      this.lfoL.frequency.setTargetAtTime(r, now, 0.02);
      this.lfoR.frequency.setTargetAtTime(r, now, 0.02);
    } else if (name === 'depth') {
      const d = clamp(val, 0, 1.0);
      this.gainL.gain.setTargetAtTime(d * 0.006, now, 0.02);
      this.gainR.gain.setTargetAtTime(d * 0.006, now, 0.02);
    } else if (name === 'mix') {
      const m = clamp(val, 0, 1);
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
      this.lfo.frequency.setTargetAtTime(clamp(val, 0.05, 6.0), now, 0.02);
    } else if (name === 'depth') {
      this.lfoGain.gain.setTargetAtTime(clamp(val, 0, 1.0) * 700, now, 0.02);
    } else if (name === 'feedback') {
      this.feedback.gain.setTargetAtTime(clamp(val, 0, 0.9), now, 0.02);
    } else if (name === 'mix') {
      const m = clamp(val, 0, 1);
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
      const f = clamp(val, 1.0, 2500.0);
      this.carrier.frequency.setTargetAtTime(f, now, 0.02);
    } else if (name === 'shape') {
      this.carrier.type = val;
    } else if (name === 'mix') {
      const m = clamp(val, 0, 1);
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
      this.lfo.frequency.setTargetAtTime(clamp(val, 0.1, 15.0), now, 0.02);
    } else if (name === 'depth') {
      this.lfoGain.gain.setTargetAtTime(clamp(val, 0, 1.0), now, 0.02);
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
      this.freq = clamp(val, 20, 1200);
      this.osc.frequency.setTargetAtTime(this.freq, now, 0.02);
      this.subOsc.frequency.setTargetAtTime(this.freq / 2, now, 0.02);
    } else if (name === 'table') {
      this.tableType = val;
      this.updateWave();
    } else if (name === 'subLevel') {
      this.subGain.gain.setTargetAtTime(clamp(val, 0, 1), now, 0.02);
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
      this.baseFreq = clamp(val, 20, 1000);
      this.op1.frequency.setTargetAtTime(this.baseFreq, now, 0.02);
      this.op2.frequency.setTargetAtTime(this.baseFreq * this.ratio2, now, 0.02);
      this.op3.frequency.setTargetAtTime(this.baseFreq * this.ratio3, now, 0.02);
    } else if (name === 'ratio2') {
      this.ratio2 = clamp(val, 0.25, 12);
      this.op2.frequency.setTargetAtTime(this.baseFreq * this.ratio2, now, 0.02);
    } else if (name === 'ratio3') {
      this.ratio3 = clamp(val, 0.25, 12);
      this.op3.frequency.setTargetAtTime(this.baseFreq * this.ratio3, now, 0.02);
    } else if (name === 'index') {
      this.depth = clamp(val, 0, 2.0);
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
    scheduleNextTick(this, () => this.runStep(), stepIntervalMs);
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this._nextTickTime = null;
    this.currentStep = 0;
    this.runStep(now || this.ctx.currentTime);
  }

  setParam(name, val) {
    if (name === 'bpm') {
      this.bpm = clamp(Math.round(val), 30, 240);
    } else if (name === 'decay') {
      this.decay = clamp(val, 0.05, 1.2);
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
    scheduleNextTick(this, () => this.runStep(), stepIntervalMs);
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this._nextTickTime = null;
    this.currentStep = 0;
    this.runStep(now || this.ctx.currentTime);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'bpm') {
      this.bpm = clamp(Math.round(val), 30, 240);
    } else if (name === 'cutoff') {
      this.cutoff = clamp(val, 40, 8000);
    } else if (name === 'resonance') {
      this.res = clamp(val, 0.5, 24);
      this.filter.Q.setTargetAtTime(this.res, now, 0.02);
    } else if (name === 'envMod') {
      this.envMod = clamp(val, 0, 1);
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
        this.filters[i].gain.setTargetAtTime(clamp(val, -14, 14), now, 0.02);
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
      this.freq = clamp(val, 30, 1500);
      this.delayNode.delayTime.setTargetAtTime(1.0 / this.freq, now, 0.02);
    } else if (name === 'feedback') {
      this.feedback = clamp(val, 0, 0.98);
      this.fbGain.gain.setTargetAtTime(this.feedback, now, 0.02);
    } else if (name === 'mix') {
      const m = clamp(val, 0, 1);
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
      this.comp.threshold.setTargetAtTime(clamp(val, -50, 0), now, 0.02);
    } else if (name === 'ratio') {
      this.comp.ratio.setTargetAtTime(clamp(val, 1, 20), now, 0.02);
    } else if (name === 'makeup') {
      this.makeup.gain.setTargetAtTime(clamp(val, 0.5, 3.0), now, 0.02);
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
      this.fuzzGain = clamp(val, 1.0, 25.0);
      this.updateFuzzCurve();
    } else if (name === 'tone') {
      this.toneFilter.frequency.setTargetAtTime(clamp(val, 400, 12000), now, 0.02);
    } else if (name === 'mix') {
      const m = clamp(val, 0, 1);
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
    this.outGain = ctx.createGain();

    this.convolver = ctx.createConvolver();
    this.decay = params.decay || 8.0;
    this.generateShimmerImpulse(this.decay);

    const mix = params.mix !== undefined ? params.mix : 0.75;
    const { dryGain, wetGain } = wireDryWet(ctx, this.inputNode, this.outGain, mix);
    this.dryGain = dryGain;
    this.wetGain = wetGain;

    // Subtle pitch harmonic shimmer feed
    this.shimmerOsc = ctx.createOscillator();
    this.shimmerOsc.type = 'sine';
    this.shimmerOsc.frequency.setValueAtTime(880, ctx.currentTime);
    this.shimmerGain = ctx.createGain();
    this.shimmerGain.gain.setValueAtTime(0.08, ctx.currentTime);
    this.shimmerOsc.connect(this.shimmerGain);
    this.shimmerGain.connect(this.wetGain);
    this.shimmerOsc.start();

    this.inputNode.connect(this.convolver);
    this.convolver.connect(this.wetGain);
  }

  generateShimmerImpulse(duration) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * clamp(duration, 1, 14));
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
      this.decay = clamp(val, 1.0, 14.0);
      // generateShimmerImpulse resynthesizes a multi-second buffer on the
      // main thread; debounce so a knob drag doesn't fire it on every tick.
      clearTimeout(this._irDebounce);
      this._irDebounce = setTimeout(() => this.generateShimmerImpulse(this.decay), 100);
    } else if (name === 'mix') {
      const m = clamp(val, 0, 1);
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
    clearTimeout(this._irDebounce);
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
    scheduleNextTick(this, () => this.runClock(), interval);
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this._nextTickTime = null;
    this.currentStep = 0;
    this.runClock(now || this.ctx.currentTime);
  }

  setParam(name, val) {
    if (name === 'bpm') {
      this.bpm = clamp(Math.round(val), 40, 240);
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
    scheduleNextTick(this, () => this.runClock(), stepInterval);
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this._nextTickTime = null;
    this.currentStep = 0;
    this.runClock(now || this.ctx.currentTime);
  }

  setParam(name, val) {
    if (name === 'bpm') this.bpm = clamp(Math.round(val), 40, 240);
    else if (name === 'steps') { this.steps = clamp(Math.round(val), 2, 16); this.calcPattern(); }
    else if (name === 'pulses') { this.pulses = clamp(Math.round(val), 1, 16); this.calcPattern(); }
    else if (name === 'offset') { this.offset = clamp(Math.round(val), 0, 15); this.calcPattern(); }
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
    scheduleNextTick(this, () => this.runClock(), interval);
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this._nextTickTime = null;
    this.runClock(now || this.ctx.currentTime);
  }

  setParam(name, val) {
    if (name === 'rate') this.rate = clamp(val, 0.5, 20);
    else if (name === 'length') this.length = clamp(Math.round(val), 4, 32);
    else if (name === 'lock') this.lock = clamp(val, 0, 1);
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
    scheduleNextTick(this, () => this.runClock(), interval);
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this._nextTickTime = null;
    this.runClock(now || this.ctx.currentTime);
  }

  setParam(name, val) {
    if (name === 'rate') this.rate = clamp(val, 0.5, 30);
    else if (name === 'glide') { this.glide = clamp(val, 0, 0.5); this.updateGlide(); }
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
      scheduleNextTick(this, () => this.triggerEnv(), totalDur);
    }
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this._nextTickTime = null;
    this.triggerEnv(now || this.ctx.currentTime);
  }

  setParam(name, val) {
    if (name === 'attack') this.attack = clamp(val, 1, 2000);
    else if (name === 'decay') this.decay = clamp(val, 10, 3000);
    else if (name === 'sustain') this.sustain = clamp(val, 0, 1);
    else if (name === 'release') this.release = clamp(val, 10, 4000);
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
    scheduleNextTick(this, () => this.runFunction(), totalDur);
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this._nextTickTime = null;
    this.runFunction(now || this.ctx.currentTime);
  }

  setParam(name, val) {
    if (name === 'rise') this.rise = clamp(val, 5, 2000);
    else if (name === 'fall') this.fall = clamp(val, 10, 3000);
    else if (name === 'curve') this.curve = clamp(val, -1, 1);
    else if (name === 'level') this.level = clamp(val, 0, 1);
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
      this.freq = clamp(val, 30, 600);
      for (let i = 0; i < 6; i++) {
        this.oscs[i].frequency.setTargetAtTime(this.freq * (i + 1), now, 0.02);
      }
    } else if (name.startsWith('h')) {
      const idx = parseInt(name.substr(1), 10) - 1;
      if (idx >= 0 && idx < 6) {
        this.hLevels[idx] = clamp(val, 0, 1);
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
    if (name === 'clock') this.clock = clamp(val, 4000, 24000);
    else if (name === 'algo') this.algo = val;
    else if (name === 'p1') this.p1 = clamp(Math.round(val), 1, 32);
    else if (name === 'p2') this.p2 = clamp(Math.round(val), 1, 16);
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
      this.drive = clamp(val, 1, 4);
      this.driveGain.gain.setTargetAtTime(this.drive, now, 0.02);
    } else if (name === 'tension') {
      this.tension = clamp(val, 0.1, 5);
      this.fbGain.gain.setTargetAtTime(Math.min(0.88, 0.3 + this.tension * 0.1), now, 0.02);
    } else if (name === 'damp') {
      this.damp = clamp(val, 1000, 8000);
      this.dampFilter.frequency.setTargetAtTime(this.damp, now, 0.02);
    } else if (name === 'mix') {
      const m = clamp(val, 0, 1);
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
      this.time = clamp(val / 1000, 0.03, 1.0);
      this.delayL.delayTime.setTargetAtTime(this.time, now, 0.03);
      this.delayR.delayTime.setTargetAtTime(this.time * 1.5, now, 0.03);
    } else if (name === 'feedback') {
      this.feedback = clamp(val, 0, 0.95);
      this.fbL.gain.setTargetAtTime(this.feedback, now, 0.02);
      this.fbR.gain.setTargetAtTime(this.feedback, now, 0.02);
    } else if (name === 'spread') {
      this.spread = clamp(val, 0, 1);
      if (this.pannerL) this.pannerL.pan.setTargetAtTime(-this.spread, now, 0.02);
      if (this.pannerR) this.pannerR.pan.setTargetAtTime(this.spread, now, 0.02);
    } else if (name === 'mix') {
      const m = clamp(val, 0, 1);
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
      const c = clamp(val, 40, 12000);
      this.lpFilter.frequency.setTargetAtTime(c, now, 0.02);
      this.hpFilter.frequency.setTargetAtTime(c, now, 0.02);
    } else if (name === 'res') {
      const q = clamp(val, 0.5, 15);
      this.lpFilter.Q.setTargetAtTime(q, now, 0.02);
      this.hpFilter.Q.setTargetAtTime(q, now, 0.02);
    } else if (name === 'morph') {
      this.morph = clamp(val, 0, 1);
      this.updateMorph();
    } else if (name === 'drive') {
      this.driveGain.gain.setTargetAtTime(clamp(val, 1, 3), now, 0.02);
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
      this.depth = clamp(val, 0, 1);
      this.updateSpeeds();
    } else if (name === 'crossover') {
      const c = clamp(val, 400, 1200);
      this.crossover.frequency.setTargetAtTime(c, now, 0.02);
      this.hornFilter.frequency.setTargetAtTime(c, now, 0.02);
    } else if (name === 'mix') {
      const m = clamp(val, 0, 1);
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
      this.saturation = clamp(val, 1, 5);
      this.updateCurve();
    } else if (name === 'warmth') {
      const w = clamp(val, 0, 1);
      this.lowShelf.gain.setTargetAtTime(w * 6, now, 0.02);
      this.highShelf.gain.setTargetAtTime(-w * 8, now, 0.02);
    } else if (name === 'wow') {
      const w = clamp(val, 0, 1);
      this.wowGain.gain.setTargetAtTime(0.003 * w, now, 0.02);
    } else if (name === 'hiss') {
      this.hissGain.gain.setTargetAtTime(clamp(val, 0, 0.3), now, 0.02);
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
      this.sub1Gain.gain.setTargetAtTime(clamp(val, 0, 1), now, 0.02);
    } else if (name === 'sub2') {
      this.sub2Gain.gain.setTargetAtTime(clamp(val, 0, 1), now, 0.02);
    } else if (name === 'lowCut') {
      this.lowFilter.frequency.setTargetAtTime(clamp(val * 2, 40, 250), now, 0.02);
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
      this.fade = clamp(val, 0, 1);
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
      this.rate = clamp(val, 0.05, 20);
      this.osc1.frequency.setTargetAtTime(this.rate, now, 0.02);
      this.osc2.frequency.setTargetAtTime(this.rate * 1.5, now, 0.02);
    } else if (name === 'shape') {
      this.shape = val;
      this.osc1.type = this.shape;
    } else if (name === 'level') {
      this.level = clamp(val, 0, 1);
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
    this.gain = params.gain !== undefined ? parseFloat(params.gain) : 1.8;
    this.level = params.level !== undefined ? parseFloat(params.level) : 1.0;
    this.timbre = params.timbre || 'analog_saw';

    // Master Audio Out with soft-clip saturation for warm analog punch and anti-clipping headroom
    this.outGain = ctx.createGain();
    this.outGain.gain.setValueAtTime(this.level, ctx.currentTime);

    this.saturator = ctx.createWaveShaper();
    const curve = new Float32Array(512);
    for (let i = 0; i < 512; ++i) {
      const x = (i * 2) / 512 - 1;
      curve[i] = Math.tanh(x * 1.3) / Math.tanh(1.3);
    }
    this.saturator.curve = curve;
    this.saturator.oversample = '2x';
    this.saturator.connect(this.outGain);

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
    this.loopCycle = 0;
    this.loopSnap = params.loop_snap || 'auto';
    this.totalDuration = 1.0;
    this.onProgressUpdate = null; // UI callback

    // Scheduler tick (every 25ms)
    this.intervalId = setInterval(() => this.scheduleTick(), 25);
  }

  loadMidi(parsedData, fileName = '') {
    this.midiData = parsedData;
    this.fileName = fileName || parsedData.title || 'Loaded MIDI';
    this.currentTime = 0;
    this.loopCycle = 0;
    this.scheduledNotes.clear();
    this.computeLoopDuration();
    this.lastAudioTime = this.ctx.currentTime;
    this.silenceActiveVoices();
    if (this.onProgressUpdate) {
      this.onProgressUpdate({
        currentTime: 0,
        totalDuration: this.totalDuration,
        tracks: this.midiData.tracks,
        activeTrackIds: new Set(),
      });
    }
  }

  resetClock(now) {
    this.currentTime = 0;
    this.loopCycle = 0;
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
    this.loopCycle = 0;
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
      this.computeLoopDuration();
    }
  }

  toggleTrackSolo(trackId) {
    if (!this.midiData) return;
    const track = this.midiData.tracks.find(t => t.id === trackId);
    if (track) {
      track.solo = !track.solo;
      this.computeLoopDuration();
    }
  }

  isolateTrack(trackId) {
    if (!this.midiData || !this.midiData.tracks) return;
    for (const track of this.midiData.tracks) {
      track.muted = (track.id !== trackId);
      track.solo = false;
    }
    this.computeLoopDuration();
    this.scheduledNotes.clear();
    this.silenceActiveVoices();
  }

  setTrackVolume(trackId, volume) {
    if (!this.midiData || !this.midiData.tracks) return;
    const track = this.midiData.tracks.find(t => t.id === trackId);
    if (track) {
      track.volume = clamp(parseFloat(volume), 0, 3.0);
    }
  }

  setLoopSnap(mode) {
    this.loopSnap = mode;
    this.computeLoopDuration();
  }

  computeLoopDuration() {
    if (!this.midiData || !this.midiData.tracks || !this.midiData.tracks.length) {
      this.totalDuration = 1.0;
      return;
    }
    const bpm = this.midiData.bpm || 120;
    const beatSec = 60 / bpm;
    const barSec = beatSec * 4;

    const hasSolo = this.midiData.tracks.some(t => t.solo);
    let minStart = Infinity;
    let maxEnd = 0;

    for (const t of this.midiData.tracks) {
      if (t.muted) continue;
      if (hasSolo && !t.solo) continue;
      for (const n of t.notes) {
        if (n.start < minStart) minStart = n.start;
        if (n.start + n.duration > maxEnd) maxEnd = n.start + n.duration;
      }
    }

    if (minStart === Infinity) {
      for (const t of this.midiData.tracks) {
        for (const n of t.notes) {
          if (n.start < minStart) minStart = n.start;
          if (n.start + n.duration > maxEnd) maxEnd = n.start + n.duration;
        }
      }
    }

    if (minStart === Infinity) {
      this.totalDuration = this.midiData.duration || 1.0;
      return;
    }

    const rawSpan = Math.max(0.1, maxEnd);

    if (this.loopSnap === 'exact') {
      this.totalDuration = rawSpan;
    } else if (this.loopSnap && this.loopSnap !== 'auto') {
      const bars = parseInt(this.loopSnap, 10);
      if (bars > 0) {
        this.totalDuration = bars * barSec;
      } else {
        this.totalDuration = rawSpan;
      }
    } else {
      // Auto smart snap to musical bar or beat
      const barsFloat = rawSpan / barSec;
      const nearestBars = Math.round(barsFloat);

      if (nearestBars >= 1) {
        const barTarget = nearestBars * barSec;
        const barDiff = rawSpan - barTarget;
        if (barDiff >= -beatSec && barDiff <= 0.35 * beatSec) {
          this.totalDuration = barTarget;
          return;
        }
      }

      const beatsFloat = rawSpan / beatSec;
      const nearestBeats = Math.round(beatsFloat);
      if (nearestBeats >= 1) {
        const beatTarget = nearestBeats * beatSec;
        const beatDiff = rawSpan - beatTarget;
        if (Math.abs(beatDiff) <= 0.35 * beatSec) {
          this.totalDuration = beatTarget;
          return;
        }
      }

      this.totalDuration = rawSpan;
    }
  }

  scheduleTick() {
    if (!this.midiData || !this.isPlaying || !this.midiData.tracks || !this.midiData.tracks.length) return;

    const audioNow = this.ctx.currentTime;
    const deltaReal = audioNow - this.lastAudioTime;
    this.lastAudioTime = audioNow;

    const totalDur = this.totalDuration || this.midiData.duration || 1.0;
    const effectiveRate = Math.max(0.1, this.rate);

    this.currentTime += deltaReal * effectiveRate;

    // Advance loop wrap when playhead reaches totalDur
    if (this.currentTime >= totalDur) {
      if (this.isLooping) {
        this.currentTime = this.currentTime % totalDur;
        this.loopCycle = (this.loopCycle || 0) + 1;
        if (this.scheduledNotes.size > 800) {
          this.scheduledNotes.clear();
        }
      } else {
        this.isPlaying = false;
        this.silenceActiveVoices();
        return;
      }
    }

    const currentCycle = this.loopCycle || 0;
    const lookaheadSec = 0.15 * effectiveRate;
    const windowEnd = this.currentTime + lookaheadSec;

    // Slices for seamless boundary lookahead
    const slices = [];
    if (windowEnd < totalDur) {
      slices.push({
        start: this.currentTime,
        end: windowEnd,
        cycle: currentCycle,
        wrapDelay: 0,
      });
    } else {
      // Remainder of current cycle
      slices.push({
        start: this.currentTime,
        end: totalDur,
        cycle: currentCycle,
        wrapDelay: 0,
      });
      if (this.isLooping) {
        // Head of next cycle across the boundary
        const nextEnd = windowEnd - totalDur;
        const timeToWrap = Math.max(0, (totalDur - this.currentTime) / effectiveRate);
        slices.push({
          start: 0,
          end: nextEnd,
          cycle: currentCycle + 1,
          wrapDelay: timeToWrap,
        });
      }
    }

    const hasSolo = this.midiData.tracks.some(t => t.solo);
    const activeTrackIds = new Set();

    for (const slice of slices) {
      for (const track of this.midiData.tracks) {
        if (track.muted) continue;
        if (hasSolo && !track.solo) continue;

        for (const note of track.notes) {
          if (note.start >= slice.start && note.start < slice.end) {
            const noteKey = `${slice.cycle}_${track.id}_${note.note}_${note.start.toFixed(4)}`;
            if (this.scheduledNotes.has(noteKey)) continue;
            this.scheduledNotes.add(noteKey);

            let noteDelay;
            if (slice.wrapDelay > 0) {
              noteDelay = slice.wrapDelay + (note.start / effectiveRate);
            } else {
              noteDelay = Math.max(0, (note.start - this.currentTime) / effectiveRate);
            }

            const startAudioTime = audioNow + noteDelay;
            const noteDur = Math.max(0.04, note.duration / effectiveRate);

            activeTrackIds.add(track.id);
            this.triggerNote(track, note, startAudioTime, noteDur);
          }
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
    const midiPitch = clamp(note.note + this.transpose, 12, 127);
    const freq = 440 * Math.pow(2, (midiPitch - 69) / 12);
    const velNormalized = clamp((note.velocity || 90) / 127, 0.25, 1.0);

    // Dynamic track & voice volume calculation
    const trackVol = track.volume !== undefined ? track.volume : 1.0;
    const gainBoost = this.gain !== undefined ? this.gain : 1.8;
    // Base note gain is hot and punchy, matching modular VCO and 303 levels (~0.85 peak)
    const noteGain = (0.35 + 0.65 * velNormalized) * 0.75 * gainBoost * trackVol;

    // Update CV Pitch & Gate
    const stopTime = startTime + duration;
    this.pitchNode.offset.setValueAtTime(freq, startTime);
    this.gateNode.offset.setValueAtTime(1.0, startTime);
    this.gateNode.offset.setValueAtTime(0.0, stopTime);
    this.velNode.offset.setValueAtTime(velNormalized, startTime);

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    switch (this.timbre) {
      case 'poly_epiano': {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        env.gain.setValueAtTime(0, startTime);
        env.gain.linearRampToValueAtTime(noteGain * 0.9, startTime + 0.008);
        env.gain.exponentialRampToValueAtTime(0.001, stopTime + 0.15);
        break;
      }
      case 'chiptune': {
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, startTime);
        env.gain.setValueAtTime(noteGain * 0.75, startTime);
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
        env.gain.setValueAtTime(noteGain * 0.9, startTime);
        env.gain.exponentialRampToValueAtTime(0.001, stopTime + 0.15);
        break;
      }
      case 'sine_sub': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        env.gain.setValueAtTime(0, startTime);
        env.gain.linearRampToValueAtTime(noteGain * 1.05, startTime + 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, stopTime + 0.08);
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
        env.gain.linearRampToValueAtTime(noteGain * 0.95, startTime + 0.006);
        env.gain.exponentialRampToValueAtTime(0.001, stopTime + 0.08);
        osc.start(startTime);
        osc.stop(stopTime + 0.1);
        env.connect(this.saturator);
        this.activeVoices.push({ osc, gain: env, stopTime: stopTime + 0.1 });
        return;
      }
    }

    osc.connect(env);
    env.connect(this.saturator);
    osc.start(startTime);
    osc.stop(stopTime + 0.2);
    this.activeVoices.push({ osc, gain: env, stopTime: stopTime + 0.2 });
  }

  setParam(name, val) {
    if (name === 'rate') {
      this.rate = clamp(parseFloat(val), 0.1, 4.0);
    } else if (name === 'transpose') {
      this.transpose = parseInt(val) || 0;
    } else if (name === 'gain') {
      this.gain = clamp(parseFloat(val), 0.2, 5.0);
    } else if (name === 'level') {
      this.level = clamp(parseFloat(val), 0, 3.0);
      this.outGain.gain.setTargetAtTime(this.level, this.ctx.currentTime, 0.02);
    } else if (name === 'timbre') {
      this.timbre = val;
    } else if (name === 'loop_snap') {
      this.setLoopSnap(val);
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

// ---------------------------------------------------------------------------
// 44. Sample Player Module (Open Sample Drum)
// ---------------------------------------------------------------------------
class SamplePlayerModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'sample_player';

    this.kit = params.kit || 'tr909';
    this.voice = params.voice || 'kick';
    this.pitch = params.pitch !== undefined ? parseFloat(params.pitch) : 0;
    this.decay = params.decay !== undefined ? parseFloat(params.decay) : 0.45;
    this.start = params.start !== undefined ? parseFloat(params.start) : 0;
    this.crunch = params.crunch !== undefined ? parseFloat(params.crunch) : 0.25;
    this.cutoff = params.cutoff !== undefined ? parseFloat(params.cutoff) : 12000;
    this.level = params.level !== undefined ? parseFloat(params.level) : 1.0;

    this.outGain = ctx.createGain();
    this.outGain.gain.setValueAtTime(this.level, ctx.currentTime);

    this.inNode = ctx.createGain();
    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(this.cutoff, ctx.currentTime);
    this.filterNode.Q.setValueAtTime(2.0, ctx.currentTime);

    this.crunchShaper = ctx.createWaveShaper();
    this.updateCrunchCurve();

    this.eocGain = ctx.createGain();
    this.trigInputNode = ctx.createGain();
    this.cvPitchInputNode = ctx.createGain();

    this.inNode.connect(this.filterNode);
    this.filterNode.connect(this.crunchShaper);
    this.crunchShaper.connect(this.outGain);

    this.customBuffer = null;
    this.customName = '';
    this.buffers = {};
    this.connectedTrigSources = new Set();
    this.onHit = null;

    this.initBuiltinBuffers();
  }

  updateCrunchCurve() {
    const samples = 512;
    const curve = new Float32Array(samples);
    const bits = Math.max(4, Math.round(16 - this.crunch * 10));
    const step = Math.pow(0.5, bits - 1);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      const quantized = Math.round(x / step) * step;
      curve[i] = Math.tanh(quantized * (1.0 + this.crunch * 0.8));
    }
    this.crunchShaper.curve = curve;
  }

  initBuiltinBuffers() {
    const sr = this.ctx.sampleRate;
    const kits = ['tr909', 'tr707', 'linndrum', 'dmx', 'cr78'];
    const voices = ['kick', 'snare', 'hihat', 'clap', 'perc'];

    for (const k of kits) {
      this.buffers[k] = {};
      for (const v of voices) {
        this.buffers[k][v] = this.synthesizeVoiceBuffer(k, v, sr);
      }
    }
  }

  synthesizeVoiceBuffer(kit, voice, sr) {
    let dur = 0.5;
    if (voice === 'kick') dur = kit === 'cr78' ? 0.35 : 0.55;
    else if (voice === 'snare') dur = 0.4;
    else if (voice === 'hihat') dur = 0.15;
    else if (voice === 'clap') dur = 0.45;
    else if (voice === 'perc') dur = 0.3;

    const len = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      let sample = 0;

      if (voice === 'kick') {
        const startFreq = kit === 'tr909' ? 180 : kit === 'tr707' ? 220 : kit === 'linndrum' ? 140 : kit === 'dmx' ? 160 : 120;
        const endFreq = kit === 'tr909' ? 44 : kit === 'tr707' ? 62 : kit === 'linndrum' ? 52 : kit === 'dmx' ? 48 : 75;
        const sweepSpeed = kit === 'tr707' ? 0.03 : 0.055;
        const f = endFreq + (startFreq - endFreq) * Math.exp(-t / sweepSpeed);
        const env = Math.exp(-t / (kit === 'tr909' ? 0.22 : 0.16));
        const click = (t < 0.003) ? (Math.random() * 2 - 1) * Math.exp(-t / 0.001) : 0;
        sample = Math.sin(2 * Math.PI * f * t) * env + click * 0.4;
      } else if (voice === 'snare') {
        const bodyF = kit === 'tr909' ? 185 : kit === 'tr707' ? 210 : kit === 'linndrum' ? 190 : kit === 'dmx' ? 220 : 260;
        const bodyEnv = Math.exp(-t / 0.09);
        const noiseEnv = Math.exp(-t / (kit === 'linndrum' ? 0.25 : 0.18));
        const body = Math.sin(2 * Math.PI * bodyF * t) * bodyEnv;
        const noise = (Math.random() * 2 - 1) * noiseEnv;
        sample = body * 0.5 + noise * 0.5;
      } else if (voice === 'hihat') {
        const noise = (Math.random() * 2 - 1);
        const env = Math.exp(-t / (kit === 'cr78' ? 0.035 : 0.065));
        const metal = (Math.sin(2 * Math.PI * 7200 * t) + Math.sin(2 * Math.PI * 9400 * t)) * 0.3;
        sample = (noise * 0.7 + metal * 0.3) * env;
      } else if (voice === 'clap') {
        let env = 0;
        if (t < 0.011) env = Math.exp(-t / 0.004);
        else if (t < 0.022) env = Math.exp(-(t - 0.011) / 0.004);
        else if (t < 0.033) env = Math.exp(-(t - 0.022) / 0.004);
        else env = Math.exp(-(t - 0.033) / (kit === 'linndrum' ? 0.25 : 0.16));
        const noise = (Math.random() * 2 - 1);
        sample = noise * env;
      } else if (voice === 'perc') {
        const pf = kit === 'cr78' ? 620 : kit === 'tr707' ? 540 : kit === 'dmx' ? 180 : 960;
        const env = Math.exp(-t / (kit === 'cr78' ? 0.14 : 0.05));
        sample = Math.sin(2 * Math.PI * pf * t) * env;
      }

      d[i] = clamp(sample * 0.95, -1, 1);
    }

    return buf;
  }

  getActiveBuffer() {
    if (this.kit === 'custom' && this.customBuffer) {
      return this.customBuffer;
    }
    if (this.buffers[this.kit] && this.buffers[this.kit][this.voice]) {
      return this.buffers[this.kit][this.voice];
    }
    return (this.buffers.tr909 && this.buffers.tr909.kick) ? this.buffers.tr909.kick : null;
  }

  loadCustomBuffer(audioBuf, name = '') {
    this.customBuffer = audioBuf;
    this.customName = name;
    this.kit = 'custom';
  }

  triggerHit(scheduledTime = null) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = scheduledTime || this.ctx.currentTime;
    const buf = this.getActiveBuffer();
    if (!buf) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buf;

    const pitchRatio = Math.pow(2, this.pitch / 12);
    source.playbackRate.setValueAtTime(pitchRatio, now);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(1.0, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + this.decay);

    source.connect(env);
    env.connect(this.filterNode);

    const startOffset = clamp((this.start / 100) * buf.duration, 0, buf.duration - 0.01);
    source.start(now, startOffset);
    source.stop(now + this.decay);

    const eocTime = now + Math.min(this.decay, (buf.duration - startOffset) / pitchRatio);
    this.scheduleEocPulse(eocTime);

    if (this.onHit) this.onHit();
  }

  scheduleEocPulse(time) {
    if (!this.ctx) return;
    try {
      this.eocGain.gain.setValueAtTime(1.0, time);
      this.eocGain.gain.setValueAtTime(0.0, time + 0.006);
    } catch (e) {}
  }

  onConnectJack(jack, fromMod, fromJack) {
    if (jack === 'trig') {
      this.connectedTrigSources.add(fromMod);
    }
  }

  onDisconnectJack(jack, fromMod, fromJack) {
    if (jack === 'trig') {
      this.connectedTrigSources.delete(fromMod);
    }
  }

  setParam(name, val) {
    if (name === 'kit') {
      this.kit = val;
    } else if (name === 'voice') {
      this.voice = val;
    } else if (name === 'pitch') {
      this.pitch = parseFloat(val);
    } else if (name === 'decay') {
      this.decay = clamp(parseFloat(val), 0.02, 2.5);
    } else if (name === 'start') {
      this.start = clamp(parseFloat(val), 0, 100);
    } else if (name === 'crunch') {
      this.crunch = clamp(parseFloat(val), 0, 1.0);
      this.updateCrunchCurve();
    } else if (name === 'cutoff') {
      this.cutoff = clamp(parseFloat(val), 200, 14000);
      this.filterNode.frequency.setTargetAtTime(this.cutoff, this.ctx.currentTime, 0.02);
    } else if (name === 'level') {
      this.level = clamp(parseFloat(val), 0, 2.0);
      this.outGain.gain.setTargetAtTime(this.level, this.ctx.currentTime, 0.02);
    }
  }

  getJackOutputNode(jack) {
    if (jack === 'eoc') return this.eocGain;
    return this.outGain;
  }

  getJackInputNode(jack) {
    if (jack === 'trig') return this.trigInputNode;
    if (jack === 'cv_pitch') return this.cvPitchInputNode;
    return this.inNode;
  }

  dispose() {
    try {
      this.inNode.disconnect();
      this.filterNode.disconnect();
      this.crunchShaper.disconnect();
      this.outGain.disconnect();
      this.eocGain.disconnect();
      this.trigInputNode.disconnect();
      this.cvPitchInputNode.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 45. Macro Percussion Synthesizer (West-Coast Algorithmic Drum Synth)
// ---------------------------------------------------------------------------
class MacroPercussionModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'macro_percussion';

    this.model = params.model || 'bass_drum';
    this.pitch = params.pitch !== undefined ? parseFloat(params.pitch) : 55;
    this.decay = params.decay !== undefined ? parseFloat(params.decay) : 0.35;
    this.harmonics = params.harmonics !== undefined ? parseFloat(params.harmonics) : 0.4;
    this.morph = params.morph !== undefined ? parseFloat(params.morph) : 0.3;
    this.fold = params.fold !== undefined ? parseFloat(params.fold) : 0.2;
    this.accent = params.accent !== undefined ? parseFloat(params.accent) : 0.75;

    this.outGain = ctx.createGain();
    this.outGain.gain.setValueAtTime(0.9, ctx.currentTime);

    this.trigInputNode = ctx.createGain();
    this.cvMorphInputNode = ctx.createGain();
    this.cvPitchInputNode = ctx.createGain();

    this.wavefolder = ctx.createWaveShaper();
    this.updateWavefoldCurve();
    this.wavefolder.connect(this.outGain);

    this.onHit = null;
  }

  updateWavefoldCurve() {
    const samples = 512;
    const curve = new Float32Array(samples);
    const folds = 1.0 + this.fold * 4.0;
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.sin(x * Math.PI * folds) * 0.85;
    }
    this.wavefolder.curve = curve;
  }

  triggerHit(scheduledTime = null) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = scheduledTime || this.ctx.currentTime;
    const model = this.model;
    const dur = this.decay;
    const gainScale = 0.5 + this.accent * 0.5;

    if (model === 'bass_drum') {
      const carrier = this.ctx.createOscillator();
      const mod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const env = this.ctx.createGain();

      carrier.frequency.setValueAtTime(this.pitch * 3.5, now);
      carrier.frequency.exponentialRampToValueAtTime(Math.max(25, this.pitch), now + 0.05);

      mod.frequency.setValueAtTime(this.pitch * 4.5, now);
      mod.frequency.exponentialRampToValueAtTime(30, now + 0.07);

      modGain.gain.setValueAtTime((this.harmonics * 400 + 50) * gainScale, now);
      modGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      mod.connect(carrier.frequency);

      env.gain.setValueAtTime(1.1 * gainScale, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + dur);

      carrier.connect(env);
      env.connect(this.wavefolder);

      carrier.start(now);
      mod.start(now);
      carrier.stop(now + dur);
      mod.stop(now + dur);
    } else if (model === 'snare_drum') {
      const osc = this.ctx.createOscillator();
      const oscEnv = this.ctx.createGain();
      osc.frequency.setValueAtTime(Math.max(80, this.pitch * 2.5), now);
      osc.frequency.exponentialRampToValueAtTime(this.pitch, now + 0.06);

      oscEnv.gain.setValueAtTime(0.8 * gainScale, now);
      oscEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(oscEnv);
      oscEnv.connect(this.wavefolder);

      const bSize = Math.floor(this.ctx.sampleRate * 0.35);
      const b = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < bSize; i++) d[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = b;

      const filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(1500 + this.harmonics * 2500, now);
      filt.Q.setValueAtTime(2.0 + this.morph * 6.0, now);

      const noiseEnv = this.ctx.createGain();
      noiseEnv.gain.setValueAtTime(0.9 * gainScale, now);
      noiseEnv.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.7);

      noise.connect(filt);
      filt.connect(noiseEnv);
      noiseEnv.connect(this.wavefolder);

      osc.start(now);
      noise.start(now);
      osc.stop(now + 0.15);
      noise.stop(now + dur);
    } else if (model === 'metallic_hat') {
      const ratios = [240, 380, 540, 630, 790, 1100];
      const clusterGain = this.ctx.createGain();
      clusterGain.gain.setValueAtTime(0.25 * gainScale, now);

      const filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(5000 + this.morph * 5000, now);
      filt.Q.setValueAtTime(3.0 + this.harmonics * 8.0, now);

      const env = this.ctx.createGain();
      env.gain.setValueAtTime(1.0, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + Math.min(dur, 0.4));

      for (const r of ratios) {
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(r * (this.pitch / 55), now);
        osc.connect(clusterGain);
        osc.start(now);
        osc.stop(now + Math.min(dur, 0.45));
      }

      clusterGain.connect(filt);
      filt.connect(env);
      env.connect(this.wavefolder);
    } else if (model === 'burst_clap') {
      const bSize = Math.floor(this.ctx.sampleRate * (dur + 0.05));
      const b = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
      const d = b.getChannelData(0);
      const sr = this.ctx.sampleRate;
      for (let i = 0; i < bSize; i++) {
        const t = i / sr;
        let env = 0;
        if (t < 0.011) env = Math.exp(-t / 0.003);
        else if (t < 0.022) env = Math.exp(-(t - 0.011) / 0.003);
        else if (t < 0.033) env = Math.exp(-(t - 0.022) / 0.003);
        else env = Math.exp(-(t - 0.033) / dur);
        d[i] = (Math.random() * 2 - 1) * env * gainScale;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = b;

      const filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(1200 + this.harmonics * 1400, now);
      filt.Q.setValueAtTime(1.8 + this.morph * 3.0, now);

      noise.connect(filt);
      filt.connect(this.wavefolder);
      noise.start(now);
    } else if (model === 'fm_zap') {
      const osc = this.ctx.createOscillator();
      const mod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const env = this.ctx.createGain();

      osc.frequency.setValueAtTime(this.pitch * 10, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + Math.min(dur, 0.2));

      mod.frequency.setValueAtTime(this.pitch * 6, now);
      modGain.gain.setValueAtTime((this.harmonics * 600 + 100) * gainScale, now);
      modGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      mod.connect(osc.frequency);

      env.gain.setValueAtTime(1.0 * gainScale, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(env);
      env.connect(this.wavefolder);

      osc.start(now);
      mod.start(now);
      osc.stop(now + dur);
      mod.stop(now + dur);
    } else {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.frequency.setValueAtTime(this.pitch * 6, now);
      osc.frequency.exponentialRampToValueAtTime(this.pitch * 3, now + 0.025);

      env.gain.setValueAtTime(1.0 * gainScale, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + Math.min(dur, 0.08));

      osc.connect(env);
      env.connect(this.wavefolder);

      osc.start(now);
      osc.stop(now + 0.09);
    }

    if (this.onHit) this.onHit(this.accent);
  }

  setParam(name, val) {
    if (name === 'model') this.model = val;
    else if (name === 'pitch') this.pitch = parseFloat(val);
    else if (name === 'decay') this.decay = clamp(parseFloat(val), 0.05, 2.0);
    else if (name === 'harmonics') this.harmonics = clamp(parseFloat(val), 0, 1.0);
    else if (name === 'morph') this.morph = clamp(parseFloat(val), 0, 1.0);
    else if (name === 'fold') {
      this.fold = clamp(parseFloat(val), 0, 1.0);
      this.updateWavefoldCurve();
    } else if (name === 'accent') this.accent = clamp(parseFloat(val), 0, 1.0);
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    if (jack === 'trig') return this.trigInputNode;
    if (jack === 'cv_morph') return this.cvMorphInputNode;
    return this.cvPitchInputNode;
  }

  dispose() {
    try {
      this.wavefolder.disconnect();
      this.outGain.disconnect();
      this.trigInputNode.disconnect();
      this.cvMorphInputNode.disconnect();
      this.cvPitchInputNode.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 46. Amen Break Slicer Module (Glitch & Breakbeat Chopper)
// ---------------------------------------------------------------------------
class AmenSlicerModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'amen_slicer';

    this.bpm = params.bpm || 165;
    this.break = params.break || 'amen_classic';
    this.mode = params.mode || 'sequential';
    this.slice = params.slice !== undefined ? parseInt(params.slice) : 1;
    this.stutter = params.stutter !== undefined ? parseFloat(params.stutter) : 0.2;
    this.reverse = params.reverse !== undefined ? parseFloat(params.reverse) : 0.15;
    this.pitch = params.pitch !== undefined ? parseFloat(params.pitch) : 0;
    this.filter = params.filter !== undefined ? parseFloat(params.filter) : 10000;

    this.outGain = ctx.createGain();
    this.outGain.gain.setValueAtTime(0.9, ctx.currentTime);

    this.inNode = ctx.createGain();
    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(this.filter, ctx.currentTime);

    this.sliceGate = ctx.createGain();
    this.trigInputNode = ctx.createGain();
    this.sliceCvInputNode = ctx.createGain();

    this.inNode.connect(this.filterNode);
    this.filterNode.connect(this.outGain);

    this.currentStep = 0;
    this.isRunning = true;
    this.slices = [];
    this.revSlices = [];
    this.customBreak = null;
    this.onStep = null;

    this.initBreakSlices();
    this.runClock();
  }

  initBreakSlices() {
    const sr = this.ctx.sampleRate;
    const sliceDur = (60 / this.bpm) / 4;
    const sliceLen = Math.floor(sr * sliceDur);

    this.slices = [];
    this.revSlices = [];

    for (let s = 0; s < 16; s++) {
      const fBuf = this.ctx.createBuffer(1, sliceLen, sr);
      const rBuf = this.ctx.createBuffer(1, sliceLen, sr);
      const fd = fBuf.getChannelData(0);
      const rd = rBuf.getChannelData(0);

      const isKick = (s === 0 || s === 5 || s === 8 || s === 9 || s === 13);
      const isSnare = (s === 3 || s === 7 || s === 10 || s === 14);
      const isRide = (s % 2 === 0);

      for (let i = 0; i < sliceLen; i++) {
        const t = i / sr;
        let v = 0;
        if (isKick) {
          const f = 45 + 130 * Math.exp(-t / 0.04);
          v += Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.12);
        }
        if (isSnare) {
          const body = Math.sin(2 * Math.PI * 210 * t) * Math.exp(-t / 0.08);
          const snap = (Math.random() * 2 - 1) * Math.exp(-t / 0.16);
          v += body * 0.45 + snap * 0.65;
        }
        if (isRide) {
          v += (Math.random() * 2 - 1) * Math.exp(-t / 0.07) * 0.35;
        } else {
          v += (Math.random() * 2 - 1) * Math.exp(-t / 0.04) * 0.15;
        }

        fd[i] = clamp(v, -1, 1);
      }

      for (let i = 0; i < sliceLen; i++) {
        rd[i] = fd[sliceLen - 1 - i];
      }

      this.slices.push(fBuf);
      this.revSlices.push(rBuf);
    }
  }

  loadCustomBreak(audioBuf, name = '') {
    this.customBreak = audioBuf;
    this.break = 'custom';
    const totalLen = audioBuf.length;
    const sliceLen = Math.floor(totalLen / 16);
    const sr = audioBuf.sampleRate;
    this.slices = [];
    this.revSlices = [];

    const srcData = audioBuf.getChannelData(0);
    for (let s = 0; s < 16; s++) {
      const fBuf = this.ctx.createBuffer(1, sliceLen, sr);
      const rBuf = this.ctx.createBuffer(1, sliceLen, sr);
      const fd = fBuf.getChannelData(0);
      const rd = rBuf.getChannelData(0);
      const offset = s * sliceLen;

      for (let i = 0; i < sliceLen; i++) {
        fd[i] = srcData[offset + i] || 0;
        rd[i] = srcData[offset + sliceLen - 1 - i] || 0;
      }
      this.slices.push(fBuf);
      this.revSlices.push(rBuf);
    }
  }

  runClock() {
    if (!this.isRunning) return;
    this.playCurrentSlice();
    this.currentStep = (this.currentStep + 1) % 16;
    const intervalMs = Math.floor((60000 / this.bpm) / 4);
    scheduleNextTick(this, () => this.runClock(), intervalMs);
  }

  playCurrentSlice(scheduledTime = null) {
    if (!this.ctx || this.ctx.state !== 'running' || this.slices.length === 0) return;
    const now = scheduledTime || this.ctx.currentTime;

    let targetIdx = this.currentStep;
    if (this.mode === 'glitch_random') {
      targetIdx = Math.floor(Math.random() * 16);
    } else if (this.mode === 'jungle_stutter') {
      if (Math.random() < this.stutter) {
        targetIdx = (this.currentStep < 4) ? 0 : 3;
      }
    } else if (this.mode === 'half_time') {
      targetIdx = (Math.floor(this.currentStep / 2) * 2) % 16;
    } else if (this.mode === 'reverse_funk') {
      targetIdx = (15 - this.currentStep) % 16;
    }

    const useRev = (this.reverse > 0 && Math.random() < this.reverse);
    const buf = useRev ? this.revSlices[targetIdx] : this.slices[targetIdx];
    if (!buf) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    source.playbackRate.setValueAtTime(Math.pow(2, this.pitch / 12), now);

    source.connect(this.filterNode);
    source.start(now);

    try {
      this.sliceGate.gain.setValueAtTime(1.0, now);
      this.sliceGate.gain.setValueAtTime(0.0, now + 0.01);
    } catch (e) {}

    if (this.onStep) this.onStep(targetIdx);
  }

  stepSlice() {
    this.playCurrentSlice();
    this.currentStep = (this.currentStep + 1) % 16;
  }

  rollSlice() {
    const stepDur = (60 / this.bpm) / 8;
    for (let r = 0; r < 4; r++) {
      setTimeout(() => this.playCurrentSlice(), r * stepDur * 1000);
    }
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this._nextTickTime = null;
    this.currentStep = 0;
    this.runClock();
  }

  setParam(name, val) {
    if (name === 'bpm') {
      this.bpm = clamp(Math.round(val), 50, 240);
      // initBreakSlices resynthesizes all 16 break slices on the main
      // thread; debounce so a knob drag doesn't fire it on every tick.
      clearTimeout(this._sliceDebounce);
      this._sliceDebounce = setTimeout(() => this.initBreakSlices(), 100);
    } else if (name === 'break') {
      this.break = val;
      clearTimeout(this._sliceDebounce);
      this._sliceDebounce = setTimeout(() => this.initBreakSlices(), 100);
    } else if (name === 'mode') {
      this.mode = val;
    } else if (name === 'slice') {
      this.slice = clamp(parseInt(val), 1, 16);
    } else if (name === 'stutter') {
      this.stutter = clamp(parseFloat(val), 0, 1.0);
    } else if (name === 'reverse') {
      this.reverse = clamp(parseFloat(val), 0, 1.0);
    } else if (name === 'pitch') {
      this.pitch = parseFloat(val);
    } else if (name === 'filter') {
      this.filter = clamp(parseFloat(val), 200, 14000);
      this.filterNode.frequency.setTargetAtTime(this.filter, this.ctx.currentTime, 0.02);
    }
  }

  getJackOutputNode(jack) {
    if (jack === 'slice_gate') return this.sliceGate;
    return this.outGain;
  }

  getJackInputNode(jack) {
    if (jack === 'trig') return this.trigInputNode;
    if (jack === 'slice_cv') return this.sliceCvInputNode;
    return this.inNode;
  }

  dispose() {
    this.isRunning = false;
    clearTimeout(this.timer);
    clearTimeout(this._sliceDebounce);
    try {
      this.inNode.disconnect();
      this.filterNode.disconnect();
      this.outGain.disconnect();
      this.sliceGate.disconnect();
      this.trigInputNode.disconnect();
      this.sliceCvInputNode.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 47. Quad Euclidean Poly-Rhythm Trigger Sequencer Module
// ---------------------------------------------------------------------------
class QuadEuclidModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'quad_euclid';

    this.bpm = params.bpm || 125;
    this.active_ch = params.active_ch || 'ch1';
    this.gate_len = params.gate_len !== undefined ? parseFloat(params.gate_len) : 30;
    this.run = params.run || 'running';
    this.isRunning = (this.run === 'running');

    this.tracks = {
      ch1: { steps: 16, pulses: 4, offset: 0, currentStep: 0, pattern: [] },
      ch2: { steps: 16, pulses: 2, offset: 4, currentStep: 0, pattern: [] },
      ch3: { steps: 16, pulses: 7, offset: 2, currentStep: 0, pattern: [] },
      ch4: { steps: 12, pulses: 5, offset: 1, currentStep: 0, pattern: [] },
    };

    if (params.steps !== undefined) this.tracks.ch1.steps = parseInt(params.steps);
    if (params.pulses !== undefined) this.tracks.ch1.pulses = parseInt(params.pulses);
    if (params.offset !== undefined) this.tracks.ch1.offset = parseInt(params.offset);

    this.trigNodes = {
      trig1: ctx.createGain(),
      trig2: ctx.createGain(),
      trig3: ctx.createGain(),
      trig4: ctx.createGain(),
    };

    this.clockInputNode = ctx.createGain();
    this.resetInputNode = ctx.createGain();

    this.connectedTargets = {
      trig1: new Set(),
      trig2: new Set(),
      trig3: new Set(),
      trig4: new Set(),
    };

    this.onStep = null;
    this.recomputePatterns();
    this.runClock();
  }

  bjorklund(steps, pulses, offset) {
    const s = Math.max(1, steps);
    const p = Math.min(s, Math.max(0, pulses));
    const base = new Array(s).fill(0);
    if (p > 0) {
      for (let i = 0; i < p; i++) {
        base[Math.floor((i * s) / p)] = 1;
      }
    }
    const result = [];
    for (let i = 0; i < s; i++) {
      result.push(base[(i + offset) % s]);
    }
    return result;
  }

  recomputePatterns() {
    for (const tr of Object.values(this.tracks)) {
      tr.pattern = this.bjorklund(tr.steps, tr.pulses, tr.offset);
    }
  }

  runClock() {
    if (!this.isRunning) return;
    const now = this.ctx.currentTime;
    const activeMap = {};

    const chKeys = ['ch1', 'ch2', 'ch3', 'ch4'];
    const trigKeys = ['trig1', 'trig2', 'trig3', 'trig4'];

    for (let i = 0; i < 4; i++) {
      const chId = chKeys[i];
      const trigKey = trigKeys[i];
      const tr = this.tracks[chId];
      const isActive = tr.pattern[tr.currentStep % tr.pattern.length] === 1;
      activeMap[chId] = isActive;

      if (isActive) {
        this.emitTriggerPulse(this.trigNodes[trigKey], now);

        for (const target of this.connectedTargets[trigKey]) {
          if (typeof target.triggerHit === 'function') target.triggerHit(now);
          else if (typeof target.stepSlice === 'function') target.stepSlice();
        }
      }

      tr.currentStep = (tr.currentStep + 1) % tr.pattern.length;
    }

    if (this.onStep) this.onStep(activeMap);

    const intervalMs = Math.floor((60000 / this.bpm) / 4);
    scheduleNextTick(this, () => this.runClock(), intervalMs);
  }

  emitTriggerPulse(node, now) {
    try {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.015);

      env.gain.setValueAtTime(0.8, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + (this.gate_len / 1000));

      osc.connect(env);
      env.connect(node);
      osc.start(now);
      osc.stop(now + 0.02);
    } catch (e) {}
  }

  onConnectOutputJack(fromJack, toMod, toJack) {
    if (this.connectedTargets[fromJack]) {
      this.connectedTargets[fromJack].add(toMod);
    }
  }

  onDisconnectOutputJack(fromJack, toMod, toJack) {
    if (this.connectedTargets[fromJack]) {
      this.connectedTargets[fromJack].delete(toMod);
    }
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this._nextTickTime = null;
    for (const tr of Object.values(this.tracks)) tr.currentStep = 0;
    if (this.isRunning) this.runClock();
  }

  setParam(name, val) {
    if (name === 'bpm') {
      this.bpm = clamp(Math.round(val), 40, 240);
    } else if (name === 'active_ch') {
      this.active_ch = val;
    } else if (name === 'steps') {
      if (this.tracks[this.active_ch]) {
        this.tracks[this.active_ch].steps = clamp(parseInt(val), 1, 16);
        this.recomputePatterns();
      }
    } else if (name === 'pulses') {
      if (this.tracks[this.active_ch]) {
        this.tracks[this.active_ch].pulses = clamp(parseInt(val), 0, 16);
        this.recomputePatterns();
      }
    } else if (name === 'offset') {
      if (this.tracks[this.active_ch]) {
        this.tracks[this.active_ch].offset = clamp(parseInt(val), 0, 15);
        this.recomputePatterns();
      }
    } else if (name === 'gate_len') {
      this.gate_len = clamp(parseFloat(val), 10, 120);
    } else if (name === 'run') {
      this.run = val;
      this.isRunning = (val === 'running');
      if (this.isRunning) this.runClock();
      else clearTimeout(this.timer);
    }
  }

  getJackOutputNode(jack) {
    if (this.trigNodes[jack]) return this.trigNodes[jack];
    return this.trigNodes.trig1;
  }

  getJackInputNode(jack) {
    if (jack === 'reset') return this.resetInputNode;
    return this.clockInputNode;
  }

  dispose() {
    this.isRunning = false;
    clearTimeout(this.timer);
    try {
      for (const n of Object.values(this.trigNodes)) n.disconnect();
      this.clockInputNode.disconnect();
      this.resetInputNode.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 48. Stochastic Random CV Generator Module (Marbles / Deja-Vu Random Voltages)
// ---------------------------------------------------------------------------
class StochasticVaultModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'stochastic_vault';

    this.rate = params.rate !== undefined ? parseFloat(params.rate) : 4.0;
    this.deja_vu = params.deja_vu !== undefined ? parseFloat(params.deja_vu) : 0.75;
    this.length = params.length !== undefined ? parseInt(params.length) : 16;
    this.spread = params.spread !== undefined ? parseFloat(params.spread) : 1.5;
    this.scale = params.scale || 'dorian';
    this.root = params.root || 'A';
    this.jitter = params.jitter !== undefined ? parseFloat(params.jitter) : 0.15;

    this.pitchNode = ctx.createConstantSource();
    this.pitchNode.offset.setValueAtTime(55, ctx.currentTime);
    this.pitchNode.start();

    this.gate1Node = ctx.createGain();
    this.gate2Node = ctx.createGain();
    this.smoothCvGain = ctx.createGain();
    this.smoothCvGain.gain.setValueAtTime(1.0, ctx.currentTime);

    this.clockInputNode = ctx.createGain();
    this.freezeNode = ctx.createGain();

    this.memory = new Array(32).fill(0).map(() => Math.random());
    this.history = [];
    this.stepCount = 0;
    this.isRunning = true;
    this.onVoltageUpdate = null;

    this.runTick();
  }

  getScaleIntervals(scale) {
    const scales = {
      pentatonic: [0, 3, 5, 7, 10],
      dorian: [0, 2, 3, 5, 7, 9, 10],
      phrygian: [0, 1, 3, 5, 7, 8, 10],
      hirajoshi: [0, 2, 3, 7, 8],
      minor: [0, 2, 3, 5, 7, 8, 10],
      major: [0, 2, 4, 5, 7, 9, 11],
      chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    };
    return scales[scale] || scales.dorian;
  }

  getRootOffset(root) {
    const roots = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
    return roots[root] !== undefined ? roots[root] : 9;
  }

  runTick() {
    if (!this.isRunning) return;
    const now = this.ctx.currentTime;
    const len = clamp(this.length, 4, 32);

    const memIdx = this.stepCount % len;
    let rawVal;
    if (Math.random() < this.deja_vu) {
      rawVal = this.memory[memIdx];
    } else {
      rawVal = Math.random();
      this.memory[memIdx] = rawVal;
    }

    const intervals = this.getScaleIntervals(this.scale);
    const rootOffset = this.getRootOffset(this.root);
    const octaveSpan = Math.max(0.5, this.spread);
    const totalSemitones = Math.floor(octaveSpan * 12);
    const targetSemitone = Math.floor(rawVal * totalSemitones);

    const oct = Math.floor(targetSemitone / 12);
    const semiInOct = targetSemitone % 12;
    let closestDegree = intervals[0];
    let minDiff = 99;
    for (const d of intervals) {
      const diff = Math.abs(d - semiInOct);
      if (diff < minDiff) {
        minDiff = diff;
        closestDegree = d;
      }
    }

    const midiNote = 33 + rootOffset + oct * 12 + closestDegree;
    const freqHz = 440 * Math.pow(2, (midiNote - 69) / 12);
    const volts = (midiNote - 33) / 12;

    this.pitchNode.offset.setTargetAtTime(freqHz, now, 0.005);
    this.smoothCvGain.gain.setTargetAtTime(volts, now, 0.04);

    this.emitGatePulse(this.gate1Node, now);
    if (Math.random() < 0.5) {
      this.emitGatePulse(this.gate2Node, now);
    }

    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteName = `${noteNames[midiNote % 12]}${Math.floor(midiNote / 12) - 1}`;

    this.history.push(rawVal);
    if (this.history.length > 20) this.history.shift();

    if (this.onVoltageUpdate) {
      this.onVoltageUpdate({ noteName, freqHz, volts, gate1: true, gate2: false, history: this.history });
    }

    this.stepCount++;
    const jitterOffset = (Math.random() * 2 - 1) * this.jitter * 0.2;
    const intervalMs = Math.max(20, Math.floor((1000 / this.rate) * (1.0 + jitterOffset)));
    scheduleNextTick(this, () => this.runTick(), intervalMs);
  }

  emitGatePulse(node, now) {
    try {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.01);
      env.gain.setValueAtTime(0.8, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      osc.connect(env);
      env.connect(node);
      osc.start(now);
      osc.stop(now + 0.025);
    } catch (e) {}
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this._nextTickTime = null;
    this.stepCount = 0;
    this.runTick();
  }

  setParam(name, val) {
    if (name === 'rate') this.rate = clamp(parseFloat(val), 0.5, 25);
    else if (name === 'deja_vu') this.deja_vu = clamp(parseFloat(val), 0, 1.0);
    else if (name === 'length') this.length = clamp(parseInt(val), 4, 32);
    else if (name === 'spread') this.spread = clamp(parseFloat(val), 0.5, 3.0);
    else if (name === 'scale') this.scale = val;
    else if (name === 'root') this.root = val;
    else if (name === 'jitter') this.jitter = clamp(parseFloat(val), 0, 1.0);
  }

  getJackOutputNode(jack) {
    if (jack === 'gate1') return this.gate1Node;
    if (jack === 'gate2') return this.gate2Node;
    if (jack === 'smooth_cv') return this.smoothCvGain;
    return this.pitchNode;
  }

  getJackInputNode(jack) {
    if (jack === 'freeze') return this.freezeNode;
    return this.clockInputNode;
  }

  dispose() {
    this.isRunning = false;
    clearTimeout(this.timer);
    try {
      this.pitchNode.stop();
      this.pitchNode.disconnect();
      this.gate1Node.disconnect();
      this.gate2Node.disconnect();
      this.smoothCvGain.disconnect();
      this.clockInputNode.disconnect();
      this.freezeNode.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 49. Dual Morphing Wavetable Oscillator Module
// ---------------------------------------------------------------------------
class DualWavetableModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'wavetable_dual';

    this.freq1 = params.freq1 !== undefined ? parseFloat(params.freq1) : 65.41;
    this.freq2 = params.freq2 !== undefined ? parseFloat(params.freq2) : 130.81;
    this.detune = params.detune !== undefined ? parseFloat(params.detune) : 7;
    this.table1 = params.table1 || 'ppg_bell';
    this.table2 = params.table2 || 'vocal_formant';
    this.morph = params.morph !== undefined ? parseFloat(params.morph) : 0.35;
    this.cross_fm = params.cross_fm !== undefined ? parseFloat(params.cross_fm) : 0.25;
    this.sub_level = params.sub_level !== undefined ? parseFloat(params.sub_level) : 0.45;
    this.spread = params.spread !== undefined ? parseFloat(params.spread) : 0.5;

    this.outGain = ctx.createGain();
    this.outGain.gain.setValueAtTime(0.85, ctx.currentTime);

    this.osc1Gain = ctx.createGain();
    this.osc2Gain = ctx.createGain();
    this.subGain = ctx.createGain();
    this.fmGain = ctx.createGain();

    this.scanCvNode = ctx.createGain();
    this.fmInNode = ctx.createGain();

    this.osc1 = ctx.createOscillator();
    this.osc2 = ctx.createOscillator();
    this.subOsc = ctx.createOscillator();

    this.updateFrequencies();
    this.updateWavetables();

    this.fmGain.gain.setValueAtTime(this.cross_fm * 200, ctx.currentTime);
    this.subGain.gain.setValueAtTime(this.sub_level * 0.7, ctx.currentTime);
    this.osc1Gain.gain.setValueAtTime(0.6, ctx.currentTime);
    this.osc2Gain.gain.setValueAtTime(0.5, ctx.currentTime);

    this.osc2.connect(this.fmGain);
    this.fmGain.connect(this.osc1.frequency);

    this.osc1.connect(this.osc1Gain);
    this.osc2.connect(this.osc2Gain);
    this.subOsc.connect(this.subGain);

    this.osc1Gain.connect(this.outGain);
    this.osc2Gain.connect(this.outGain);
    this.subGain.connect(this.outGain);

    this.osc1.start();
    this.osc2.start();
    this.subOsc.start();

    this.onMorphUpdate = null;
  }

  getHarmonics(table) {
    if (table === 'ppg_bell') {
      return [0, 1.0, 0.4, 0.7, 0.2, 0.5, 0.1, 0.6, 0.15, 0.4];
    } else if (table === 'vocal_formant') {
      return [0, 1.0, 0.8, 0.1, 0.7, 0.05, 0.6, 0.02, 0.3];
    } else if (table === 'metallic') {
      return [0, 0.8, 0.2, 0.7, 0.1, 0.9, 0.05, 0.6, 0.15, 0.5, 0.2];
    } else if (table === 'harsh_saw') {
      return [0, 1.0, 0.7, 0.5, 0.4, 0.35, 0.3, 0.28, 0.25, 0.22, 0.2, 0.18];
    } else {
      return [0, 1.0, 0.1, 0.9, 0.05, 0.8, 0.02, 0.7, 0.01, 0.5];
    }
  }

  updateWavetables() {
    const h1 = this.getHarmonics(this.table1);
    const h2 = this.getHarmonics(this.table2);
    const maxLen = Math.max(h1.length, h2.length);

    const real = new Float32Array(maxLen);
    const imag = new Float32Array(maxLen);

    for (let i = 1; i < maxLen; i++) {
      const v1 = h1[i] || 0;
      const v2 = h2[i] || 0;
      imag[i] = (1 - this.morph) * v1 + this.morph * v2;
    }

    try {
      const wave = this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
      this.osc1.setPeriodicWave(wave);
      this.osc2.setPeriodicWave(wave);
    } catch (e) {}
  }

  updateFrequencies() {
    const now = this.ctx.currentTime;
    this.osc1.frequency.setTargetAtTime(this.freq1, now, 0.02);
    this.osc2.frequency.setTargetAtTime(this.freq2, now, 0.02);
    this.osc2.detune.setTargetAtTime(this.detune, now, 0.02);
    this.subOsc.frequency.setTargetAtTime(this.freq1 / 2, now, 0.02);
  }

  setParam(name, val) {
    const now = this.ctx.currentTime;
    if (name === 'freq1') {
      this.freq1 = clamp(parseFloat(val), 20, 1200);
      this.updateFrequencies();
    } else if (name === 'freq2') {
      this.freq2 = clamp(parseFloat(val), 20, 1200);
      this.updateFrequencies();
    } else if (name === 'detune') {
      this.detune = clamp(parseFloat(val), -100, 100);
      this.osc2.detune.setTargetAtTime(this.detune, now, 0.02);
    } else if (name === 'table1') {
      this.table1 = val;
      this.updateWavetables();
    } else if (name === 'table2') {
      this.table2 = val;
      this.updateWavetables();
    } else if (name === 'morph') {
      this.morph = clamp(parseFloat(val), 0, 1.0);
      this.updateWavetables();
      if (this.onMorphUpdate) this.onMorphUpdate();
    } else if (name === 'cross_fm') {
      this.cross_fm = clamp(parseFloat(val), 0, 1.0);
      this.fmGain.gain.setTargetAtTime(this.cross_fm * 200, now, 0.02);
    } else if (name === 'sub_level') {
      this.sub_level = clamp(parseFloat(val), 0, 1.0);
      this.subGain.gain.setTargetAtTime(this.sub_level * 0.7, now, 0.02);
    } else if (name === 'spread') {
      this.spread = clamp(parseFloat(val), 0, 1.0);
    }
  }

  getJackOutputNode(jack) {
    return this.outGain;
  }

  getJackInputNode(jack) {
    if (jack === 'scan_cv') return this.scanCvNode;
    return this.fmInNode;
  }

  dispose() {
    try {
      this.osc1.stop();
      this.osc2.stop();
      this.subOsc.stop();
      this.osc1.disconnect();
      this.osc2.disconnect();
      this.subOsc.disconnect();
      this.fmGain.disconnect();
      this.osc1Gain.disconnect();
      this.osc2Gain.disconnect();
      this.subGain.disconnect();
      this.outGain.disconnect();
      this.scanCvNode.disconnect();
      this.fmInNode.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 50. Sidechain Ducking VCA Module
// ---------------------------------------------------------------------------
class SidechainVcaModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'sidechain_vca';

    this.ducking = params.ducking !== undefined ? parseFloat(params.ducking) : 0.8;
    this.threshold = params.threshold !== undefined ? parseFloat(params.threshold) : -12.0;
    this.attack = (params.attack !== undefined ? parseFloat(params.attack) : 2.0) / 1000;
    this.release = (params.release !== undefined ? parseFloat(params.release) : 180.0) / 1000;
    this.mode = params.mode || 'audio_peak';

    this.inputNode = ctx.createGain();
    this.vcaGain = ctx.createGain();
    this.vcaGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.outGain = ctx.createGain();

    this.sidechainNode = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.sidechainNode.connect(this.analyser);

    // CV output for envelope follower
    this.envOutNode = ctx.createGain();
    this.envOutNode.gain.setValueAtTime(0.0, ctx.currentTime);

    this.inputNode.connect(this.vcaGain);
    this.vcaGain.connect(this.outGain);

    this.onReduction = null;
    this.currentReductionDb = 0;
    this.isRunning = true;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.runDetector();
  }

  triggerSidechainPulse(now = null) {
    if (!this.ctx) return;
    const t = now || this.ctx.currentTime;
    const minGain = Math.max(0.01, 1.0 - this.ducking);
    this.vcaGain.gain.cancelScheduledValues(t);
    this.vcaGain.gain.setValueAtTime(this.vcaGain.gain.value, t);
    this.vcaGain.gain.linearRampToValueAtTime(minGain, t + this.attack);
    this.vcaGain.gain.setTargetAtTime(1.0, t + this.attack, this.release);

    const dbRed = 20 * Math.log10(minGain);
    this.currentReductionDb = dbRed;
    if (this.onReduction) this.onReduction(minGain, dbRed);
  }

  runDetector() {
    if (!this.isRunning) return;
    if (this.mode === 'audio_peak' && this.ctx && this.ctx.state === 'running') {
      this.analyser.getByteTimeDomainData(this.dataArray);
      let peak = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        const v = Math.abs((this.dataArray[i] - 128) / 128);
        if (v > peak) peak = v;
      }
      const peakDb = peak > 0.0001 ? 20 * Math.log10(peak) : -60;
      if (peakDb > this.threshold) {
        const excess = Math.min(24, peakDb - this.threshold);
        const duckFactor = Math.min(1.0, (excess / 16) * this.ducking);
        const targetGain = Math.max(0.02, 1.0 - duckFactor);
        const now = this.ctx.currentTime;
        this.vcaGain.gain.setTargetAtTime(targetGain, now, this.attack);
        this.vcaGain.gain.setTargetAtTime(1.0, now + this.attack, this.release);

        const dbRed = 20 * Math.log10(targetGain);
        this.currentReductionDb = dbRed;
        if (this.onReduction) this.onReduction(targetGain, dbRed);
      } else {
        if (Math.abs(this.currentReductionDb) > 0.2) {
          this.currentReductionDb *= 0.85;
          if (this.onReduction) this.onReduction(this.vcaGain.gain.value, this.currentReductionDb);
        }
      }
    }
    this.raf = requestAnimationFrame(() => this.runDetector());
  }

  onConnectJack(jack, fromMod, fromJack) {
    if (jack === 'sidechain') {
      if (typeof fromMod.onConnectOutputJack === 'function') {
        fromMod.onConnectOutputJack(fromJack, this, jack);
      }
    }
  }

  triggerHit(now = null) {
    this.triggerSidechainPulse(now);
  }

  setParam(name, val) {
    if (name === 'ducking') {
      this.ducking = clamp(parseFloat(val), 0, 1.0);
    } else if (name === 'threshold') {
      this.threshold = clamp(parseFloat(val), -40, 0);
    } else if (name === 'attack') {
      this.attack = clamp(parseFloat(val), 0.5, 50) / 1000;
    } else if (name === 'release') {
      this.release = clamp(parseFloat(val), 20, 800) / 1000;
    } else if (name === 'mode') {
      this.mode = val;
    }
  }

  getJackOutputNode(jack) {
    if (jack === 'env_out') return this.envOutNode;
    return this.outGain;
  }

  getJackInputNode(jack) {
    if (jack === 'sidechain') return this.sidechainNode;
    return this.inputNode;
  }

  dispose() {
    this.isRunning = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    try {
      this.inputNode.disconnect();
      this.vcaGain.disconnect();
      this.outGain.disconnect();
      this.sidechainNode.disconnect();
      this.analyser.disconnect();
      this.envOutNode.disconnect();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// 51. 16-Step TR Drum Matrix Sequencer Module
// ---------------------------------------------------------------------------
class TrMatrixSeqModule {
  constructor(ctx, id, params = {}) {
    this.ctx = ctx;
    this.id = id;
    this.type = 'tr_matrix_seq';

    this.bpm = params.bpm || 128;
    this.swing = params.swing !== undefined ? parseFloat(params.swing) : 15;
    this.accent = params.accent !== undefined ? parseFloat(params.accent) : 0.6;
    this.steps = params.steps !== undefined ? parseInt(params.steps) : 16;
    this.run = params.run || 'running';
    this.isRunning = (this.run === 'running');

    this.currentStep = 0;
    this.patterns = {
      bd: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      sd: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      ch: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      oh: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    };

    this.clockInputNode = ctx.createGain();
    this.resetInputNode = ctx.createGain();

    this.trigNodes = {
      trig_bd: ctx.createGain(),
      trig_sd: ctx.createGain(),
      trig_ch: ctx.createGain(),
      trig_oh: ctx.createGain(),
      accent_out: ctx.createGain(),
    };

    this.clickOscs = [];
    for (const node of Object.values(this.trigNodes)) {
      node.gain.setValueAtTime(0.0, ctx.currentTime);
      const clickOsc = ctx.createOscillator();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(800, ctx.currentTime);
      clickOsc.connect(node);
      try { clickOsc.start(); } catch (e) {}
      this.clickOscs.push(clickOsc);
    }

    this.connectedTargets = {
      trig_bd: new Set(),
      trig_sd: new Set(),
      trig_ch: new Set(),
      trig_oh: new Set(),
      accent_out: new Set(),
    };

    this.onStep = null;
    this.runClock();
  }

  onConnectOutputJack(fromJack, toMod, toJack) {
    if (this.connectedTargets[fromJack]) {
      this.connectedTargets[fromJack].add({ mod: toMod, jack: toJack });
    }
  }

  onDisconnectOutputJack(fromJack, toMod, toJack) {
    if (this.connectedTargets[fromJack]) {
      for (const target of this.connectedTargets[fromJack]) {
        if (target.mod === toMod && target.jack === toJack) {
          this.connectedTargets[fromJack].delete(target);
          break;
        }
      }
    }
  }

  toggleStep(track, step) {
    const trk = track.toLowerCase();
    if (!this.patterns[trk]) return 0;
    const curr = this.patterns[trk][step] || 0;
    const next = curr === 1 ? 0 : 1;
    this.patterns[trk][step] = next;
    return next;
  }

  clearPattern() {
    for (const trk of Object.keys(this.patterns)) {
      this.patterns[trk] = new Array(16).fill(0);
    }
  }

  randomizePattern() {
    const bd = [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0];
    if (Math.random() < 0.5) bd[10] = 1;
    if (Math.random() < 0.3) bd[14] = 1;
    const sd = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
    if (Math.random() < 0.4) sd[15] = 1;
    const ch = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const oh = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];
    this.patterns = { bd, sd, ch, oh };
  }

  runClock() {
    if (!this.isRunning) return;
    const now = this.ctx.currentTime;
    const s = this.currentStep;

    const hitBd = this.patterns.bd && this.patterns.bd[s] === 1;
    const hitSd = this.patterns.sd && this.patterns.sd[s] === 1;
    const hitCh = this.patterns.ch && this.patterns.ch[s] === 1;
    const hitOh = this.patterns.oh && this.patterns.oh[s] === 1;
    const isAccented = (s === 0 || s === 4 || s === 8 || s === 12);

    // Accented steps hit harder; `accent` (0-1) sets how much harder.
    const velocity = isAccented ? Math.min(1.0, 0.6 + this.accent * 0.4) : 0.6;

    if (hitBd) this.dispatchTrigger('trig_bd', now, velocity);
    if (hitSd) this.dispatchTrigger('trig_sd', now, velocity);
    if (hitCh) this.dispatchTrigger('trig_ch', now, velocity);
    if (hitOh) this.dispatchTrigger('trig_oh', now, velocity);
    if (isAccented) this.dispatchTrigger('accent_out', now, velocity);

    if (this.onStep) this.onStep(s);

    const baseInterval = (60000 / this.bpm) / 4;
    let interval = baseInterval;
    if (s % 2 === 1) {
      const swingDelay = (this.swing / 100) * (baseInterval * 0.4);
      interval = baseInterval - swingDelay;
    } else {
      const swingDelay = (this.swing / 100) * (baseInterval * 0.4);
      interval = baseInterval + swingDelay;
    }

    this.currentStep = (this.currentStep + 1) % this.steps;
    scheduleNextTick(this, () => this.runClock(), Math.max(10, interval));
  }

  dispatchTrigger(jack, now, velocity = 1.0) {
    const node = this.trigNodes[jack];
    if (node) {
      try {
        node.gain.cancelScheduledValues(now);
        node.gain.setValueAtTime(velocity, now);
        node.gain.setValueAtTime(0.0, now + 0.015);
      } catch (e) {}
    }
    const targets = this.connectedTargets[jack];
    if (targets) {
      for (const t of targets) {
        if (typeof t.mod.triggerHit === 'function') {
          t.mod.triggerHit(now);
        } else if (typeof t.mod.stepSlice === 'function') {
          t.mod.stepSlice();
        } else if (typeof t.mod.triggerSidechainPulse === 'function') {
          t.mod.triggerSidechainPulse(now);
        }
      }
    }
  }

  resetClock(now = null) {
    clearTimeout(this.timer);
    this._nextTickTime = null;
    this.currentStep = 0;
    this.runClock();
  }

  setParam(name, val) {
    if (name === 'bpm') {
      this.bpm = clamp(Math.round(val), 30, 240);
    } else if (name === 'swing') {
      this.swing = clamp(parseFloat(val), 0, 75);
    } else if (name === 'accent') {
      this.accent = clamp(parseFloat(val), 0, 1.0);
    } else if (name === 'steps') {
      this.steps = clamp(parseInt(val), 1, 16);
    } else if (name === 'run') {
      this.run = val;
      this.isRunning = (val === 'running');
      if (this.isRunning) this.runClock();
      else clearTimeout(this.timer);
    }
  }

  getJackOutputNode(jack) {
    return this.trigNodes[jack] || this.trigNodes.trig_bd;
  }

  getJackInputNode(jack) {
    if (jack === 'reset') return this.resetInputNode;
    return this.clockInputNode;
  }

  dispose() {
    this.isRunning = false;
    clearTimeout(this.timer);
    try {
      this.clockInputNode.disconnect();
      this.resetInputNode.disconnect();
      for (const node of Object.values(this.trigNodes)) {
        node.disconnect();
      }
      for (const osc of this.clickOscs) {
        try { osc.stop(); } catch (e) {}
        osc.disconnect();
      }
    } catch (e) {}
  }
}

window.DspEngine = DspEngine;




