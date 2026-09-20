/**
 * OmoModular Eurorack UI System
 * Renders modular faceplates, rotary knobs, 3.5mm jacks, oscilloscope, and module drawer.
 */

const MODULE_DEFINITIONS = {
  vco: {
    name: 'DUAL DRONE VCO',
    category: 'Source',
    styleClass: 'panel-style-moog',
    knobType: 'knob-moog',
    width: 200,
    desc: 'Dual analog waveform oscillators with micro-detune, sub-octave, and cross-FM.',
    inputs: [],
    outputs: ['out'],
    controls: [
      { id: 'freq1', label: 'PITCH', type: 'knob', min: 20, max: 800, default: 55, unit: 'Hz', step: 0.5 },
      { id: 'detune2', label: 'DETUNE', type: 'knob', min: -50, max: 50, default: 7, unit: 'ct', step: 1 },
      { id: 'subLevel', label: 'SUB LVL', type: 'knob', min: 0, max: 1, default: 0.5, unit: '', step: 0.01 },
      { id: 'fmDepth', label: 'CROSS FM', type: 'knob', min: 0, max: 1, default: 0.15, unit: '', step: 0.01 },
      { id: 'drift', label: 'DRIFT', type: 'knob', min: 0, max: 1, default: 0.3, unit: '', step: 0.01 },
      { id: 'wave1', label: 'WAVE 1', type: 'select', options: ['sawtooth', 'triangle', 'sine', 'square'], default: 'sawtooth' },
      { id: 'wave2', label: 'WAVE 2', type: 'select', options: ['sine', 'triangle', 'sawtooth', 'square'], default: 'sine' },
    ],
  },
  noise: {
    name: 'NOISE & TEXTURE',
    category: 'Source',
    styleClass: 'panel-style-fr4',
    knobType: 'knob-davies',
    width: 170,
    desc: 'Analog noise generator (White, Pink, Brown) with tape/vinyl texture.',
    inputs: [],
    outputs: ['out'],
    controls: [
      { id: 'level', label: 'LEVEL', type: 'knob', min: 0, max: 1, default: 0.4, unit: '', step: 0.01 },
      { id: 'color', label: 'COLOR', type: 'select', options: ['brown', 'pink', 'white'], default: 'brown' },
    ],
  },
  filter: {
    name: 'LADDER FILTER',
    category: 'Filter',
    styleClass: 'panel-style-moog',
    knobType: 'knob-moog',
    width: 180,
    desc: 'Resonant 24dB ladder filter with saturation drive and self-oscillation.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'cutoff', label: 'CUTOFF', type: 'knob', min: 30, max: 12000, default: 440, unit: 'Hz', step: 1, log: true },
      { id: 'resonance', label: 'RES (Q)', type: 'knob', min: 0.1, max: 18, default: 4.5, unit: '', step: 0.1 },
      { id: 'drive', label: 'DRIVE', type: 'knob', min: 1, max: 5, default: 1.3, unit: '', step: 0.1 },
      { id: 'mode', label: 'MODE', type: 'select', options: ['lowpass', 'bandpass', 'highpass'], default: 'lowpass' },
    ],
  },
  wavefolder: {
    name: 'WAVEFOLDER',
    category: 'Distortion',
    styleClass: 'panel-style-fr4',
    knobType: 'knob-davies',
    width: 180,
    desc: 'Trigonometric harmonic wavefolder with soft-clipping analog saturation.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'drive', label: 'DRIVE', type: 'knob', min: 0.5, max: 5, default: 2.2, unit: '', step: 0.1 },
      { id: 'folds', label: 'FOLDS', type: 'knob', min: 0.5, max: 6, default: 2.5, unit: '', step: 0.1 },
      { id: 'mix', label: 'DRY/WET', type: 'knob', min: 0, max: 1, default: 0.8, unit: '', step: 0.01 },
    ],
  },
  bitcrusher: {
    name: 'BITCRUSHER',
    category: 'Lo-Fi',
    styleClass: 'panel-style-fr4',
    knobType: 'knob-davies',
    width: 170,
    desc: 'Digital downsampling decimation and bit-depth quantization crunch.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'bits', label: 'BITS', type: 'knob', min: 2, max: 16, default: 6, unit: 'bit', step: 1 },
      { id: 'rateReduction', label: 'CRUSH', type: 'knob', min: 1, max: 32, default: 8, unit: 'x', step: 1 },
    ],
  },
  delay: {
    name: 'TAPE DELAY',
    category: 'Time',
    styleClass: 'panel-style-vintage',
    knobType: 'knob-moog',
    width: 190,
    desc: 'Stereo tape delay with feedback, high-frequency damping, and wow/flutter.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'time', label: 'TIME', type: 'knob', min: 20, max: 1500, default: 450, unit: 'ms', step: 5 },
      { id: 'feedback', label: 'FBACK', type: 'knob', min: 0, max: 0.95, default: 0.52, unit: '', step: 0.01 },
      { id: 'damping', label: 'DAMP', type: 'knob', min: 300, max: 10000, default: 2200, unit: 'Hz', step: 50 },
      { id: 'flutter', label: 'FLUTTER', type: 'knob', min: 0, max: 1, default: 0.25, unit: '', step: 0.01 },
      { id: 'mix', label: 'DRY/WET', type: 'knob', min: 0, max: 1, default: 0.45, unit: '', step: 0.01 },
    ],
  },
  reverb: {
    name: 'SPACE REVERB',
    category: 'Space',
    styleClass: 'panel-style-vintage',
    knobType: 'knob-moog',
    width: 180,
    desc: 'Lush ambient diffusion reverb for infinite ethereal drone washes.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'decay', label: 'DECAY', type: 'knob', min: 0.5, max: 12, default: 5.5, unit: 's', step: 0.1 },
      { id: 'mix', label: 'DRY/WET', type: 'knob', min: 0, max: 1, default: 0.6, unit: '', step: 0.01 },
    ],
  },
  mixer: {
    name: '8-CH MASTER MIXING CONSOLE',
    category: 'Master',
    styleClass: 'panel-style-digital',
    knobType: 'knob-trimpot',
    width: '100%',
    desc: 'Full-length 8-channel stereo master console with per-channel gain, pan, mute, solo, and live master oscilloscope.',
    inputs: ['in1', 'in2', 'in3', 'in4', 'in5', 'in6', 'in7', 'in8'],
    outputs: [],
    controls: [
      { id: 'ch1_gain', label: 'CH 1', type: 'knob', min: 0, max: 1.2, default: 0.85, unit: '', step: 0.01 },
      { id: 'ch1_pan', label: 'PAN 1', type: 'knob', min: -1, max: 1, default: 0, unit: '', step: 0.05 },
      { id: 'ch2_gain', label: 'CH 2', type: 'knob', min: 0, max: 1.2, default: 0.85, unit: '', step: 0.01 },
      { id: 'ch2_pan', label: 'PAN 2', type: 'knob', min: -1, max: 1, default: 0, unit: '', step: 0.05 },
      { id: 'ch3_gain', label: 'CH 3', type: 'knob', min: 0, max: 1.2, default: 0.0, unit: '', step: 0.01 },
      { id: 'ch3_pan', label: 'PAN 3', type: 'knob', min: -1, max: 1, default: 0, unit: '', step: 0.05 },
      { id: 'ch4_gain', label: 'CH 4', type: 'knob', min: 0, max: 1.2, default: 0.0, unit: '', step: 0.01 },
      { id: 'ch4_pan', label: 'PAN 4', type: 'knob', min: -1, max: 1, default: 0, unit: '', step: 0.05 },
      { id: 'ch5_gain', label: 'CH 5', type: 'knob', min: 0, max: 1.2, default: 0.0, unit: '', step: 0.01 },
      { id: 'ch5_pan', label: 'PAN 5', type: 'knob', min: -1, max: 1, default: 0, unit: '', step: 0.05 },
      { id: 'ch6_gain', label: 'CH 6', type: 'knob', min: 0, max: 1.2, default: 0.0, unit: '', step: 0.01 },
      { id: 'ch6_pan', label: 'PAN 6', type: 'knob', min: -1, max: 1, default: 0, unit: '', step: 0.05 },
      { id: 'ch7_gain', label: 'CH 7', type: 'knob', min: 0, max: 1.2, default: 0.0, unit: '', step: 0.01 },
      { id: 'ch7_pan', label: 'PAN 7', type: 'knob', min: -1, max: 1, default: 0, unit: '', step: 0.05 },
      { id: 'ch8_gain', label: 'CH 8', type: 'knob', min: 0, max: 1.2, default: 0.0, unit: '', step: 0.01 },
      { id: 'ch8_pan', label: 'PAN 8', type: 'knob', min: -1, max: 1, default: 0, unit: '', step: 0.05 },
    ],
  },
  swarm: {
    name: 'CHORD SWARM VCO',
    category: 'Source',
    styleClass: 'panel-style-makenois',
    knobType: 'knob-davies',
    width: 210,
    desc: '4-voice supersaw & chord drone cluster with spread detuning and sub-bass.',
    inputs: [],
    outputs: ['out'],
    controls: [
      { id: 'freq', label: 'ROOT', type: 'knob', min: 25, max: 500, default: 65.41, unit: 'Hz', step: 0.5 },
      { id: 'spread', label: 'SPREAD', type: 'knob', min: 0, max: 50, default: 14, unit: 'ct', step: 1 },
      { id: 'subLevel', label: 'SUB BASS', type: 'knob', min: 0, max: 1, default: 0.45, unit: '', step: 0.01 },
      { id: 'chord', label: 'CHORD', type: 'select', options: ['minor7', 'major7', 'fifth', 'sus4', 'unison'], default: 'minor7' },
      { id: 'wave', label: 'WAVE', type: 'select', options: ['sawtooth', 'triangle', 'square', 'sine'], default: 'sawtooth' },
    ],
  },
  granular: {
    name: 'GRANULAR CLOUDS',
    category: 'Texture',
    styleClass: 'panel-style-makenois',
    knobType: 'knob-davies',
    width: 190,
    desc: 'Real-time micro-sampling grain texture cloud generator with pitch spray.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'grainSize', label: 'SIZE', type: 'knob', min: 0.02, max: 0.4, default: 0.12, unit: 's', step: 0.01 },
      { id: 'density', label: 'DENSITY', type: 'knob', min: 2, max: 25, default: 8, unit: 'x', step: 1 },
      { id: 'pitchSpray', label: 'SPRAY', type: 'knob', min: 0, max: 1, default: 0.35, unit: '', step: 0.01 },
      { id: 'mix', label: 'DRY/WET', type: 'knob', min: 0, max: 1, default: 0.7, unit: '', step: 0.01 },
    ],
  },
  resonator: {
    name: 'KARPLUS RESONATOR',
    category: 'Physical',
    styleClass: 'panel-style-makenois',
    knobType: 'knob-davies',
    width: 180,
    desc: 'Tuned string and metallic plate physical modeling resonator.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'freq', label: 'TUNE', type: 'knob', min: 30, max: 800, default: 130.81, unit: 'Hz', step: 1 },
      { id: 'decay', label: 'DECAY', type: 'knob', min: 0.5, max: 0.99, default: 0.94, unit: '', step: 0.01 },
      { id: 'damping', label: 'DAMP', type: 'knob', min: 300, max: 12000, default: 3500, unit: 'Hz', step: 50 },
      { id: 'mix', label: 'DRY/WET', type: 'knob', min: 0, max: 1, default: 0.8, unit: '', step: 0.01 },
    ],
  },
  formant: {
    name: 'FORMANT FILTER',
    category: 'Filter',
    styleClass: 'panel-style-euro',
    knobType: 'knob-sifam',
    width: 180,
    desc: 'Dual-peak vocal tract filter morphing across English vowel formants (A-E-I-O-U).',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'vowel', label: 'VOWEL', type: 'knob', min: 1, max: 5, default: 1, unit: '', step: 0.05 },
      { id: 'resonance', label: 'PEAK (Q)', type: 'knob', min: 1, max: 20, default: 8, unit: '', step: 0.2 },
    ],
  },
  chorus: {
    name: 'DIMENSION CHORUS',
    category: 'Modulation',
    styleClass: 'panel-style-vintage',
    knobType: 'knob-moog',
    width: 180,
    desc: 'Multi-voice bucket brigade delay stereo chorus and flanger.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'rate', label: 'RATE', type: 'knob', min: 0.1, max: 6, default: 0.8, unit: 'Hz', step: 0.05 },
      { id: 'depth', label: 'DEPTH', type: 'knob', min: 0, max: 1, default: 0.55, unit: '', step: 0.01 },
      { id: 'mix', label: 'DRY/WET', type: 'knob', min: 0, max: 1, default: 0.6, unit: '', step: 0.01 },
    ],
  },
  phaser: {
    name: 'OPTICAL PHASER',
    category: 'Modulation',
    styleClass: 'panel-style-vintage',
    knobType: 'knob-moog',
    width: 180,
    desc: '6-stage analog allpass phaser with feedback swoosh.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'rate', label: 'RATE', type: 'knob', min: 0.05, max: 5, default: 0.35, unit: 'Hz', step: 0.02 },
      { id: 'depth', label: 'SWEEP', type: 'knob', min: 0, max: 1, default: 0.7, unit: '', step: 0.01 },
      { id: 'feedback', label: 'FEEDBACK', type: 'knob', min: 0, max: 0.85, default: 0.55, unit: '', step: 0.01 },
      { id: 'mix', label: 'DRY/WET', type: 'knob', min: 0, max: 1, default: 0.65, unit: '', step: 0.01 },
    ],
  },
  ringmod: {
    name: 'RING MODULATOR',
    category: 'Dissonance',
    styleClass: 'panel-style-vintage',
    knobType: 'knob-moog',
    width: 180,
    desc: 'Internal carrier frequency multiplication for alien, metallic, and robotic tones.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'freq', label: 'CARRIER', type: 'knob', min: 2, max: 2000, default: 180, unit: 'Hz', step: 1, log: true },
      { id: 'shape', label: 'SHAPE', type: 'select', options: ['sine', 'triangle', 'square'], default: 'sine' },
      { id: 'mix', label: 'DRY/WET', type: 'knob', min: 0, max: 1, default: 0.75, unit: '', step: 0.01 },
    ],
  },
  autopan: {
    name: 'AUTO-PAN & TREMOLO',
    category: 'Spatial',
    styleClass: 'panel-style-euro',
    knobType: 'knob-sifam',
    width: 170,
    desc: 'Stereo spatial motion and optical amplitude chopper.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'rate', label: 'SPEED', type: 'knob', min: 0.1, max: 12, default: 1.5, unit: 'Hz', step: 0.1 },
      { id: 'depth', label: 'DEPTH', type: 'knob', min: 0, max: 1, default: 0.8, unit: '', step: 0.01 },
      { id: 'shape', label: 'SHAPE', type: 'select', options: ['sine', 'triangle', 'square'], default: 'sine' },
    ],
  },
  wavetable: {
    name: 'WAVETABLE VCO',
    category: 'Source',
    styleClass: 'panel-style-digital',
    knobType: 'knob-trimpot',
    width: 190,
    desc: 'Digital harmonic wavetable oscillator with morphable spectra (Glass, Organ, Vocal, Metallic).',
    inputs: [],
    outputs: ['out'],
    controls: [
      { id: 'freq', label: 'PITCH', type: 'knob', min: 25, max: 800, default: 65.41, unit: 'Hz', step: 0.5 },
      { id: 'subLevel', label: 'SUB BASS', type: 'knob', min: 0, max: 1, default: 0.4, unit: '', step: 0.01 },
      { id: 'table', label: 'TABLE', type: 'select', options: ['glass', 'organ', 'vocal', 'metallic'], default: 'glass' },
    ],
  },
  fm_quad: {
    name: 'FM QUAD OPERATOR',
    category: 'Source',
    styleClass: 'panel-style-digital',
    knobType: 'knob-trimpot',
    width: 210,
    desc: '4-operator cascading frequency modulation synthesizer voice with harmonic ratios.',
    inputs: [],
    outputs: ['out'],
    controls: [
      { id: 'freq', label: 'CARRIER', type: 'knob', min: 25, max: 600, default: 110, unit: 'Hz', step: 1 },
      { id: 'ratio2', label: 'RATIO 2', type: 'knob', min: 0.5, max: 8, default: 2.0, unit: 'x', step: 0.5 },
      { id: 'ratio3', label: 'RATIO 3', type: 'knob', min: 0.5, max: 8, default: 3.5, unit: 'x', step: 0.5 },
      { id: 'index', label: 'FM INDEX', type: 'knob', min: 0, max: 2.0, default: 0.6, unit: '', step: 0.01 },
    ],
  },
  percussion: {
    name: 'ANALOG DRUMS',
    category: 'Percussion',
    styleClass: 'panel-style-roland',
    knobType: 'knob-sifam',
    width: 230,
    desc: 'Vintage analog drum synthesizer (808 Sub Kick, Snare Snap, Metallic Hat).',
    inputs: [],
    outputs: ['out'],
    controls: [
      { id: 'bpm', label: 'TEMPO', type: 'knob', min: 40, max: 220, default: 120, unit: 'bpm', step: 1 },
      { id: 'decay', label: 'DECAY', type: 'knob', min: 0.05, max: 1.0, default: 0.35, unit: 's', step: 0.01 },
      { id: 'mode', label: 'SOUND', type: 'select', options: ['808kick', 'snare', 'hihat'], default: '808kick' },
      { id: 'pattern', label: 'PATTERN', type: 'select', options: ['auto', 'four_floor', 'backbeat', 'every_8th', 'syncopated', 'every_16th'], default: 'auto' },
    ],
  },
  acid303: {
    name: 'ACID 303 SYNTH',
    category: 'Source',
    styleClass: 'panel-style-roland',
    knobType: 'knob-sifam',
    width: 230,
    desc: 'Diode-ladder resonant acid bass synth voice with accent sweep and slide.',
    inputs: [],
    outputs: ['out'],
    controls: [
      { id: 'bpm', label: 'TEMPO', type: 'knob', min: 40, max: 220, default: 120, unit: 'bpm', step: 1 },
      { id: 'cutoff', label: 'CUTOFF', type: 'knob', min: 60, max: 6000, default: 420, unit: 'Hz', step: 10, log: true },
      { id: 'resonance', label: 'RES (Q)', type: 'knob', min: 1, max: 24, default: 14, unit: '', step: 0.2 },
      { id: 'envMod', label: 'ENV MOD', type: 'knob', min: 0, max: 1, default: 0.6, unit: '', step: 0.01 },
      { id: 'wave', label: 'WAVE', type: 'select', options: ['sawtooth', 'square'], default: 'sawtooth' },
    ],
  },
  eq7: {
    name: '7-BAND GRAPHIC EQ',
    category: 'Filter',
    styleClass: 'panel-style-digital',
    knobType: 'knob-trimpot',
    width: 240,
    desc: 'Surgical 7-band graphic equalizer for shaping bass, mids, and air frequencies.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'b_60', label: '60Hz', type: 'knob', min: -12, max: 12, default: 0, unit: 'dB', step: 0.5 },
      { id: 'b_150', label: '150Hz', type: 'knob', min: -12, max: 12, default: 0, unit: 'dB', step: 0.5 },
      { id: 'b_400', label: '400Hz', type: 'knob', min: -12, max: 12, default: 0, unit: 'dB', step: 0.5 },
      { id: 'b_1000', label: '1kHz', type: 'knob', min: -12, max: 12, default: 0, unit: 'dB', step: 0.5 },
      { id: 'b_2400', label: '2.4kHz', type: 'knob', min: -12, max: 12, default: 0, unit: 'dB', step: 0.5 },
      { id: 'b_6000', label: '6kHz', type: 'knob', min: -12, max: 12, default: 0, unit: 'dB', step: 0.5 },
    ],
  },
  comb: {
    name: 'COMB RESONATOR',
    category: 'Filter',
    styleClass: 'panel-style-euro',
    knobType: 'knob-sifam',
    width: 180,
    desc: 'Dual comb filter creating flanged ringing resonances and acoustic chamber peaks.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'freq', label: 'PITCH', type: 'knob', min: 40, max: 1200, default: 220, unit: 'Hz', step: 1 },
      { id: 'feedback', label: 'FEEDBACK', type: 'knob', min: 0, max: 0.98, default: 0.85, unit: '', step: 0.01 },
      { id: 'mix', label: 'DRY/WET', type: 'knob', min: 0, max: 1, default: 0.7, unit: '', step: 0.01 },
    ],
  },
  compressor: {
    name: 'VCA COMPRESSOR',
    category: 'Dynamics',
    styleClass: 'panel-style-euro',
    knobType: 'knob-sifam',
    width: 190,
    desc: 'Analog VCA dynamics compressor and makeup gain level maximizer.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'threshold', label: 'THRESH', type: 'knob', min: -40, max: 0, default: -18, unit: 'dB', step: 1 },
      { id: 'ratio', label: 'RATIO', type: 'knob', min: 1, max: 16, default: 4, unit: ':1', step: 0.5 },
      { id: 'makeup', label: 'MAKEUP', type: 'knob', min: 0.8, max: 2.5, default: 1.3, unit: 'x', step: 0.05 },
    ],
  },
  fuzz: {
    name: 'GERMANIUM FUZZ',
    category: 'Distortion',
    styleClass: 'panel-style-fr4',
    knobType: 'knob-davies',
    width: 180,
    desc: 'Vintage Germanium diode asymmetric saturation and fuzzy harmonic breakup.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'gain', label: 'FUZZ', type: 'knob', min: 1, max: 20, default: 8, unit: '', step: 0.5 },
      { id: 'tone', label: 'TONE', type: 'knob', min: 600, max: 10000, default: 3200, unit: 'Hz', step: 100 },
      { id: 'mix', label: 'DRY/WET', type: 'knob', min: 0, max: 1, default: 0.85, unit: '', step: 0.01 },
    ],
  },
  shimmer: {
    name: 'SHIMMER REVERB',
    category: 'Space',
    styleClass: 'panel-style-vintage',
    knobType: 'knob-moog',
    width: 190,
    desc: 'Celestial ambient shimmer reverb with octave-transposed infinite feedback.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'decay', label: 'DECAY', type: 'knob', min: 1, max: 14, default: 8.0, unit: 's', step: 0.2 },
      { id: 'mix', label: 'DRY/WET', type: 'knob', min: 0, max: 1, default: 0.75, unit: '', step: 0.01 },
    ],
  },
  sequencer: {
    name: '8-STEP GATE SEQ',
    category: 'Utility',
    styleClass: 'panel-style-roland',
    knobType: 'knob-sifam',
    width: 180,
    desc: 'Rhythmic 8-step volume chopper and sync gate pulse generator.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'bpm', label: 'TEMPO', type: 'knob', min: 50, max: 220, default: 110, unit: 'bpm', step: 1 },
    ],
  },
  mult: {
    name: 'SIGNAL MULT & INV',
    category: 'Utility',
    styleClass: 'panel-style-euro',
    knobType: 'knob-sifam',
    width: 110,
    desc: '1-to-3 audio signal splitter with dual direct outs and phase inverted output.',
    inputs: ['in'],
    outputs: ['out1', 'out2', 'inv'],
    controls: [],
  },
  euclid: {
    name: 'EUCLIDEAN RHYTHM',
    category: 'Utility',
    styleClass: 'panel-style-euro',
    knobType: 'knob-sifam',
    width: 180,
    desc: 'Euclidean pulse generator (E(k,n)) for intricate polyrhythms with pulse audio click.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'bpm', label: 'BPM', type: 'knob', min: 40, max: 240, default: 120, unit: 'bpm', step: 1 },
      { id: 'steps', label: 'STEPS', type: 'knob', min: 2, max: 16, default: 16, unit: '', step: 1 },
      { id: 'pulses', label: 'PULSES', type: 'knob', min: 1, max: 16, default: 7, unit: '', step: 1 },
      { id: 'offset', label: 'OFFSET', type: 'knob', min: 0, max: 15, default: 0, unit: '', step: 1 },
    ],
  },
  turing: {
    name: 'TURING MACHINE',
    category: 'Source',
    styleClass: 'panel-style-makenois',
    knobType: 'knob-davies',
    width: 190,
    desc: 'Pseudo-random looping shift register generating evolving quantized melodies.',
    inputs: [],
    outputs: ['out'],
    controls: [
      { id: 'rate', label: 'RATE', type: 'knob', min: 0.5, max: 20, default: 4, unit: 'Hz', step: 0.5 },
      { id: 'length', label: 'LENGTH', type: 'knob', min: 4, max: 32, default: 16, unit: '', step: 1 },
      { id: 'lock', label: 'LOCK', type: 'knob', min: 0, max: 1, default: 0.85, unit: '', step: 0.01 },
      { id: 'scale', label: 'SCALE', type: 'select', options: ['minor', 'pentatonic', 'dorian', 'chromatic'], default: 'minor' },
    ],
  },
  sample_hold: {
    name: 'SAMPLE & HOLD',
    category: 'Utility',
    styleClass: 'panel-style-fr4',
    knobType: 'knob-davies',
    width: 170,
    desc: 'Analog sample-and-hold circuit with internal noise and slew glide.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'rate', label: 'RATE', type: 'knob', min: 0.5, max: 30, default: 6, unit: 'Hz', step: 0.5 },
      { id: 'glide', label: 'GLIDE', type: 'knob', min: 0, max: 0.5, default: 0.05, unit: 's', step: 0.01 },
      { id: 'source', label: 'SRC', type: 'select', options: ['internal_noise', 'input_jack'], default: 'internal_noise' },
    ],
  },
  adsr: {
    name: 'ADSR ENVELOPE',
    category: 'Modulation',
    styleClass: 'panel-style-euro',
    knobType: 'knob-sifam',
    width: 180,
    desc: '4-stage envelope generator with VCA and auto-looping cycle mode.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'attack', label: 'ATTACK', type: 'knob', min: 1, max: 2000, default: 40, unit: 'ms', step: 5 },
      { id: 'decay', label: 'DECAY', type: 'knob', min: 10, max: 3000, default: 250, unit: 'ms', step: 10 },
      { id: 'sustain', label: 'SUSTAIN', type: 'knob', min: 0, max: 1, default: 0.6, unit: '', step: 0.01 },
      { id: 'release', label: 'RELEASE', type: 'knob', min: 10, max: 4000, default: 600, unit: 'ms', step: 10 },
      { id: 'cycle', label: 'MODE', type: 'select', options: ['loop', 'trigger'], default: 'loop' },
    ],
  },
  maths: {
    name: 'MATHS FUNCTION',
    category: 'Modulation',
    styleClass: 'panel-style-makenois',
    knobType: 'knob-davies',
    width: 190,
    desc: 'Dual slew & function generator with log-to-exp curve shaping and cycle mode.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'rise', label: 'RISE', type: 'knob', min: 5, max: 2000, default: 80, unit: 'ms', step: 5 },
      { id: 'fall', label: 'FALL', type: 'knob', min: 10, max: 3000, default: 350, unit: 'ms', step: 10 },
      { id: 'curve', label: 'CURVE', type: 'knob', min: -1, max: 1, default: 0, unit: '', step: 0.05 },
      { id: 'level', label: 'LEVEL', type: 'knob', min: 0, max: 1, default: 0.8, unit: '', step: 0.01 },
    ],
  },
  harmonic: {
    name: 'HARMONIC OSC',
    category: 'Source',
    styleClass: 'panel-style-makenois',
    knobType: 'knob-davies',
    width: 220,
    desc: 'Additive sine generator with fundamental pitch and 6 overtone sliders.',
    inputs: [],
    outputs: ['out'],
    controls: [
      { id: 'freq', label: 'PITCH', type: 'knob', min: 30, max: 600, default: 110, unit: 'Hz', step: 0.5 },
      { id: 'h1', label: '1ST (F0)', type: 'knob', min: 0, max: 1, default: 0.9, unit: '', step: 0.01 },
      { id: 'h2', label: '2ND', type: 'knob', min: 0, max: 1, default: 0.5, unit: '', step: 0.01 },
      { id: 'h3', label: '3RD', type: 'knob', min: 0, max: 1, default: 0.4, unit: '', step: 0.01 },
      { id: 'h4', label: '4TH', type: 'knob', min: 0, max: 1, default: 0.25, unit: '', step: 0.01 },
      { id: 'h5', label: '5TH', type: 'knob', min: 0, max: 1, default: 0.15, unit: '', step: 0.01 },
      { id: 'h6', label: '6TH', type: 'knob', min: 0, max: 1, default: 0.1, unit: '', step: 0.01 },
    ],
  },
  bytebeat: {
    name: 'BYTEBEAT GLITCH',
    category: 'Lo-Fi',
    styleClass: 'panel-style-fr4',
    knobType: 'knob-davies',
    width: 180,
    desc: 'Algorithmic C-style one-line mathematical bytebeat oscillator.',
    inputs: [],
    outputs: ['out'],
    controls: [
      { id: 'clock', label: 'CLOCK', type: 'knob', min: 4000, max: 24000, default: 8000, unit: 'Hz', step: 500 },
      { id: 'algo', label: 'ALGO', type: 'select', options: ['viznut', 'crowd', 'fractal', 'acid_glitch'], default: 'viznut' },
      { id: 'p1', label: 'PARAM 1', type: 'knob', min: 1, max: 32, default: 5, unit: '', step: 1 },
      { id: 'p2', label: 'PARAM 2', type: 'knob', min: 1, max: 16, default: 7, unit: '', step: 1 },
    ],
  },
  spring: {
    name: 'SPRING REVERB',
    category: 'Space',
    styleClass: 'panel-style-vintage',
    knobType: 'knob-moog',
    width: 180,
    desc: 'Mechanical dual-spring tank emulator with coil saturation and tension damping.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'tension', label: 'TENSION', type: 'knob', min: 0.1, max: 5, default: 2.2, unit: 's', step: 0.1 },
      { id: 'drive', label: 'DRIVE', type: 'knob', min: 1, max: 4, default: 1.8, unit: '', step: 0.1 },
      { id: 'damp', label: 'DAMP', type: 'knob', min: 1000, max: 8000, default: 3400, unit: 'Hz', step: 100 },
      { id: 'mix', label: 'DRY/WET', type: 'knob', min: 0, max: 1, default: 0.55, unit: '', step: 0.01 },
    ],
  },
  pingpong: {
    name: 'STEREO PING-PONG',
    category: 'Time',
    styleClass: 'panel-style-vintage',
    knobType: 'knob-moog',
    width: 190,
    desc: 'Cross-feedback dual stereo delay bouncing between left and right channels.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'time', label: 'TIME', type: 'knob', min: 30, max: 1000, default: 320, unit: 'ms', step: 10 },
      { id: 'feedback', label: 'FBACK', type: 'knob', min: 0, max: 0.95, default: 0.6, unit: '', step: 0.01 },
      { id: 'spread', label: 'SPREAD', type: 'knob', min: 0, max: 1, default: 0.85, unit: '', step: 0.01 },
      { id: 'mix', label: 'DRY/WET', type: 'knob', min: 0, max: 1, default: 0.5, unit: '', step: 0.01 },
    ],
  },
  svf: {
    name: 'STATE VARIABLE SVF',
    category: 'Filter',
    styleClass: 'panel-style-euro',
    knobType: 'knob-sifam',
    width: 180,
    desc: '12dB/oct Oberheim-style multi-mode SVF morphing LP -> Notch -> HP.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'cutoff', label: 'CUTOFF', type: 'knob', min: 40, max: 12000, default: 650, unit: 'Hz', step: 1 },
      { id: 'res', label: 'RES (Q)', type: 'knob', min: 0.5, max: 15, default: 4.0, unit: '', step: 0.1 },
      { id: 'morph', label: 'MORPH', type: 'knob', min: 0, max: 1, default: 0.25, unit: '', step: 0.01 },
      { id: 'drive', label: 'DRIVE', type: 'knob', min: 1, max: 3, default: 1.2, unit: '', step: 0.1 },
    ],
  },
  rotary: {
    name: 'ROTARY SPEAKER',
    category: 'Spatial',
    styleClass: 'panel-style-vintage',
    knobType: 'knob-moog',
    width: 180,
    desc: 'Leslie 122 rotating horn & drum cabinet simulator with Doppler motion.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'speed', label: 'SPEED', type: 'select', options: ['slow', 'fast', 'brake'], default: 'fast' },
      { id: 'depth', label: 'DEPTH', type: 'knob', min: 0, max: 1, default: 0.7, unit: '', step: 0.01 },
      { id: 'crossover', label: 'CROSSOVER', type: 'knob', min: 400, max: 1200, default: 800, unit: 'Hz', step: 20 },
      { id: 'mix', label: 'DRY/WET', type: 'knob', min: 0, max: 1, default: 0.8, unit: '', step: 0.01 },
    ],
  },
  tape_warmer: {
    name: 'PORTASTUDIO TAPE',
    category: 'Lo-Fi',
    styleClass: 'panel-style-vintage',
    knobType: 'knob-moog',
    width: 180,
    desc: '4-track magnetic cassette simulator with tape saturation, wow, and hiss.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'saturation', label: 'DRIVE', type: 'knob', min: 1, max: 5, default: 2.4, unit: '', step: 0.1 },
      { id: 'warmth', label: 'WARMTH', type: 'knob', min: 0, max: 1, default: 0.65, unit: '', step: 0.01 },
      { id: 'wow', label: 'WOW/FLUT', type: 'knob', min: 0, max: 1, default: 0.35, unit: '', step: 0.01 },
      { id: 'hiss', label: 'HISS', type: 'knob', min: 0, max: 0.3, default: 0.04, unit: '', step: 0.01 },
    ],
  },
  sub_harmonic: {
    name: 'SUB-BASS HARMONIC',
    category: 'Source',
    styleClass: 'panel-style-moog',
    knobType: 'knob-moog',
    width: 180,
    desc: 'Subharmonic frequency divider creating -1 and -2 octave low-end weight.',
    inputs: ['in'],
    outputs: ['out'],
    controls: [
      { id: 'sub1', label: '-1 OCT', type: 'knob', min: 0, max: 1, default: 0.7, unit: '', step: 0.01 },
      { id: 'sub2', label: '-2 OCT', type: 'knob', min: 0, max: 1, default: 0.45, unit: '', step: 0.01 },
      { id: 'lowCut', label: 'LOW CUT', type: 'knob', min: 20, max: 120, default: 35, unit: 'Hz', step: 1 },
    ],
  },
  crossfader: {
    name: 'A/B CROSSFADER',
    category: 'Utility',
    styleClass: 'panel-style-euro',
    knobType: 'knob-sifam',
    width: 170,
    desc: 'Dual-channel crossfader with equal-power trigonometric morphing.',
    inputs: ['inA', 'inB'],
    outputs: ['out'],
    controls: [
      { id: 'fade', label: 'FADE', type: 'knob', min: 0, max: 1, default: 0.5, unit: '', step: 0.01 },
      { id: 'curve', label: 'CURVE', type: 'select', options: ['equal_power', 'linear', 'cut'], default: 'equal_power' },
    ],
  },
  quad_lfo: {
    name: 'QUAD MORPHING LFO',
    category: 'Modulation',
    styleClass: 'panel-style-euro',
    knobType: 'knob-sifam',
    width: 180,
    desc: '4-phase quadrature low-frequency modulation oscillator.',
    inputs: [],
    outputs: ['out'],
    controls: [
      { id: 'rate', label: 'RATE', type: 'knob', min: 0.05, max: 20, default: 1.2, unit: 'Hz', step: 0.05 },
      { id: 'shape', label: 'SHAPE', type: 'select', options: ['sine', 'triangle', 'sawtooth', 'square'], default: 'sine' },
      { id: 'level', label: 'LEVEL', type: 'knob', min: 0, max: 1, default: 0.8, unit: '', step: 0.01 },
    ],
  },
  midi_player: {
    name: 'MIDI FILE PLAYER',
    category: 'Source',
    styleClass: 'panel-style-digital',
    knobType: 'knob-trimpot',
    width: 380,
    desc: 'Multi-track Standard MIDI File player with live track mute/solo mixer, polyphonic synth, CV/Gate outs, and drag-and-drop.',
    inputs: [],
    outputs: ['out', 'pitch', 'gate', 'vel'],
    controls: [
      { id: 'rate', label: 'SPEED', type: 'knob', min: 0.25, max: 3.0, default: 1.0, unit: 'x', step: 0.05 },
      { id: 'transpose', label: 'TRANS', type: 'knob', min: -24, max: 24, default: 0, unit: 'st', step: 1 },
      { id: 'gain', label: 'BOOST', type: 'knob', min: 0.5, max: 4.0, default: 1.8, unit: 'x', step: 0.1 },
      { id: 'level', label: 'LEVEL', type: 'knob', min: 0, max: 2.0, default: 1.0, unit: '', step: 0.01 },
      { id: 'timbre', label: 'TIMBRE', type: 'select', options: ['analog_saw', 'poly_epiano', 'chiptune', 'fm_bell', 'sine_sub'], default: 'analog_saw' },
      { id: 'ratio', label: 'BPM SNAP RATIO', type: 'select', options: ['free', '1x_full', '1/2_half', '1/4_quarter', '1/8_8th', '1/16_16th', '2x_double'], default: 'free' },
    ],
  },
};

class ModularRackUI {
  constructor(rackElement, dspEngine, cableManager) {
    this.rack = rackElement;
    this.dsp = dspEngine;
    this.cables = cableManager;
    this.modulesState = []; // [{ id, type, row, params }]
    this.selectedModuleEl = null;
    this.selectedRowIdx = 0;
    this.modularRows = null;

    this.mixerParams = {
      ch1_gain: 0.85, ch1_pan: 0.0, ch1_mute: false, ch1_solo: false,
      ch2_gain: 0.85, ch2_pan: 0.0, ch2_mute: false, ch2_solo: false,
      ch3_gain: 0.0,  ch3_pan: 0.0, ch3_mute: false, ch3_solo: false,
      ch4_gain: 0.0,  ch4_pan: 0.0, ch4_mute: false, ch4_solo: false,
      ch5_gain: 0.0,  ch5_pan: 0.0, ch5_mute: false, ch5_solo: false,
      ch6_gain: 0.0,  ch6_pan: 0.0, ch6_mute: false, ch6_solo: false,
      ch7_gain: 0.0,  ch7_pan: 0.0, ch7_mute: false, ch7_solo: false,
      ch8_gain: 0.0,  ch8_pan: 0.0, ch8_mute: false, ch8_solo: false,
      master_vol: 0.85,
    };

    this.initMasterRack();
    this.initDrawer();
    this.initMidiDrawer();
    this.initShortcuts();
    this.startOscilloscope();

    window.onJackStatusUpdated = () => this.updateMasterConsolePatchCount();
  }

  initMasterRack() {
    let masterRow = document.getElementById('master-console-rack');
    if (!masterRow) {
      masterRow = document.createElement('div');
      masterRow.id = 'master-console-rack';
      masterRow.classList.add('master-console-row');

      let screws = '';
      for (let i = 0; i < 48; i++) {
        screws += '<div class="rail-screw"></div>';
      }

      let channelsHtml = '';
      for (let i = 1; i <= 8; i++) {
        const defaultGain = (i <= 2) ? 0.85 : 0.0;
        channelsHtml += `
          <div class="console-strip" data-ch="${i}">
            <div class="strip-header">
              <span class="strip-label">CH ${i}</span>
              <div class="strip-signal-led" data-ch="${i}" title="Signal Present"></div>
            </div>
            <div class="strip-jack-zone">
              <div class="jack in-jack" data-module="mixer_1" data-jack="in${i}" data-direction="in" title="CH ${i} Audio In [IN ${i}]">
                <div class="jack-bezel"></div>
                <div class="jack-hole"></div>
              </div>
              <span class="strip-jack-tag">IN ${i}</span>
            </div>
            <div class="strip-buttons">
              <button class="strip-btn strip-mute-btn" data-ch="${i}" title="Mute Channel ${i}">M</button>
              <button class="strip-btn strip-solo-btn" data-ch="${i}" title="Solo Channel ${i}">S</button>
            </div>
            <div class="strip-controls">
              <div class="knob-wrap mini-knob-wrap" data-param="ch${i}_pan">
                <div class="knob mini-knob" data-min="-1" data-max="1" data-step="0.05" data-val="0" data-unit="">
                  <div class="knob-dial"><div class="knob-pointer"></div></div>
                </div>
                <span class="mini-control-label">PAN</span>
                <span class="knob-value mini-knob-val">C</span>
              </div>
              <div class="knob-wrap mini-knob-wrap" data-param="ch${i}_gain">
                <div class="knob mini-knob" data-min="0" data-max="1.2" data-step="0.01" data-val="${defaultGain}" data-unit="">
                  <div class="knob-dial"><div class="knob-pointer"></div></div>
                </div>
                <span class="mini-control-label">LEVEL</span>
                <span class="knob-value mini-knob-val">${this.formatVal(defaultGain, '')}</span>
              </div>
            </div>
          </div>
        `;
      }

      masterRow.innerHTML = `
        <div class="rack-rail top-rail">
          <div class="rail-screws-strip">${screws}</div>
          <div class="master-console-tag">
            <span class="console-led"></span>
            <span class="console-title">MASTER MIXING CONSOLE</span>
            <span class="console-sub">8-CH STEREO BUS &bull; ANALOG SATURATION &bull; LIMITER</span>
          </div>
        </div>
        <div class="master-console-faceplate">
          <div class="console-section console-identity">
            <div class="console-brand-text">OMOMODULAR</div>
            <div class="console-model-badge">MODEL 800-M</div>
            <div class="console-status-row">
              <span class="console-bus-pill">8-CH BUS</span>
              <span class="console-patch-count" id="master-patch-count">0 / 8 PATCHED</span>
            </div>
            <button class="console-reset-btn" id="master-reset-mix-btn" title="Reset all channels to unity level and center pan">FLAT MIX</button>
          </div>
          <div class="console-channels">
            ${channelsHtml}
          </div>
          <div class="console-section console-master-out">
            <div class="console-scope-wrap">
              <div class="scope-header-row">
                <span class="scope-title">SUMMED OUTPUT WAVEFORM</span>
                <span class="scope-fft-badge">1024 FFT</span>
              </div>
              <div class="scope-screen">
                <canvas id="scope-canvas" width="230" height="60"></canvas>
              </div>
            </div>
            <div class="console-master-dial-wrap">
              <div class="knob-wrap" data-param="master_vol">
                <div class="knob" id="console-master-knob" data-min="0" data-max="1.2" data-step="0.01" data-val="0.85" data-unit="">
                  <div class="knob-dial"><div class="knob-pointer"></div></div>
                </div>
                <span class="control-label">MASTER</span>
                <span class="knob-value" id="console-master-val">0.85</span>
              </div>
              <div class="console-limiter-wrap" title="Master Dynamics Protection (Brickwall Limiter)">
                <div class="limiter-led" id="master-limiter-led"></div>
                <span class="limiter-label">LIMITER</span>
              </div>
            </div>
          </div>
        </div>
        <div class="rack-rail bottom-rail">
          <div class="rail-screws-strip">${screws}</div>
        </div>
      `;

      this.rack.prepend(masterRow);
    }

    let modularRows = document.getElementById('modular-rows');
    if (!modularRows) {
      modularRows = document.createElement('div');
      modularRows.id = 'modular-rows';
      this.rack.appendChild(modularRows);
    }
    this.modularRows = modularRows;

    this.bindMasterConsoleEvents(masterRow);
  }

  formatPan(val) {
    const num = parseFloat(val) || 0;
    if (Math.abs(num) < 0.04) return 'C';
    if (num < 0) return `L${Math.round(Math.abs(num) * 100)}`;
    return `R${Math.round(num * 100)}`;
  }

  bindMasterConsoleEvents(masterRow) {
    // Jacks click: unplug connected cable
    masterRow.querySelectorAll('.jack').forEach(jackEl => {
      jackEl.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        const jackName = jackEl.dataset.jack;
        const cable = this.cables.cables.find(
          c => c.to.moduleId === 'mixer_1' && c.to.jack === jackName
        );
        if (cable) {
          e.preventDefault();
          this.cables.removeCable(cable.id);
        }
      });
    });

    // Channel strip knobs and buttons
    masterRow.querySelectorAll('.console-strip').forEach(strip => {
      const ch = strip.dataset.ch;
      const panKnob = strip.querySelector(`.knob-wrap[data-param="ch${ch}_pan"] .knob`);
      const gainKnob = strip.querySelector(`.knob-wrap[data-param="ch${ch}_gain"] .knob`);

      if (panKnob) {
        this.bindKnob(panKnob, (val) => {
          this.mixerParams[`ch${ch}_pan`] = val;
          const dspMixer = this.dsp.modules.get('mixer_1');
          if (dspMixer) dspMixer.setParam(`ch${ch}_pan`, val);

          const valSpan = panKnob.closest('.knob-wrap').querySelector('.knob-value');
          if (valSpan) valSpan.textContent = this.formatPan(val);
          this.syncMixerState();
          if (window.onPatchModified) window.onPatchModified();
        });
      }

      if (gainKnob) {
        this.bindKnob(gainKnob, (val) => {
          this.mixerParams[`ch${ch}_gain`] = val;
          const dspMixer = this.dsp.modules.get('mixer_1');
          if (dspMixer) dspMixer.setParam(`ch${ch}_gain`, val);

          const valSpan = gainKnob.closest('.knob-wrap').querySelector('.knob-value');
          if (valSpan) valSpan.textContent = this.formatVal(val, '');
          this.syncMixerState();
          if (window.onPatchModified) window.onPatchModified();
        });
      }

      const muteBtn = strip.querySelector('.strip-mute-btn');
      if (muteBtn) {
        muteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isMuted = !this.mixerParams[`ch${ch}_mute`];
          this.mixerParams[`ch${ch}_mute`] = isMuted;
          muteBtn.classList.toggle('active', isMuted);
          const dspMixer = this.dsp.modules.get('mixer_1');
          if (dspMixer) dspMixer.setParam(`ch${ch}_mute`, isMuted);
          this.syncMixerState();
          if (window.onPatchModified) window.onPatchModified();
        });
      }

      const soloBtn = strip.querySelector('.strip-solo-btn');
      if (soloBtn) {
        soloBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isSolo = !this.mixerParams[`ch${ch}_solo`];
          this.mixerParams[`ch${ch}_solo`] = isSolo;
          soloBtn.classList.toggle('active', isSolo);
          const dspMixer = this.dsp.modules.get('mixer_1');
          if (dspMixer) dspMixer.setParam(`ch${ch}_solo`, isSolo);
          this.syncMixerState();
          if (window.onPatchModified) window.onPatchModified();
        });
      }
    });

    // Master volume dial
    const masterKnob = masterRow.querySelector('#console-master-knob');
    if (masterKnob) {
      this.bindKnob(masterKnob, (val) => {
        this.mixerParams.master_vol = val;
        this.dsp.setMasterVolume(val);
        const slider = document.getElementById('master-vol');
        if (slider) slider.value = val;
        const valSpan = document.getElementById('console-master-val');
        if (valSpan) valSpan.textContent = this.formatVal(val, '');
        this.syncMixerState();
        if (window.onPatchModified) window.onPatchModified();
      });
    }

    // Flat Mix Reset button
    const resetBtn = masterRow.querySelector('#master-reset-mix-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        for (let i = 1; i <= 8; i++) {
          this.mixerParams[`ch${i}_gain`] = 0.85;
          this.mixerParams[`ch${i}_pan`] = 0.0;
          this.mixerParams[`ch${i}_mute`] = false;
          this.mixerParams[`ch${i}_solo`] = false;
        }
        const dspMixer = this.dsp.modules.get('mixer_1');
        if (dspMixer) {
          for (const [k, v] of Object.entries(this.mixerParams)) {
            dspMixer.setParam(k, v);
          }
        }
        this.updateMasterConsoleUi(this.mixerParams);
        this.syncMixerState();
        if (window.onPatchModified) window.onPatchModified();
      });
    }
  }

  syncMixerState() {
    let m = this.modulesState.find(x => x.id === 'mixer_1' || x.type === 'mixer');
    if (!m) {
      m = { id: 'mixer_1', type: 'mixer', row: -1, params: {} };
      this.modulesState.unshift(m);
    }
    m.params = Object.assign({}, this.mixerParams);
  }

  updateMasterConsoleUi(params) {
    const masterRow = document.getElementById('master-console-rack');
    if (!masterRow) return;

    for (let i = 1; i <= 8; i++) {
      const gVal = params[`ch${i}_gain`] !== undefined ? params[`ch${i}_gain`] : (i <= 2 ? 0.85 : 0.0);
      const pVal = params[`ch${i}_pan`] !== undefined ? params[`ch${i}_pan`] : 0.0;
      const isMuted = !!params[`ch${i}_mute`];
      const isSolo = !!params[`ch${i}_solo`];

      this.mixerParams[`ch${i}_gain`] = gVal;
      this.mixerParams[`ch${i}_pan`] = pVal;
      this.mixerParams[`ch${i}_mute`] = isMuted;
      this.mixerParams[`ch${i}_solo`] = isSolo;

      const strip = masterRow.querySelector(`.console-strip[data-ch="${i}"]`);
      if (strip) {
        const gainKnob = strip.querySelector(`.knob-wrap[data-param="ch${i}_gain"] .knob`);
        if (gainKnob) this.setKnobValue(gainKnob, gVal);

        const panKnob = strip.querySelector(`.knob-wrap[data-param="ch${i}_pan"] .knob`);
        if (panKnob) {
          this.setKnobValue(panKnob, pVal);
          const valSpan = strip.querySelector(`.knob-wrap[data-param="ch${i}_pan"] .knob-value`);
          if (valSpan) valSpan.textContent = this.formatPan(pVal);
        }

        const muteBtn = strip.querySelector('.strip-mute-btn');
        if (muteBtn) muteBtn.classList.toggle('active', isMuted);

        const soloBtn = strip.querySelector('.strip-solo-btn');
        if (soloBtn) soloBtn.classList.toggle('active', isSolo);
      }
    }

    if (params.master_vol !== undefined) {
      this.mixerParams.master_vol = params.master_vol;
      const masterKnob = masterRow.querySelector('#console-master-knob');
      if (masterKnob) this.setKnobValue(masterKnob, params.master_vol);
      const valSpan = document.getElementById('console-master-val');
      if (valSpan) valSpan.textContent = this.formatVal(params.master_vol, '');
    }
  }

  updateMasterConsolePatchCount() {
    const masterRow = document.getElementById('master-console-rack');
    if (!masterRow) return;

    let count = 0;
    for (let i = 1; i <= 8; i++) {
      const hasCable = this.cables.cables.some(
        c => c.to.moduleId === 'mixer_1' && c.to.jack === `in${i}`
      );
      if (hasCable) count++;

      const led = masterRow.querySelector(`.strip-signal-led[data-ch="${i}"]`);
      if (led) led.classList.toggle('active', hasCable);
    }

    const countEl = document.getElementById('master-patch-count');
    if (countEl) {
      countEl.textContent = `${count} / 8 PATCHED`;
      countEl.classList.toggle('active', count > 0);
    }
  }

  getRowCount() {
    return this.modularRows ? this.modularRows.querySelectorAll('.rack-row').length : 0;
  }

  ensureRow(rowIdx) {
    if (!this.modularRows) {
      this.initMasterRack();
    }
    let rowEl = this.modularRows.querySelector(`.rack-row[data-row-idx="${rowIdx}"]`);
    if (rowEl) return rowEl;

    let screws = '';
    for (let i = 0; i < 48; i++) {
      screws += '<div class="rail-screw"></div>';
    }

    rowEl = document.createElement('div');
    rowEl.classList.add('rack-row');
    rowEl.dataset.rowIdx = rowIdx;

    const rmBtn = rowIdx > 0
      ? `<button class="remove-row-btn" data-row="${rowIdx}" title="Remove Empty Row">&times;</button>`
      : '';

    rowEl.innerHTML = `
      <div class="rack-rail top-rail">
        <div class="rail-screws-strip">${screws}</div>
        <div class="row-tag">
          <span class="row-num">ROW ${rowIdx + 1}</span>
          ${rmBtn}
        </div>
      </div>
      <div class="rack-modules-slot" data-row-idx="${rowIdx}"></div>
      <div class="rack-rail bottom-rail">
        <div class="rail-screws-strip">${screws}</div>
      </div>
    `;

    const slot = rowEl.querySelector('.rack-modules-slot');
    if (slot) {
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        const types = Array.from(e.dataTransfer.types || []);
        if (types.includes('text/midi-payload') || types.includes('application/json') || types.includes('Files')) {
          slot.classList.add('slot-midi-drag-over');
        } else if (types.includes('text/module-type')) {
          slot.classList.add('slot-module-drag-over');
        }
      });

      slot.addEventListener('dragleave', (e) => {
        if (!slot.contains(e.relatedTarget)) {
          slot.classList.remove('slot-midi-drag-over');
          slot.classList.remove('slot-module-drag-over');
        }
      });

      slot.addEventListener('drop', async (e) => {
        e.preventDefault();
        slot.classList.remove('slot-midi-drag-over');
        slot.classList.remove('slot-module-drag-over');

        // 1. Dropping a module from catalog
        const modType = e.dataTransfer.getData('text/module-type');
        if (modType && MODULE_DEFINITIONS[modType]) {
          this.selectedRowIdx = rowIdx;
          this.addModule(modType, rowIdx);
          return;
        }

        // 2. Dropping a MIDI file / card
        let midiData = null;
        const jsonStr = e.dataTransfer.getData('text/midi-payload') || e.dataTransfer.getData('application/json');
        if (jsonStr) {
          try { midiData = JSON.parse(jsonStr); } catch (err) {}
        }

        const isLocalFile = e.dataTransfer.files && e.dataTransfer.files.length > 0;

        if (midiData || isLocalFile) {
          let targetMidiMod = this.modulesState.find(m => m.row === rowIdx && m.type === 'midi_player');
          if (!targetMidiMod) {
            targetMidiMod = this.modulesState.find(m => m.type === 'midi_player');
          }
          if (!targetMidiMod) {
            this.selectedRowIdx = rowIdx;
            const newMod = this.addModule('midi_player', rowIdx);
            targetMidiMod = newMod || this.modulesState.find(m => m.type === 'midi_player');
          }

          if (targetMidiMod) {
            const modEl = this.rack.querySelector(`.module-panel[data-id="${targetMidiMod.id}"]`);
            if (modEl) {
              if (isLocalFile) {
                const file = e.dataTransfer.files[0];
                const reader = new FileReader();
                reader.onload = (ev) => {
                  if (typeof modEl._loadBuffer === 'function') {
                    modEl._loadBuffer(ev.target.result, file.name);
                  }
                };
                reader.readAsArrayBuffer(file);
              } else if (midiData && midiData.download_url && typeof modEl._loadMidiUrl === 'function') {
                await modEl._loadMidiUrl(midiData.download_url, midiData.title || midiData.filename, !!midiData.auto_isolate);
              }
            }
          }
        }
      });
    }

    const removeBtn = rowEl.querySelector('.remove-row-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeRow(rowIdx);
      });
    }

    rowEl.addEventListener('click', () => {
      this.selectedRowIdx = rowIdx;
      this.modularRows.querySelectorAll('.rack-row').forEach(r => r.classList.remove('active-row'));
      rowEl.classList.add('active-row');
    });

    this.modularRows.appendChild(rowEl);
    return rowEl;
  }

  addRow() {
    const nextIdx = this.getRowCount();
    this.ensureRow(nextIdx);
    this.selectedRowIdx = nextIdx;
    this.cables.render();
    if (window.onPatchModified) window.onPatchModified();
  }

  removeRow(rowIdx) {
    if (this.getRowCount() <= 1) {
      alert('At least one modular row must remain.');
      return;
    }
    const slot = this.modularRows.querySelector(`.rack-modules-slot[data-row-idx="${rowIdx}"]`);
    if (slot && slot.children.length > 0) {
      alert(`Cannot remove Row ${rowIdx + 1}: remove its modules first.`);
      return;
    }
    const rowEl = this.modularRows.querySelector(`.rack-row[data-row-idx="${rowIdx}"]`);
    if (rowEl) rowEl.remove();

    this.modularRows.querySelectorAll('.rack-row').forEach((r, idx) => {
      r.dataset.rowIdx = idx;
      const numSpan = r.querySelector('.row-num');
      if (numSpan) numSpan.textContent = `ROW ${idx + 1}`;
      const slotEl = r.querySelector('.rack-modules-slot');
      if (slotEl) slotEl.dataset.rowIdx = idx;
      const rm = r.querySelector('.remove-row-btn');
      if (rm) rm.dataset.row = idx;
    });

    this.selectedRowIdx = Math.max(0, rowIdx - 1);
    this.cables.render();
    if (window.onPatchModified) window.onPatchModified();
  }

  renderModule(modData) {
    if (modData.type === 'mixer' || modData.id === 'mixer_1') {
      this.updateMasterConsoleUi(modData.params || {});
      return null;
    }

    const def = MODULE_DEFINITIONS[modData.type];
    if (!def) return null;

    const rowIdx = modData.row !== undefined ? modData.row : (this.selectedRowIdx || 0);
    this.ensureRow(rowIdx);
    const slot = this.modularRows.querySelector(`.rack-modules-slot[data-row-idx="${rowIdx}"]`);

    const el = document.createElement('div');
    el.classList.add('module-panel');
    if (def.styleClass) el.classList.add(def.styleClass);
    el.dataset.id = modData.id;
    el.dataset.type = modData.type;
    el.dataset.row = rowIdx;
    el.style.width = `${def.width}px`;
    const knobType = def.knobType || 'knob-davies';

    // Screw holes (Eurorack authentic)
    const screwsHtml = `
      <div class="screw screw-tl"></div>
      <div class="screw screw-tr"></div>
      <div class="screw screw-bl"></div>
      <div class="screw screw-br"></div>
    `;

    // Header with remove button and snap button
    const hasTempo = (def.controls && def.controls.some(c => c.id === 'bpm')) || modData.type === 'midi_player';
    const snapBtnHtml = hasTempo
      ? `<button class="mod-snap-btn" title="Snap module tempo to Master BPM [⚡]">&#x26A1;</button>`
      : '';
    const removeBtnHtml = modData.type !== 'mixer'
      ? `<button class="mod-remove-btn" title="Remove Module">&times;</button>`
      : '';

    const headerHtml = `
      <div class="module-header">
        <div class="module-title">${def.name}</div>
        <div style="display:flex; align-items:center; gap:2px;">
          ${snapBtnHtml}
          ${removeBtnHtml}
        </div>
      </div>
    `;

    // Controls container
    let controlsHtml = '<div class="module-controls">';
    for (const c of def.controls) {
      const val = modData.params[c.id] !== undefined ? modData.params[c.id] : c.default;
      if (c.type === 'knob') {
        controlsHtml += `
          <div class="knob-wrap" data-param="${c.id}">
            <div class="knob ${knobType}" data-min="${c.min}" data-max="${c.max}" data-step="${c.step || 0.01}" data-val="${val}" data-unit="${c.unit || ''}">
              <div class="knob-dial">
                <div class="knob-pointer"></div>
              </div>
            </div>
            <span class="control-label">${c.label}</span>
            <span class="knob-value">${this.formatVal(val, c.unit)}</span>
          </div>
        `;
      } else if (c.type === 'select') {
        let opts = '';
        for (const opt of c.options) {
          opts += `<option value="${opt}" ${opt === val ? 'selected' : ''}>${opt.toUpperCase()}</option>`;
        }
        controlsHtml += `
          <div class="select-wrap" data-param="${c.id}">
            <span class="control-label">${c.label}</span>
            <select class="mod-select">${opts}</select>
          </div>
        `;
      }
    }
    controlsHtml += '</div>';

    // Oscilloscope screen for Mixer
    let scopeHtml = '';
    if (modData.type === 'mixer') {
      scopeHtml = `
        <div class="scope-container">
          <canvas id="scope-canvas" width="220" height="60"></canvas>
        </div>
      `;
    }

    // Custom faceplate for MIDI Player
    let midiHtml = '';
    if (modData.type === 'midi_player') {
      midiHtml = `
        <div class="midi-player-faceplate" data-mod-id="${modData.id}">
          <div class="midi-file-zone" title="Drag & Drop .mid file here or click Browse">
            <div class="midi-file-info">
              <div class="midi-file-name">NO MIDI LOADED</div>
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <span class="midi-file-sub">DROP .MID FILE HERE</span>
                <button class="midi-use-bpm-btn" style="display:none;" title="Set Master Rack Tempo to this MIDI BPM and snap all sources">&#x26A1; USE AS MASTER</button>
              </div>
            </div>
            <label class="midi-browse-btn" title="Browse local file">
              BROWSE<input type="file" accept=".mid,.midi" class="midi-file-input" style="display:none">
            </label>
          </div>
          <div class="midi-progress-bar-wrap">
            <div class="midi-progress-bar"></div>
          </div>
          <div class="midi-transport-row">
            <button class="midi-transport-btn midi-play-btn active" title="Play / Pause">[&#9654; PLAY]</button>
            <button class="midi-transport-btn midi-rewind-btn" title="Rewind to Downbeat">[&#9198; REWIND]</button>
            <button class="midi-transport-btn midi-loop-btn active" title="Toggle Loop Mode">[&#x27F3; LOOP]</button>
            <select class="midi-loop-snap-select" title="Loop Quantize: snap to musical bars or exact length">
              <option value="auto">SNAP: AUTO</option>
              <option value="1">1 BAR</option>
              <option value="2">2 BARS</option>
              <option value="4">4 BARS</option>
              <option value="8">8 BARS</option>
              <option value="12">12 BARS</option>
              <option value="16">16 BARS</option>
              <option value="exact">EXACT RAW</option>
            </select>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:8px; color:var(--omo-dim); font-weight:700; margin-top:2px;">
            <span>TRACKS / LAYERS</span>
            <span class="midi-track-count">0 TRACKS</span>
          </div>
          <div class="midi-tracks-container">
            <div style="font-size:8px; color:var(--omo-dim); text-align:center; padding:10px 0;">Load a MIDI file to view & mute tracks</div>
          </div>
        </div>
      `;
    }

    // Jacks strip
    const signalType = (jackName, direction) => {
      const n = jackName.toLowerCase();
      if (/gate|trig|clock/.test(n)) return 'gate';
      if (/cv|pitch|vel|v_oct|mod/.test(n)) return 'cv';
      return direction;
    };

    let jacksHtml = '<div class="jacks-strip">';
    if (def.inputs.length > 0) {
      jacksHtml += '<div class="jacks-col inputs-col">';
      for (const inJack of def.inputs) {
        jacksHtml += `
          <div class="jack-wrap" data-signal="${signalType(inJack, 'in')}">
            <span class="jack-label">${inJack.toUpperCase()}</span>
            <div class="jack" data-module="${modData.id}" data-jack="${inJack}" data-direction="in">
              <div class="jack-bezel"></div>
              <div class="jack-hole"></div>
            </div>
          </div>
        `;
      }
      jacksHtml += '</div>';
    }

    if (def.outputs.length > 0) {
      jacksHtml += '<div class="jacks-col outputs-col">';
      for (const outJack of def.outputs) {
        jacksHtml += `
          <div class="jack-wrap" data-signal="${signalType(outJack, 'out')}">
            <span class="jack-label">${outJack.toUpperCase()}</span>
            <div class="jack" data-module="${modData.id}" data-jack="${outJack}" data-direction="out">
              <div class="jack-bezel"></div>
              <div class="jack-hole"></div>
            </div>
          </div>
        `;
      }
      jacksHtml += '</div>';
    }
    jacksHtml += '</div>';

    el.innerHTML = screwsHtml + headerHtml + scopeHtml + midiHtml + controlsHtml + jacksHtml;

    // Attach interaction handlers
    this.bindModuleEvents(el, modData);
    slot.appendChild(el);
    return el;
  }

  bindModuleEvents(el, modData) {
    const modId = modData.id;
    const dspMod = this.dsp.modules.get(modId);

    el.addEventListener('mouseenter', () => { this.selectedModuleEl = el; });

    const rmBtn = el.querySelector('.mod-remove-btn');
    if (rmBtn) {
      rmBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeModule(modId);
      });
    }

    const snapBtn = el.querySelector('.mod-snap-btn');
    if (snapBtn) {
      snapBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.snapSingleModule(modId);
      });
    }

    el.querySelectorAll('.knob').forEach(knobEl => {
      this.bindKnob(knobEl, (val) => {
        const paramId = knobEl.closest('.knob-wrap').dataset.param;
        modData.params[paramId] = val;
        if (dspMod) dspMod.setParam(paramId, val);
        const valSpan = knobEl.closest('.knob-wrap').querySelector('.knob-value');
        const unit = knobEl.dataset.unit || '';
        valSpan.textContent = this.formatVal(val, unit);
        if (window.onPatchModified) window.onPatchModified();
      });
    });

    el.querySelectorAll('.mod-select').forEach(selEl => {
      selEl.addEventListener('change', (e) => {
        const paramId = selEl.closest('.select-wrap').dataset.param;
        const val = e.target.value;
        modData.params[paramId] = val;
        if (dspMod) dspMod.setParam(paramId, val);

        if (modData.type === 'midi_player' && paramId === 'ratio') {
          if (val !== 'free') {
            const ratioMap = {
              '1x_full': 1.0,
              '1/2_half': 0.5,
              '1/4_quarter': 0.25,
              '1/8_8th': 0.125,
              '1/16_16th': 0.0625,
              '2x_double': 2.0
            };
            const ratioVal = ratioMap[val] || 1.0;
            const res = this.dsp.snapModuleBpm(modId, null, ratioVal);
            if (res) {
              modData.params.rate = res.value;
              const knobEl = el.querySelector('.knob-wrap[data-param="rate"] .knob');
              if (knobEl) this.setKnobValue(knobEl, res.value);
            }
          }
        }

        if (window.onPatchModified) window.onPatchModified();
      });
    });

    el.querySelectorAll('.jack').forEach(jackEl => {
      jackEl.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        const isOut = jackEl.dataset.direction === 'out';
        if (isOut) {
          e.preventDefault();
          this.cables.startDragging(jackEl);
        } else {
          const cable = this.cables.cables.find(
            c => c.to.moduleId === modId && c.to.jack === jackEl.dataset.jack
          );
          if (cable) {
            this.cables.removeCable(cable.id);
          } else {
            e.preventDefault();
            this.cables.startDragging(jackEl);
          }
        }
      });
    });

    // Special handlers for MIDI Player faceplate
    if (modData.type === 'midi_player' && dspMod) {
      const faceplate = el.querySelector('.midi-player-faceplate');
      const dropZone = faceplate ? faceplate.querySelector('.midi-file-zone') : null;
      const fileNameEl = faceplate ? faceplate.querySelector('.midi-file-name') : null;
      const fileSubEl = faceplate ? faceplate.querySelector('.midi-file-sub') : null;
      const progressBar = faceplate ? faceplate.querySelector('.midi-progress-bar') : null;
      const playBtn = faceplate ? faceplate.querySelector('.midi-play-btn') : null;
      const rewBtn = faceplate ? faceplate.querySelector('.midi-rewind-btn') : null;
      const loopBtn = faceplate ? faceplate.querySelector('.midi-loop-btn') : null;
      const tracksContainer = faceplate ? faceplate.querySelector('.midi-tracks-container') : null;
      const trackCountEl = faceplate ? faceplate.querySelector('.midi-track-count') : null;
      const fileInput = faceplate ? faceplate.querySelector('.midi-file-input') : null;

      const updateTracksUI = (tracks) => {
        if (!tracksContainer || !tracks) return;
        if (trackCountEl) trackCountEl.textContent = `${tracks.length} TRACKS`;
        tracksContainer.innerHTML = '';
        tracks.forEach(track => {
          const row = document.createElement('div');
          row.classList.add('midi-track-row');
          row.dataset.trackId = track.id;
          const trkVol = track.volume !== undefined ? track.volume : 1.0;
          row.innerHTML = `
            <div class="midi-track-led" data-track-id="${track.id}"></div>
            <div class="midi-track-name" title="${track.name}">${track.name}</div>
            <span class="midi-track-count">${track.notes.length}n</span>
            <input type="range" class="midi-track-vol" min="0" max="2.5" step="0.05" value="${trkVol}" title="Track Volume: ${Math.round(trkVol * 100)}%">
            <button class="midi-track-btn iso-btn" title="Isolate single track (mute all other tracks)">1-TRK</button>
            <button class="midi-track-btn mute-btn ${track.muted ? 'active' : ''}" title="Mute Track">M</button>
            <button class="midi-track-btn solo-btn ${track.solo ? 'active' : ''}" title="Solo Track">S</button>
          `;
          const volInput = row.querySelector('.midi-track-vol');
          volInput.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            track.volume = v;
            if (dspMod.setTrackVolume) dspMod.setTrackVolume(track.id, v);
            volInput.title = `Track Volume: ${Math.round(v * 100)}%`;
          });
          volInput.addEventListener('mousedown', (e) => {
            e.stopPropagation();
          });

          const isoBtn = row.querySelector('.iso-btn');
          const mBtn = row.querySelector('.mute-btn');
          const sBtn = row.querySelector('.solo-btn');
          isoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dspMod.isolateTrack(track.id);
            tracksContainer.querySelectorAll('.midi-track-row').forEach(r => {
              const tid = parseInt(r.dataset.trackId);
              const isTarget = (tid === track.id);
              r.querySelector('.mute-btn').classList.toggle('active', !isTarget);
              r.querySelector('.solo-btn').classList.remove('active');
            });
            if (fileSubEl) {
              const curDur = dspMod.totalDuration || dspMod.midiData.duration || 1.0;
              fileSubEl.textContent = `★ ISOLATED 1-TRACK: ${track.name} (${curDur.toFixed(1)}s • ${track.notes.length}n)`;
            }
          });
          mBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dspMod.toggleTrackMute(track.id);
            mBtn.classList.toggle('active', !!track.muted);
          });
          sBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dspMod.toggleTrackSolo(track.id);
            tracksContainer.querySelectorAll('.midi-track-row').forEach(r => {
              const tid = parseInt(r.dataset.trackId);
              const t = dspMod.midiData.tracks.find(x => x.id === tid);
              if (t) {
                r.querySelector('.solo-btn').classList.toggle('active', !!t.solo);
              }
            });
          });
          tracksContainer.appendChild(row);
        });
      };

      dspMod.onProgressUpdate = (info) => {
        if (progressBar && info.totalDuration > 0) {
          const pct = Math.min(100, (info.currentTime / info.totalDuration) * 100);
          progressBar.style.width = `${pct}%`;
        }
        if (info.activeTrackIds && tracksContainer) {
          tracksContainer.querySelectorAll('.midi-track-led').forEach(led => {
            const tid = parseInt(led.dataset.trackId);
            led.classList.toggle('active', info.activeTrackIds.has(tid));
          });
        }
      };

      const loadBuffer = (arrayBuffer, name) => {
        try {
          const parsed = window.parseMidiFile(arrayBuffer, name);
          dspMod.loadMidi(parsed, name);
          if (fileNameEl) fileNameEl.textContent = parsed.title;
          const isSingle = (parsed.tracks.length <= 1);
          const curDur = dspMod.totalDuration || parsed.duration;
          if (fileSubEl) fileSubEl.textContent = `${parsed.bpm} BPM • ${curDur.toFixed(1)}s • ${parsed.tracks.length} track${isSingle ? ' (1-TRK)' : 's'}`;
          const useBpmBtn = faceplate ? faceplate.querySelector('.midi-use-bpm-btn') : null;
          if (useBpmBtn && parsed.bpm) {
            useBpmBtn.style.display = 'inline-block';
            useBpmBtn.textContent = `⚡ USE ${parsed.bpm} BPM`;
          }
          updateTracksUI(parsed.tracks);
          if (window.onPatchModified) window.onPatchModified();
          return parsed;
        } catch (err) {
          console.error('Failed to parse MIDI file:', err);
          if (fileNameEl) fileNameEl.textContent = 'PARSE ERROR';
          if (fileSubEl) fileSubEl.textContent = err.message || 'Invalid MIDI';
          return null;
        }
      };

      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => loadBuffer(ev.target.result, file.name);
            reader.readAsArrayBuffer(file);
          }
        });
      }

      const handleMidiDrop = async (e) => {
        e.preventDefault();
        el.classList.remove('midi-panel-drag-over');
        if (dropZone) dropZone.classList.remove('drag-over');

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          const reader = new FileReader();
          reader.onload = (ev) => loadBuffer(ev.target.result, file.name);
          reader.readAsArrayBuffer(file);
          return;
        }

        const jsonStr = e.dataTransfer.getData('text/midi-payload') || e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
        if (jsonStr) {
          try {
            const data = JSON.parse(jsonStr);
            if (data.download_url) {
              await el._loadMidiUrl(data.download_url, data.title || data.filename, !!data.auto_isolate);
            }
          } catch (err) {
            console.error('Drag load error:', err);
          }
        }
      };

      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        el.classList.add('midi-panel-drag-over');
      });
      el.addEventListener('dragleave', (e) => {
        if (!el.contains(e.relatedTarget)) {
          el.classList.remove('midi-panel-drag-over');
        }
      });
      el.addEventListener('drop', handleMidiDrop);

      if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
          e.preventDefault();
          dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', () => {
          dropZone.classList.remove('drag-over');
        });
        dropZone.addEventListener('drop', handleMidiDrop);
      }

      if (playBtn) {
        playBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isPlaying = dspMod.togglePlay();
          playBtn.innerHTML = isPlaying ? '[&#9654; PLAY]' : '[&#10074;&#10074; PAUSE]';
          playBtn.classList.toggle('active', isPlaying);
        });
      }

      if (rewBtn) {
        rewBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dspMod.rewind();
        });
      }

      if (loopBtn) {
        loopBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const looping = dspMod.toggleLoop();
          loopBtn.classList.toggle('active', looping);
        });
      }

      const useBpmBtn = faceplate ? faceplate.querySelector('.midi-use-bpm-btn') : null;
      if (useBpmBtn) {
        useBpmBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (dspMod.midiData && dspMod.midiData.bpm) {
            const masterInput = document.getElementById('master-bpm-input');
            if (masterInput) masterInput.value = dspMod.midiData.bpm;
            this.dsp.setMasterBpm(dspMod.midiData.bpm);
            this.snapAllBpm('1');
          }
        });
      }

      const snapSelect = faceplate ? faceplate.querySelector('.midi-loop-snap-select') : null;
      if (snapSelect) {
        if (modData.params.loop_snap) {
          snapSelect.value = modData.params.loop_snap;
        }
        snapSelect.addEventListener('change', (e) => {
          e.stopPropagation();
          const val = e.target.value;
          modData.params.loop_snap = val;
          if (dspMod.setLoopSnap) dspMod.setLoopSnap(val);
          if (window.onPatchModified) window.onPatchModified();
          if (fileSubEl && dspMod.midiData) {
            const curDur = dspMod.totalDuration || dspMod.midiData.duration || 1.0;
            const isSingle = (dspMod.midiData.tracks.length <= 1);
            fileSubEl.textContent = `${dspMod.midiData.bpm} BPM • ${curDur.toFixed(1)}s • ${dspMod.midiData.tracks.length} track${isSingle ? ' (1-TRK)' : 's'}`;
          }
        });
      }

      el._loadMidiUrl = async (url, title, autoIsolate = false) => {
        try {
          if (fileNameEl) fileNameEl.textContent = 'LOADING...';
          const resp = await fetch(url);
          const buf = await resp.arrayBuffer();
          const parsed = loadBuffer(buf, title);
          if (autoIsolate && parsed && parsed.tracks && parsed.tracks.length > 1) {
            const targetTrack = parsed.tracks.find(t => /bass|lead|riff|303|synth/i.test(t.name) && t.notes.length > 0)
              || parsed.tracks.find(t => t.notes.length > 0)
              || parsed.tracks[0];
            if (targetTrack) {
              dspMod.isolateTrack(targetTrack.id);
              if (tracksContainer) {
                tracksContainer.querySelectorAll('.midi-track-row').forEach(r => {
                  const tid = parseInt(r.dataset.trackId);
                  r.querySelector('.mute-btn').classList.toggle('active', tid !== targetTrack.id);
                });
              }
              if (fileSubEl) {
                fileSubEl.textContent = `★ ISOLATED 1-TRACK: ${targetTrack.name} (${targetTrack.notes.length}n)`;
              }
            }
          }
          return parsed;
        } catch (err) {
          console.error('Failed to load MIDI from URL:', err);
        }
      };

      if (modData.params && modData.params.starter) {
        el._loadMidiUrl(`/api/midi/download?starter=${encodeURIComponent(modData.params.starter)}`, modData.params.starter);
      } else if (!dspMod.midiData) {
        el._loadMidiUrl('/api/midi/download?starter=Acid%20303%20Resonance%20Riff%20(1-Track).mid', 'Acid 303 Resonance Riff (1-Track)');
      }
    }
  }

  bindKnob(knobEl, onChange) {
    const min = parseFloat(knobEl.dataset.min);
    const max = parseFloat(knobEl.dataset.max);
    let val = parseFloat(knobEl.dataset.val);
    const step = parseFloat(knobEl.dataset.step) || 0.01;
    const dial = knobEl.querySelector('.knob-dial');

    const updateRotation = (currentVal) => {
      const pct = (currentVal - min) / (max - min);
      const deg = -140 + pct * 280;
      dial.style.transform = `rotate(${deg}deg)`;
    };

    updateRotation(val);

    let startY = 0;
    let startVal = 0;

    const onPointerMove = (e) => {
      const dy = startY - e.clientY;
      const range = max - min;
      const speed = e.shiftKey ? 0.001 : 0.005;
      let newVal = startVal + dy * range * speed;
      newVal = Math.max(min, Math.min(max, newVal));
      newVal = Math.round(newVal / step) * step;

      val = newVal;
      knobEl.dataset.val = val;
      updateRotation(val);
      onChange(val);
    };

    const onPointerUp = () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      document.body.classList.remove('dragging-knob');
      this.cables.toggleGhost(false);
    };

    knobEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      this.dsp.ensureContext();
      startY = e.clientY;
      startVal = parseFloat(knobEl.dataset.val);
      document.body.classList.add('dragging-knob');
      this.cables.toggleGhost(true);

      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
    });

    knobEl.addEventListener('dblclick', () => {
      val = min + (max - min) * 0.5;
      knobEl.dataset.val = val;
      updateRotation(val);
      onChange(val);
    });
  }

  formatVal(val, unit) {
    if (unit === 'Hz') {
      return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${Math.round(val)}Hz`;
    }
    if (unit === 'ms') return `${Math.round(val)}ms`;
    if (unit === 's') return `${val.toFixed(1)}s`;
    if (unit === 'ct') return `${Math.round(val)}ct`;
    if (unit === 'bit') return `${Math.round(val)}b`;
    if (unit === 'x') return `${Math.round(val)}x`;
    if (unit === 'dB') return `${val > 0 ? '+' : ''}${val.toFixed(1)}dB`;
    if (unit === ':1') return `${val}:1`;
    if (unit === 'bpm') return `${Math.round(val)}bpm`;
    return val.toFixed(2);
  }

  removeModule(id) {
    if (id === 'mixer_1' || id === 'mixer') return;
    this.dsp.removeModule(id);
    const el = this.rack.querySelector(`.module-panel[data-id="${id}"]`);
    if (el) el.remove();
    this.modulesState = this.modulesState.filter(m => m.id !== id);
    this.cables.render();
    if (window.onPatchModified) window.onPatchModified();
  }

  addModule(type, targetRow = null) {
    if (type === 'mixer') {
      return this.modulesState.find(m => m.id === 'mixer_1');
    }
    const id = `${type}_${Date.now().toString(36).substr(-4)}`;
    const def = MODULE_DEFINITIONS[type];
    const params = {};
    for (const c of def.controls) {
      params[c.id] = c.default;
    }
    const row = targetRow !== null ? targetRow : (this.selectedRowIdx || 0);
    const modData = { id, type, row, params };
    this.dsp.createModule(type, id, params);
    this.modulesState.push(modData);
    this.renderModule(modData);
    this.cables.render();
    if (window.onPatchModified) window.onPatchModified();
    return modData;
  }

  loadState(state) {
    if (!this.modularRows) {
      this.initMasterRack();
    }
    this.modularRows.innerHTML = '';
    this.dsp.clearAll();
    this.cables.cables = [];
    this.modulesState = [];

    // 1. Locate or create mixer_1
    let mixerMod = null;
    if (state.modules) {
      mixerMod = state.modules.find(m => m.type === 'mixer' || m.id === 'mixer_1');
    }

    const defaultMixerParams = {
      ch1_gain: 0.85, ch1_pan: 0.0, ch1_mute: false, ch1_solo: false,
      ch2_gain: 0.85, ch2_pan: 0.0, ch2_mute: false, ch2_solo: false,
      ch3_gain: 0.0,  ch3_pan: 0.0, ch3_mute: false, ch3_solo: false,
      ch4_gain: 0.0,  ch4_pan: 0.0, ch4_mute: false, ch4_solo: false,
      ch5_gain: 0.0,  ch5_pan: 0.0, ch5_mute: false, ch5_solo: false,
      ch6_gain: 0.0,  ch6_pan: 0.0, ch6_mute: false, ch6_solo: false,
      ch7_gain: 0.0,  ch7_pan: 0.0, ch7_mute: false, ch7_solo: false,
      ch8_gain: 0.0,  ch8_pan: 0.0, ch8_mute: false, ch8_solo: false,
      master_vol: (mixerMod && mixerMod.params && mixerMod.params.master_vol !== undefined) ? mixerMod.params.master_vol : 0.85
    };

    const mixerParams = Object.assign({}, defaultMixerParams, mixerMod ? mixerMod.params : {});
    
    // Ensure mixer module exists in DSP
    let dspMixer = this.dsp.modules.get('mixer_1');
    if (!dspMixer) {
      dspMixer = this.dsp.createModule('mixer', 'mixer_1', mixerParams);
    } else {
      for (const [k, v] of Object.entries(mixerParams)) {
        dspMixer.setParam(k, v);
      }
    }

    const mixerStateObj = {
      id: 'mixer_1',
      type: 'mixer',
      row: -1,
      params: mixerParams
    };
    this.modulesState.push(mixerStateObj);
    this.updateMasterConsoleUi(mixerParams);

    // 2. Determine modular rows needed for non-mixer modules
    let maxRow = 0;
    if (state.modules) {
      for (const m of state.modules) {
        if (m.type === 'mixer' || m.id === 'mixer_1') continue;
        if (m.row !== undefined && m.row > maxRow) maxRow = m.row;
      }
    }
    const totalRows = Math.max(state.rowCount || 1, maxRow + 1);
    for (let r = 0; r < totalRows; r++) {
      this.ensureRow(r);
    }

    // 3. Instantiate non-mixer modules
    if (state.modules) {
      for (const m of state.modules) {
        if (m.type === 'mixer' || m.id === 'mixer_1') continue;
        this.dsp.createModule(m.type, m.id, m.params || {});
        this.modulesState.push(m);
        this.renderModule(m);
      }
    }

    // 4. Connect cables across rows
    setTimeout(() => {
      if (state.cables) {
        for (const c of state.cables) {
          this.cables.addCable(c.from.moduleId, c.from.jack, c.to.moduleId, c.to.jack, c.color);
        }
      }
      this.cables.render();
      this.updateMasterConsolePatchCount();
    }, 60);
  }

  toggleModuleDrawer(force = null) {
    const drawer = document.getElementById('module-drawer');
    if (!drawer) return;
    const isOpen = force !== null ? force : !drawer.classList.contains('open');
    drawer.classList.toggle('open', isOpen);
    document.body.classList.toggle('module-drawer-open', isOpen);
    const toggleBtn = document.getElementById('toggle-drawer-btn');
    if (toggleBtn) toggleBtn.classList.toggle('active', isOpen);
    setTimeout(() => { if (this.cables) this.cables.render(); }, 260);
  }

  toggleMidiDrawer(force = null) {
    const drawer = document.getElementById('midi-drawer');
    if (!drawer) return;
    const isOpen = force !== null ? force : !drawer.classList.contains('open');
    drawer.classList.toggle('open', isOpen);
    document.body.classList.toggle('midi-drawer-open', isOpen);
    const toggleBtn = document.getElementById('midi-drawer-btn');
    if (toggleBtn) toggleBtn.classList.toggle('active', isOpen);
    setTimeout(() => { if (this.cables) this.cables.render(); }, 260);
  }

  closeAllDrawers() {
    this.toggleModuleDrawer(false);
    this.toggleMidiDrawer(false);
  }

  initDrawer() {
    const drawer = document.getElementById('module-drawer');
    const catalogList = document.getElementById('catalog-list');
    const toggleBtn = document.getElementById('toggle-drawer-btn');
    const closeBtn = document.getElementById('close-drawer-btn');
    const filterContainer = document.getElementById('catalog-filters');

    if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggleModuleDrawer());
    if (closeBtn) closeBtn.addEventListener('click', () => this.toggleModuleDrawer(false));
    const titleEl = drawer.querySelector('.drawer-title');
    if (titleEl) {
      titleEl.textContent = `MODULE CATALOG (${Object.keys(MODULE_DEFINITIONS).length} MODULES)`;
    }

    // Categories filter
    const categories = ['ALL', 'Source', 'Filter', 'Distortion', 'Lo-Fi', 'Time', 'Space', 'Modulation', 'Texture', 'Physical', 'Utility', 'Dynamics', 'Spatial', 'Percussion'];
    if (filterContainer) {
      filterContainer.innerHTML = '';
      for (const cat of categories) {
        const btn = document.createElement('button');
        btn.classList.add('category-chip');
        if (cat === 'ALL') btn.classList.add('active');
        btn.textContent = cat.toUpperCase();
        btn.addEventListener('click', () => {
          filterContainer.querySelectorAll('.category-chip').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.populateCatalog(cat === 'ALL' ? null : cat);
        });
        filterContainer.appendChild(btn);
      }
    }

    this.populateCatalog(null);
  }

  populateCatalog(filterCategory = null) {
    const catalogList = document.getElementById('catalog-list');
    const drawer = document.getElementById('module-drawer');
    if (!catalogList) return;

    catalogList.innerHTML = '';
    for (const [type, def] of Object.entries(MODULE_DEFINITIONS)) {
      if (type === 'mixer') continue;
      if (filterCategory && def.category.toLowerCase() !== filterCategory.toLowerCase()) continue;

      const card = document.createElement('div');
      card.classList.add('catalog-card');
      card.setAttribute('draggable', 'true');
      card.innerHTML = `
        <div class="card-header">
          <span class="card-name">${def.name}</span>
          <span class="card-badge">${def.category}</span>
        </div>
        <div class="card-desc">${def.desc}</div>
        <div class="card-specs">Width: ${def.width}px &bull; Ins: ${def.inputs.length} &bull; Outs: ${def.outputs.length}</div>
      `;
      card.addEventListener('dragstart', (e) => {
        document.body.classList.add('dragging-active');
        e.dataTransfer.setData('text/module-type', type);
        e.dataTransfer.setData('text/plain', type);
        e.dataTransfer.effectAllowed = 'copy';
      });
      card.addEventListener('dragend', () => {
        document.body.classList.remove('dragging-active');
      });
      card.addEventListener('click', () => {
        this.addModule(type);
        this.toggleModuleDrawer(false);
      });
      catalogList.appendChild(card);
    }
  }

  initMidiDrawer() {
    const drawer = document.getElementById('midi-drawer');
    if (!drawer) return;
    const toggleBtn = document.getElementById('midi-drawer-btn');
    const closeBtn = document.getElementById('close-midi-drawer-btn');
    const searchInput = document.getElementById('midi-search-input');
    const searchBtn = document.getElementById('midi-search-submit-btn');
    const chipsContainer = document.getElementById('midi-search-chips');
    const listContainer = document.getElementById('midi-list-container');
    const tabStarters = document.getElementById('midi-tab-starters');
    const tabResults = document.getElementById('midi-tab-results');
    const resultsCount = document.getElementById('midi-results-count');

    let currentTab = 'starters';
    let currentFilterType = 'all';
    let searchResultsData = [];
    let starterRiffsData = [];

    if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggleMidiDrawer());
    if (closeBtn) closeBtn.addEventListener('click', () => this.toggleMidiDrawer(false));

    // Single / Multi Filter Pills in Left Drawer
    const filterPills = drawer.querySelectorAll('.midi-filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFilterType = pill.dataset.filter || 'all';
        if (currentTab === 'starters') {
          loadStarters();
        } else {
          doSearch(searchInput ? searchInput.value : '');
        }
      });
    });

    // Quick search tags including single-track riffs
    const chips = ['1-TRK BASS', '303 RIFF', 'MOOG SUB', 'CYBERPUNK ARP', 'FUNK SLAP', 'TECHNO STABS', 'CHIPTUNE LEAD', 'DAFT PUNK', 'APHEX TWIN', 'BACH'];
    if (chipsContainer) {
      chipsContainer.innerHTML = '';
      chips.forEach(c => {
        const chip = document.createElement('button');
        chip.classList.add('midi-chip');
        chip.textContent = c;
        chip.addEventListener('click', () => {
          if (searchInput) {
            searchInput.value = c.toLowerCase();
            if (c.startsWith('1-TRK') || c.includes('RIFF') || c.includes('SUB') || c.includes('ARP')) {
              filterPills.forEach(p => p.classList.toggle('active', p.dataset.filter === 'single'));
              currentFilterType = 'single';
            }
            doSearch(c.toLowerCase());
          }
        });
        chipsContainer.appendChild(chip);
      });
    }

    const renderCards = (items, isStarter = false) => {
      if (!listContainer) return;
      listContainer.innerHTML = '';
      if (!items || !items.length) {
        listContainer.innerHTML = `
          <div style="text-align:center; padding: 24px 12px; color:var(--omo-dim); font-size:10px;">
            No MIDI files found matching "${currentFilterType}". Try selecting another filter or searching.
          </div>
        `;
        return;
      }

      items.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('midi-card');
        card.draggable = true;

        const isSingle = !!item.is_single_track;
        const sourceBadge = isSingle
          ? `<span class="midi-card-source single" title="Single Isolated 1-Track Riff">★ 1-TRK RIFF</span>`
          : (item.tracks_count ? `<span class="midi-card-source multi" title="${item.tracks_count} Instrument Tracks">${item.tracks_count} TRKS</span>` : `<span class="midi-card-source">${isStarter ? 'Starter Song' : 'BitMidi'}</span>`);

        card.innerHTML = `
          <div class="midi-card-header">
            <span class="midi-card-title" title="${item.title}">${item.title}</span>
            ${sourceBadge}
          </div>
          <div class="midi-card-actions">
            <span class="midi-card-drag-hint">&#x2731; Drag to Module</span>
            <div style="display:flex; gap:4px;">
              ${!isSingle ? `<button class="midi-card-load-btn iso-quick-btn" title="Load and isolate single bass/lead track" style="background:rgba(158,206,106,0.15); border-color:var(--omo-ok); color:var(--omo-ok);">1-TRK</button>` : ''}
              <button class="midi-card-load-btn main-load-btn" title="Load into MIDI Module">LOAD</button>
            </div>
          </div>
        `;

        card.addEventListener('dragstart', (e) => {
          document.body.classList.add('dragging-active');
          const payload = JSON.stringify({
            title: item.title,
            download_url: item.download_url,
            is_starter: isStarter,
            is_single_track: isSingle,
          });
          e.dataTransfer.setData('text/midi-payload', payload);
          e.dataTransfer.setData('application/json', payload);
          e.dataTransfer.setData('text/plain', payload);
          e.dataTransfer.effectAllowed = 'copy';
        });

        card.addEventListener('dragend', () => {
          document.body.classList.remove('dragging-active');
        });

        const loadBtn = card.querySelector('.main-load-btn');
        const isoQuickBtn = card.querySelector('.iso-quick-btn');

        const performLoad = async (autoIso = false) => {
          const btn = autoIso ? isoQuickBtn : loadBtn;
          if (btn) btn.textContent = '...';
          let midiModState = this.modulesState.find(m => m.type === 'midi_player');
          if (!midiModState) {
            const modId = this.addModule('midi_player');
            midiModState = this.modulesState.find(m => m.id === modId);
          }
          if (midiModState) {
            const modEl = this.rack.querySelector(`.module-panel[data-id="${midiModState.id}"]`);
            if (modEl && typeof modEl._loadMidiUrl === 'function') {
              await modEl._loadMidiUrl(item.download_url, item.title, autoIso);
              if (btn) {
                btn.textContent = autoIso ? '1-TRK ✓' : 'LOADED';
                setTimeout(() => { if (btn) btn.textContent = autoIso ? '1-TRK' : 'LOAD'; }, 1500);
              }
            }
          }
        };

        if (loadBtn) {
          loadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            performLoad(false);
          });
        }
        if (isoQuickBtn) {
          isoQuickBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            performLoad(true);
          });
        }

        listContainer.appendChild(card);
      });
    };

    const loadStarters = async () => {
      try {
        const resp = await fetch(`/api/midi/starters?filter_type=${encodeURIComponent(currentFilterType)}`);
        starterRiffsData = await resp.json();
        if (currentTab === 'starters') {
          renderCards(starterRiffsData, true);
        }
      } catch (err) {
        console.error('Failed to load starters:', err);
      }
    };

    const doSearch = async (q) => {
      if (!q || !q.trim()) {
        currentTab = 'starters';
        tabStarters.classList.add('active');
        tabResults.classList.remove('active');
        loadStarters();
        return;
      }
      currentTab = 'results';
      tabStarters.classList.remove('active');
      tabResults.classList.add('active');
      listContainer.innerHTML = `
        <div style="text-align:center; padding: 24px 12px; color:var(--omo-accent); font-size:10px;">
          Searching 113,000+ MIDI archive (${currentFilterType})...
        </div>
      `;
      try {
        const resp = await fetch(`/api/midi/search?q=${encodeURIComponent(q.trim())}&filter_type=${encodeURIComponent(currentFilterType)}`);
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status} - ${resp.statusText}`);
        }
        const data = await resp.json();
        searchResultsData = data.results || [];
        if (resultsCount) resultsCount.textContent = searchResultsData.length;
        renderCards(searchResultsData, false);
      } catch (err) {
        listContainer.innerHTML = `
          <div style="color:var(--omo-err); padding:16px; font-size:10px; line-height:1.5;">
            <strong>Search request failed:</strong><br>${err.message}<br><br>
            <span style="color:var(--omo-dim);">Tip: If omomodular was running during the update, please restart the app or reload the window.</span>
          </div>
        `;
      }
    };

    let searchDebounceTimer = null;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        const val = e.target.value;
        searchDebounceTimer = setTimeout(() => {
          doSearch(val);
        }, 350);
      });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          clearTimeout(searchDebounceTimer);
          doSearch(searchInput.value);
        }
      });
    }

    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', () => {
        clearTimeout(searchDebounceTimer);
        doSearch(searchInput.value);
      });
    }

    if (tabStarters) {
      tabStarters.addEventListener('click', () => {
        currentTab = 'starters';
        tabStarters.classList.add('active');
        tabResults.classList.remove('active');
        loadStarters();
      });
    }

    if (tabResults) {
      tabResults.addEventListener('click', () => {
        currentTab = 'results';
        tabResults.classList.add('active');
        tabStarters.classList.remove('active');
        renderCards(searchResultsData, false);
      });
    }

    loadStarters();
  }

  initShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        const isMuted = this.dsp.toggleMute();
        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
          muteBtn.classList.toggle('muted', isMuted);
          muteBtn.textContent = isMuted ? '[SPACE] MUTED' : '[SPACE] RUN';
        }
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        if (e.shiftKey) {
          this.snapAllBpm();
        } else {
          this.flashSyncBtn();
          this.dsp.syncDownbeat();
        }
      } else if (e.code === 'KeyB') {
        e.preventDefault();
        this.snapAllBpm();
      } else if (e.code === 'Escape') {
        this.closeAllDrawers();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        this.toggleMidiDrawer();
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        const ghost = this.cables.toggleGhost();
        const ghostBtn = document.getElementById('ghost-btn');
        if (ghostBtn) {
          ghostBtn.classList.toggle('active', ghost);
        }
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        this.toggleTvRackMode();
      } else if (e.code === 'Tab' || e.code === 'KeyD') {
        e.preventDefault();
        this.toggleModuleDrawer();
      } else if (e.code === 'KeyR') {
        // Randomize selected module
        if (this.selectedModuleEl) {
          const modId = this.selectedModuleEl.dataset.id;
          const modType = this.selectedModuleEl.dataset.type;
          const def = MODULE_DEFINITIONS[modType];
          const dspMod = this.dsp.modules.get(modId);
          const stateMod = this.modulesState.find(m => m.id === modId);

          if (def && dspMod && stateMod) {
            for (const c of def.controls) {
              if (c.type === 'knob') {
                const rand = c.min + Math.random() * (c.max - c.min);
                const rounded = Math.round(rand / (c.step || 0.01)) * (c.step || 0.01);
                stateMod.params[c.id] = rounded;
                dspMod.setParam(c.id, rounded);
                const knobEl = this.selectedModuleEl.querySelector(`.knob-wrap[data-param="${c.id}"] .knob`);
                const valSpan = this.selectedModuleEl.querySelector(`.knob-wrap[data-param="${c.id}"] .knob-value`);
                if (knobEl && valSpan) {
                  knobEl.dataset.val = rounded;
                  const pct = (rounded - c.min) / (c.max - c.min);
                  knobEl.querySelector('.knob-dial').style.transform = `rotate(${-140 + pct * 280}deg)`;
                  valSpan.textContent = this.formatVal(rounded, c.unit || '');
                }
              }
            }
            if (window.onPatchModified) window.onPatchModified();
          }
        }
      }
    });
  }

  toggleTvRackMode() {
    const isTvMode = document.body.classList.toggle('tv-rack-mode');
    const btn = document.getElementById('tv-rack-btn');
    if (btn) btn.classList.toggle('active', isTvMode);

    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
    setTimeout(() => {
      if (this.cables) this.cables.render();
    }, 60);
  }

  flashSyncBtn() {
    const btn = document.getElementById('sync-btn');
    if (!btn) return;
    btn.classList.add('synced');
    setTimeout(() => {
      btn.classList.remove('synced');
    }, 250);
  }

  flashSnapBtn() {
    const btn = document.getElementById('snap-bpm-btn');
    if (!btn) return;
    btn.classList.add('snapped');
    setTimeout(() => {
      btn.classList.remove('snapped');
    }, 250);
  }

  setKnobValue(knobEl, val) {
    if (!knobEl) return;
    const min = parseFloat(knobEl.dataset.min);
    const max = parseFloat(knobEl.dataset.max);
    const unit = knobEl.dataset.unit || '';
    const clamped = Math.max(min, Math.min(max, val));
    knobEl.dataset.val = clamped;
    const dial = knobEl.querySelector('.knob-dial');
    if (dial) {
      const pct = (clamped - min) / (max - min);
      dial.style.transform = `rotate(${-140 + pct * 280}deg)`;
    }
    const wrap = knobEl.closest('.knob-wrap');
    if (wrap) {
      const valSpan = wrap.querySelector('.knob-value');
      if (valSpan) valSpan.textContent = this.formatVal(clamped, unit);
      wrap.classList.add('knob-snapped');
      setTimeout(() => wrap.classList.remove('knob-snapped'), 600);
    }
  }

  snapSingleModule(modId) {
    const modData = this.modules.find(m => m.id === modId);
    if (!modData) return;

    const masterInput = document.getElementById('master-bpm-input');
    const masterBpm = masterInput ? parseInt(masterInput.value, 10) : this.dsp.masterBpm;

    const ratioSelect = document.getElementById('snap-ratio-select');
    let ratioVal = ratioSelect ? ratioSelect.value : '1';

    if (modData.type === 'midi_player' && modData.params.ratio && modData.params.ratio !== 'free') {
      const ratioMap = {
        '1x_full': 1.0,
        '1/2_half': 0.5,
        '1/4_quarter': 0.25,
        '1/8_8th': 0.125,
        '1/16_16th': 0.0625,
        '2x_double': 2.0
      };
      ratioVal = ratioMap[modData.params.ratio] || 1.0;
    }

    const res = this.dsp.snapModuleBpm(modId, masterBpm, ratioVal);
    if (res) {
      modData.params[res.type] = res.value;
      const el = document.getElementById(`mod-${modId}`);
      if (el) {
        const knobEl = el.querySelector(`.knob-wrap[data-param="${res.type}"] .knob`);
        if (knobEl) this.setKnobValue(knobEl, res.value);
        const snapBtn = el.querySelector('.mod-snap-btn');
        if (snapBtn) {
          snapBtn.classList.add('snapped');
          setTimeout(() => snapBtn.classList.remove('snapped'), 250);
        }
      }
      if (window.onPatchModified) window.onPatchModified();
    }
  }

  snapAllBpm(overrideRatio = null) {
    const masterInput = document.getElementById('master-bpm-input');
    const ratioSelect = document.getElementById('snap-ratio-select');

    let baseBpm = masterInput ? parseInt(masterInput.value, 10) : this.dsp.masterBpm;
    let ratio = overrideRatio !== null ? overrideRatio : (ratioSelect ? ratioSelect.value : '1');

    this.flashSnapBtn();
    this.flashSyncBtn();

    const result = this.dsp.snapAllBpm(baseBpm, ratio, true);
    if (!result) return;

    if (masterInput && result.masterBpm) {
      masterInput.value = result.masterBpm;
    }

    for (const item of result.snapped) {
      const modData = this.modules.find(m => m.id === item.id);
      if (modData) {
        modData.params[item.param] = item.value;
      }
      const el = document.getElementById(`mod-${item.id}`);
      if (el) {
        const knobEl = el.querySelector(`.knob-wrap[data-param="${item.param}"] .knob`);
        if (knobEl) this.setKnobValue(knobEl, item.value);
        const snapBtn = el.querySelector('.mod-snap-btn');
        if (snapBtn) {
          snapBtn.classList.add('snapped');
          setTimeout(() => snapBtn.classList.remove('snapped'), 250);
        }
      }
    }

    if (window.onPatchModified) window.onPatchModified();
  }

  startOscilloscope() {
    const canvas = document.getElementById('scope-canvas');
    if (!canvas) {
      setTimeout(() => this.startOscilloscope(), 200);
      return;
    }
    const ctx = canvas.getContext('2d');
    const bufferLength = 1024;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestAnimationFrame(draw);
      if (!this.dsp.analyser) return;

      this.dsp.analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = 'rgba(18, 19, 26, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 1.8;
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--omo-cyan').trim() || '#7dcfff';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();
    };

    draw();
  }
}

window.ModularRackUI = ModularRackUI;
