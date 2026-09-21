"""Preset definitions and patch loading/saving for OmoModular."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

FACTORY_PRESETS: dict[str, dict[str, Any]] = {
    "Deep Abyssal Drone": {
        "name": "Deep Abyssal Drone",
        "description": "Sub-octave drone VCO and brown noise into resonant lowpass filter, tape echo, and massive space reverb.",
        "modules": [
            {
                "id": "vco_1",
                "type": "vco",
                "x": 20,
                "y": 20,
                "params": {
                    "wave1": "sawtooth",
                    "freq1": 55.0,  # A1
                    "wave2": "sine",
                    "detune2": 7.0,
                    "subLevel": 0.6,
                    "fmDepth": 0.15,
                    "drift": 0.35,
                },
            },
            {
                "id": "noise_1",
                "type": "noise",
                "x": 230,
                "y": 20,
                "params": {
                    "color": "brown",
                    "level": 0.45,
                    "crackle": 0.25,
                },
            },
            {
                "id": "filter_1",
                "type": "filter",
                "x": 440,
                "y": 20,
                "params": {
                    "mode": "lowpass",
                    "cutoff": 280.0,
                    "resonance": 5.5,
                    "drive": 1.4,
                },
            },
            {
                "id": "delay_1",
                "type": "delay",
                "x": 650,
                "y": 20,
                "params": {
                    "time": 680.0,
                    "feedback": 0.55,
                    "damping": 1200.0,
                    "flutter": 0.2,
                    "mix": 0.4,
                },
            },
            {
                "id": "reverb_1",
                "type": "reverb",
                "x": 860,
                "y": 20,
                "params": {
                    "decay": 6.5,
                    "damping": 3200.0,
                    "mix": 0.65,
                },
            },
            {
                "id": "mixer_1",
                "type": "mixer",
                "x": 1070,
                "y": 20,
                "params": {
                    "ch1_gain": 0.85,
                    "ch1_pan": 0.0,
                    "ch2_gain": 0.4,
                    "ch2_pan": -0.2,
                    "ch3_gain": 0.0,
                    "ch3_pan": 0.0,
                    "ch4_gain": 0.0,
                    "ch4_pan": 0.0,
                    "master_vol": 0.8,
                },
            },
        ],
        "cables": [
            {"from": {"moduleId": "vco_1", "jack": "out"}, "to": {"moduleId": "filter_1", "jack": "in"}, "color": "var(--omo-accent)"},
            {"from": {"moduleId": "noise_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in2"}, "color": "var(--omo-orange)"},
            {"from": {"moduleId": "filter_1", "jack": "out"}, "to": {"moduleId": "delay_1", "jack": "in"}, "color": "var(--omo-cyan)"},
            {"from": {"moduleId": "delay_1", "jack": "out"}, "to": {"moduleId": "reverb_1", "jack": "in"}, "color": "var(--omo-green)"},
            {"from": {"moduleId": "reverb_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in1"}, "color": "var(--omo-magenta)"},
        ],
    },
    "Solar Flare FM": {
        "name": "Solar Flare FM",
        "description": "Cross-frequency modulated oscillators into harmonic wavefolder and sweeping resonant bandpass filter.",
        "modules": [
            {
                "id": "vco_1",
                "type": "vco",
                "x": 20,
                "y": 20,
                "params": {
                    "wave1": "triangle",
                    "freq1": 110.0,
                    "wave2": "sine",
                    "detune2": -12.0,
                    "subLevel": 0.2,
                    "fmDepth": 0.72,
                    "drift": 0.2,
                },
            },
            {
                "id": "wavefolder_1",
                "type": "wavefolder",
                "x": 230,
                "y": 20,
                "params": {
                    "drive": 2.8,
                    "folds": 3.2,
                    "symmetry": 0.1,
                    "mix": 0.85,
                },
            },
            {
                "id": "filter_1",
                "type": "filter",
                "x": 440,
                "y": 20,
                "params": {
                    "mode": "bandpass",
                    "cutoff": 640.0,
                    "resonance": 7.0,
                    "drive": 1.2,
                },
            },
            {
                "id": "reverb_1",
                "type": "reverb",
                "x": 650,
                "y": 20,
                "params": {
                    "decay": 5.0,
                    "damping": 4500.0,
                    "mix": 0.5,
                },
            },
            {
                "id": "mixer_1",
                "type": "mixer",
                "x": 860,
                "y": 20,
                "params": {
                    "ch1_gain": 0.8,
                    "ch1_pan": 0.0,
                    "ch2_gain": 0.0,
                    "ch2_pan": 0.0,
                    "ch3_gain": 0.0,
                    "ch3_pan": 0.0,
                    "ch4_gain": 0.0,
                    "ch4_pan": 0.0,
                    "master_vol": 0.75,
                },
            },
        ],
        "cables": [
            {"from": {"moduleId": "vco_1", "jack": "out"}, "to": {"moduleId": "wavefolder_1", "jack": "in"}, "color": "var(--omo-orange)"},
            {"from": {"moduleId": "wavefolder_1", "jack": "out"}, "to": {"moduleId": "filter_1", "jack": "in"}, "color": "var(--omo-yellow)"},
            {"from": {"moduleId": "filter_1", "jack": "out"}, "to": {"moduleId": "reverb_1", "jack": "in"}, "color": "var(--omo-magenta)"},
            {"from": {"moduleId": "reverb_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in1"}, "color": "var(--omo-cyan)"},
        ],
    },
    "Lo-Fi Cyberpunk Wasteland": {
        "name": "Lo-Fi Cyberpunk Wasteland",
        "description": "Industrial saw drone and white noise chewed up by a digital bitcrusher with analog tape flutter.",
        "modules": [
            {
                "id": "vco_1",
                "type": "vco",
                "x": 20,
                "y": 20,
                "params": {
                    "wave1": "sawtooth",
                    "freq1": 73.42,  # D2
                    "wave2": "square",
                    "detune2": 15.0,
                    "subLevel": 0.4,
                    "fmDepth": 0.3,
                    "drift": 0.4,
                },
            },
            {
                "id": "noise_1",
                "type": "noise",
                "x": 230,
                "y": 20,
                "params": {
                    "color": "white",
                    "level": 0.3,
                    "crackle": 0.6,
                },
            },
            {
                "id": "bitcrusher_1",
                "type": "bitcrusher",
                "x": 440,
                "y": 20,
                "params": {
                    "bits": 6,
                    "rateReduction": 8,
                    "jitter": 0.25,
                    "mix": 0.9,
                },
            },
            {
                "id": "delay_1",
                "type": "delay",
                "x": 650,
                "y": 20,
                "params": {
                    "time": 340.0,
                    "feedback": 0.62,
                    "damping": 1800.0,
                    "flutter": 0.45,
                    "mix": 0.45,
                },
            },
            {
                "id": "mixer_1",
                "type": "mixer",
                "x": 860,
                "y": 20,
                "params": {
                    "ch1_gain": 0.8,
                    "ch1_pan": 0.0,
                    "ch2_gain": 0.35,
                    "ch2_pan": 0.3,
                    "ch3_gain": 0.0,
                    "ch3_pan": 0.0,
                    "ch4_gain": 0.0,
                    "ch4_pan": 0.0,
                    "master_vol": 0.75,
                },
            },
        ],
        "cables": [
            {"from": {"moduleId": "vco_1", "jack": "out"}, "to": {"moduleId": "bitcrusher_1", "jack": "in"}, "color": "var(--omo-accent)"},
            {"from": {"moduleId": "noise_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in2"}, "color": "var(--omo-warn)"},
            {"from": {"moduleId": "bitcrusher_1", "jack": "out"}, "to": {"moduleId": "delay_1", "jack": "in"}, "color": "var(--omo-cyan)"},
            {"from": {"moduleId": "delay_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in1"}, "color": "var(--omo-magenta)"},
        ],
    },
    "Cosmic Meditation": {
        "name": "Cosmic Meditation",
        "description": "Pure harmonic sine waves drifting with micro-detune, washing into a shimmering endless cavern reverb.",
        "modules": [
            {
                "id": "vco_1",
                "type": "vco",
                "x": 20,
                "y": 20,
                "params": {
                    "wave1": "sine",
                    "freq1": 130.81,  # C3
                    "wave2": "triangle",
                    "detune2": 3.5,
                    "subLevel": 0.5,
                    "fmDepth": 0.0,
                    "drift": 0.6,
                },
            },
            {
                "id": "filter_1",
                "type": "filter",
                "x": 230,
                "y": 20,
                "params": {
                    "mode": "lowpass",
                    "cutoff": 850.0,
                    "resonance": 2.0,
                    "drive": 1.0,
                },
            },
            {
                "id": "delay_1",
                "type": "delay",
                "x": 440,
                "y": 20,
                "params": {
                    "time": 520.0,
                    "feedback": 0.48,
                    "damping": 3000.0,
                    "flutter": 0.1,
                    "mix": 0.35,
                },
            },
            {
                "id": "reverb_1",
                "type": "reverb",
                "x": 650,
                "y": 20,
                "params": {
                    "decay": 8.0,
                    "damping": 5000.0,
                    "mix": 0.75,
                },
            },
            {
                "id": "mixer_1",
                "type": "mixer",
                "x": 860,
                "y": 20,
                "params": {
                    "ch1_gain": 0.9,
                    "ch1_pan": 0.0,
                    "ch2_gain": 0.0,
                    "ch2_pan": 0.0,
                    "ch3_gain": 0.0,
                    "ch3_pan": 0.0,
                    "ch4_gain": 0.0,
                    "ch4_pan": 0.0,
                    "master_vol": 0.8,
                },
            },
        ],
        "cables": [
            {"from": {"moduleId": "vco_1", "jack": "out"}, "to": {"moduleId": "filter_1", "jack": "in"}, "color": "var(--omo-cyan)"},
            {"from": {"moduleId": "filter_1", "jack": "out"}, "to": {"moduleId": "delay_1", "jack": "in"}, "color": "var(--omo-accent)"},
            {"from": {"moduleId": "delay_1", "jack": "out"}, "to": {"moduleId": "reverb_1", "jack": "in"}, "color": "var(--omo-magenta)"},
            {"from": {"moduleId": "reverb_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in1"}, "color": "var(--omo-green)"},
        ],
    },
    "Ethereal Swarm Choir": {
        "name": "Ethereal Swarm Choir",
        "description": "Chord Swarm VCO into vocal Formant Filter, Dimension Chorus, and Space Reverb.",
        "modules": [
            {
                "id": "swarm_1",
                "type": "swarm",
                "x": 20,
                "y": 20,
                "params": {
                    "freq": 65.41,
                    "spread": 18.0,
                    "subLevel": 0.5,
                    "chord": "minor7",
                    "wave": "sawtooth",
                },
            },
            {
                "id": "formant_1",
                "type": "formant",
                "x": 240,
                "y": 20,
                "params": {
                    "vowel": 2.6,
                    "resonance": 9.5,
                },
            },
            {
                "id": "chorus_1",
                "type": "chorus",
                "x": 430,
                "y": 20,
                "params": {
                    "rate": 0.65,
                    "depth": 0.7,
                    "mix": 0.65,
                },
            },
            {
                "id": "reverb_1",
                "type": "reverb",
                "x": 620,
                "y": 20,
                "params": {
                    "decay": 7.0,
                    "mix": 0.7,
                },
            },
            {
                "id": "mixer_1",
                "type": "mixer",
                "x": 810,
                "y": 20,
                "params": {
                    "ch1_gain": 0.85,
                    "ch1_pan": 0.0,
                    "ch2_gain": 0.0,
                    "ch2_pan": 0.0,
                    "ch3_gain": 0.0,
                    "ch3_pan": 0.0,
                    "ch4_gain": 0.0,
                    "ch4_pan": 0.0,
                    "master_vol": 0.8,
                },
            },
        ],
        "cables": [
            {"from": {"moduleId": "swarm_1", "jack": "out"}, "to": {"moduleId": "formant_1", "jack": "in"}, "color": "var(--omo-accent)"},
            {"from": {"moduleId": "formant_1", "jack": "out"}, "to": {"moduleId": "chorus_1", "jack": "in"}, "color": "var(--omo-cyan)"},
            {"from": {"moduleId": "chorus_1", "jack": "out"}, "to": {"moduleId": "reverb_1", "jack": "in"}, "color": "var(--omo-magenta)"},
            {"from": {"moduleId": "reverb_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in1"}, "color": "var(--omo-green)"},
        ],
    },
    "Alien Transmission": {
        "name": "Alien Transmission",
        "description": "Sub drone into Ring Modulator, 6-Stage Phaser, and Tape Delay.",
        "modules": [
            {
                "id": "vco_1",
                "type": "vco",
                "x": 20,
                "y": 20,
                "params": {
                    "wave1": "sawtooth",
                    "freq1": 82.41,
                    "wave2": "triangle",
                    "detune2": -8.0,
                    "subLevel": 0.3,
                    "fmDepth": 0.4,
                    "drift": 0.5,
                },
            },
            {
                "id": "ringmod_1",
                "type": "ringmod",
                "x": 230,
                "y": 20,
                "params": {
                    "freq": 165.0,
                    "shape": "sine",
                    "mix": 0.8,
                },
            },
            {
                "id": "phaser_1",
                "type": "phaser",
                "x": 420,
                "y": 20,
                "params": {
                    "rate": 0.28,
                    "depth": 0.8,
                    "feedback": 0.65,
                    "mix": 0.7,
                },
            },
            {
                "id": "delay_1",
                "type": "delay",
                "x": 610,
                "y": 20,
                "params": {
                    "time": 420.0,
                    "feedback": 0.6,
                    "damping": 2000.0,
                    "flutter": 0.35,
                    "mix": 0.5,
                },
            },
            {
                "id": "mixer_1",
                "type": "mixer",
                "x": 810,
                "y": 20,
                "params": {
                    "ch1_gain": 0.85,
                    "ch1_pan": 0.0,
                    "ch2_gain": 0.0,
                    "ch2_pan": 0.0,
                    "ch3_gain": 0.0,
                    "ch3_pan": 0.0,
                    "ch4_gain": 0.0,
                    "ch4_pan": 0.0,
                    "master_vol": 0.8,
                },
            },
        ],
        "cables": [
            {"from": {"moduleId": "vco_1", "jack": "out"}, "to": {"moduleId": "ringmod_1", "jack": "in"}, "color": "var(--omo-orange)"},
            {"from": {"moduleId": "ringmod_1", "jack": "out"}, "to": {"moduleId": "phaser_1", "jack": "in"}, "color": "var(--omo-yellow)"},
            {"from": {"moduleId": "phaser_1", "jack": "out"}, "to": {"moduleId": "delay_1", "jack": "in"}, "color": "var(--omo-cyan)"},
            {"from": {"moduleId": "delay_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in1"}, "color": "var(--omo-magenta)"},
        ],
    },
    "Granular Dreamscape": {
        "name": "Granular Dreamscape",
        "description": "Chord Swarm into real-time Granular Clouds, Space Reverb, and Auto-Pan.",
        "modules": [
            {
                "id": "swarm_1",
                "type": "swarm",
                "x": 20,
                "y": 20,
                "params": {
                    "freq": 73.42,
                    "spread": 12.0,
                    "subLevel": 0.4,
                    "chord": "fifth",
                    "wave": "triangle",
                },
            },
            {
                "id": "granular_1",
                "type": "granular",
                "x": 240,
                "y": 20,
                "params": {
                    "grainSize": 0.16,
                    "density": 10,
                    "pitchSpray": 0.4,
                    "mix": 0.8,
                },
            },
            {
                "id": "reverb_1",
                "type": "reverb",
                "x": 440,
                "y": 20,
                "params": {
                    "decay": 8.0,
                    "mix": 0.65,
                },
            },
            {
                "id": "autopan_1",
                "type": "autopan",
                "x": 630,
                "y": 20,
                "params": {
                    "rate": 1.2,
                    "depth": 0.85,
                    "shape": "sine",
                },
            },
            {
                "id": "mixer_1",
                "type": "mixer",
                "x": 810,
                "y": 20,
                "params": {
                    "ch1_gain": 0.9,
                    "ch1_pan": 0.0,
                    "ch2_gain": 0.0,
                    "ch2_pan": 0.0,
                    "ch3_gain": 0.0,
                    "ch3_pan": 0.0,
                    "ch4_gain": 0.0,
                    "ch4_pan": 0.0,
                    "master_vol": 0.8,
                },
            },
        ],
        "cables": [
            {"from": {"moduleId": "swarm_1", "jack": "out"}, "to": {"moduleId": "granular_1", "jack": "in"}, "color": "var(--omo-accent)"},
            {"from": {"moduleId": "granular_1", "jack": "out"}, "to": {"moduleId": "reverb_1", "jack": "in"}, "color": "var(--omo-magenta)"},
            {"from": {"moduleId": "reverb_1", "jack": "out"}, "to": {"moduleId": "autopan_1", "jack": "in"}, "color": "var(--omo-cyan)"},
            {"from": {"moduleId": "autopan_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in1"}, "color": "var(--omo-green)"},
        ],
    },
    "Metallic Plate Resonator": {
        "name": "Metallic Plate Resonator",
        "description": "Analog noise into tuned Karplus Resonator, Dimension Chorus, and Tape Delay.",
        "modules": [
            {
                "id": "noise_1",
                "type": "noise",
                "x": 20,
                "y": 20,
                "params": {
                    "color": "pink",
                    "level": 0.5,
                },
            },
            {
                "id": "resonator_1",
                "type": "resonator",
                "x": 200,
                "y": 20,
                "params": {
                    "freq": 110.0,
                    "decay": 0.96,
                    "damping": 4200.0,
                    "mix": 0.85,
                },
            },
            {
                "id": "chorus_1",
                "type": "chorus",
                "x": 390,
                "y": 20,
                "params": {
                    "rate": 0.9,
                    "depth": 0.6,
                    "mix": 0.55,
                },
            },
            {
                "id": "delay_1",
                "type": "delay",
                "x": 580,
                "y": 20,
                "params": {
                    "time": 560.0,
                    "feedback": 0.55,
                    "damping": 3000.0,
                    "flutter": 0.2,
                    "mix": 0.45,
                },
            },
            {
                "id": "mixer_1",
                "type": "mixer",
                "x": 780,
                "y": 20,
                "params": {
                    "ch1_gain": 0.85,
                    "ch1_pan": 0.0,
                    "ch2_gain": 0.0,
                    "ch2_pan": 0.0,
                    "ch3_gain": 0.0,
                    "ch3_pan": 0.0,
                    "ch4_gain": 0.0,
                    "ch4_pan": 0.0,
                    "master_vol": 0.8,
                },
            },
        ],
        "cables": [
            {"from": {"moduleId": "noise_1", "jack": "out"}, "to": {"moduleId": "resonator_1", "jack": "in"}, "color": "var(--omo-orange)"},
            {"from": {"moduleId": "resonator_1", "jack": "out"}, "to": {"moduleId": "chorus_1", "jack": "in"}, "color": "var(--omo-yellow)"},
            {"from": {"moduleId": "chorus_1", "jack": "out"}, "to": {"moduleId": "delay_1", "jack": "in"}, "color": "var(--omo-cyan)"},
            {"from": {"moduleId": "delay_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in1"}, "color": "var(--omo-green)"},
        ],
    },
    "★ The Colossus (3-Row Monster Rack)": {
        "name": "★ The Colossus (3-Row Monster Rack)",
        "rowCount": 3,
        "description": "Massive 3-row Eurorack workstation: generative Turing machine, Euclidean rhythms, chord swarm, harmonic overtone synth patched across filters, tape warmth, rotary speaker, ping-pong delay, shimmer reverb, and 4-ch master.",
        "modules": [
            {
                "id": "turing_1",
                "type": "turing",
                "row": 0,
                "params": {"rate": 3.5, "length": 16, "lock": 0.88, "scale": "minor"},
            },
            {
                "id": "harmonic_1",
                "type": "harmonic",
                "row": 0,
                "params": {"freq": 110.0, "h1": 0.85, "h2": 0.6, "h3": 0.45, "h4": 0.2, "h5": 0.15, "h6": 0.08},
            },
            {
                "id": "swarm_1",
                "type": "swarm",
                "row": 0,
                "params": {"root": 164.81, "chord": "min7", "spread": 0.35, "detune": 8.0, "level": 0.75},
            },
            {
                "id": "euclid_1",
                "type": "euclid",
                "row": 0,
                "params": {"bpm": 115, "steps": 16, "pulses": 7, "offset": 0},
            },
            {
                "id": "svf_1",
                "type": "svf",
                "row": 1,
                "params": {"cutoff": 850.0, "res": 5.0, "morph": 0.3, "drive": 1.4},
            },
            {
                "id": "tape_1",
                "type": "tape_warmer",
                "row": 1,
                "params": {"saturation": 2.8, "warmth": 0.75, "wow": 0.4, "hiss": 0.03},
            },
            {
                "id": "filter_1",
                "type": "filter",
                "row": 1,
                "params": {"cutoff": 420.0, "resonance": 4.5, "drive": 1.3, "mode": "lowpass"},
            },
            {
                "id": "maths_1",
                "type": "maths",
                "row": 1,
                "params": {"rise": 60.0, "fall": 280.0, "curve": 0.2, "level": 0.85},
            },
            {
                "id": "rotary_1",
                "type": "rotary",
                "row": 2,
                "params": {"speed": "fast", "depth": 0.65, "crossover": 750.0, "mix": 0.75},
            },
            {
                "id": "pingpong_1",
                "type": "pingpong",
                "row": 2,
                "params": {"time": 380.0, "feedback": 0.62, "spread": 0.85, "mix": 0.55},
            },
            {
                "id": "shimmer_1",
                "type": "shimmer",
                "row": 2,
                "params": {"decay": 8.5, "mix": 0.7},
            },
            {
                "id": "mixer_1",
                "type": "mixer",
                "row": 2,
                "params": {
                    "ch1_gain": 0.75,
                    "ch1_pan": -0.3,
                    "ch2_gain": 0.7,
                    "ch2_pan": 0.3,
                    "ch3_gain": 0.6,
                    "ch3_pan": 0.0,
                    "ch4_gain": 0.5,
                    "ch4_pan": 0.0,
                    "master_vol": 0.8,
                },
            },
        ],
        "cables": [
            {"from": {"moduleId": "turing_1", "jack": "out"}, "to": {"moduleId": "svf_1", "jack": "in"}, "color": "var(--omo-accent)"},
            {"from": {"moduleId": "harmonic_1", "jack": "out"}, "to": {"moduleId": "tape_1", "jack": "in"}, "color": "var(--omo-green)"},
            {"from": {"moduleId": "swarm_1", "jack": "out"}, "to": {"moduleId": "filter_1", "jack": "in"}, "color": "var(--omo-cyan)"},
            {"from": {"moduleId": "svf_1", "jack": "out"}, "to": {"moduleId": "rotary_1", "jack": "in"}, "color": "var(--omo-orange)"},
            {"from": {"moduleId": "tape_1", "jack": "out"}, "to": {"moduleId": "pingpong_1", "jack": "in"}, "color": "var(--omo-yellow)"},
            {"from": {"moduleId": "filter_1", "jack": "out"}, "to": {"moduleId": "shimmer_1", "jack": "in"}, "color": "var(--omo-magenta)"},
            {"from": {"moduleId": "rotary_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in1"}, "color": "var(--omo-orange)"},
            {"from": {"moduleId": "pingpong_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in2"}, "color": "var(--omo-yellow)"},
            {"from": {"moduleId": "shimmer_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in3"}, "color": "var(--omo-magenta)"},
            {"from": {"moduleId": "euclid_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in4"}, "color": "var(--omo-accent)"},
        ],
    },
    "Algorithmic Cyberpunk Glitch (2-Row)": {
        "name": "Algorithmic Cyberpunk Glitch (2-Row)",
        "rowCount": 2,
        "description": "Pure mathematical bytebeat glitch generator paired with analog 808 percussion, acid voice, spring reverb tank, and bitcrusher across a dual-row case.",
        "modules": [
            {
                "id": "bytebeat_1",
                "type": "bytebeat",
                "row": 0,
                "params": {"clock": 8000, "algo": "viznut", "p1": 5, "p2": 7},
            },
            {
                "id": "percussion_1",
                "type": "percussion",
                "row": 0,
                "params": {"bpm": 128, "kickTune": 55, "decay": 0.45, "snareSnap": 0.7, "hatDecay": 0.08},
            },
            {
                "id": "acid_1",
                "type": "acid303",
                "row": 0,
                "params": {"bpm": 128, "cutoff": 650, "resonance": 7.5, "envMod": 0.8, "accent": 0.5},
            },
            {
                "id": "bitcrusher_1",
                "type": "bitcrusher",
                "row": 1,
                "params": {"bits": 6, "rateReduction": 8},
            },
            {
                "id": "spring_1",
                "type": "spring",
                "row": 1,
                "params": {"drive": 2.2, "tension": 3.0, "damp": 2800, "mix": 0.6},
            },
            {
                "id": "delay_1",
                "type": "delay",
                "row": 1,
                "params": {"time": 234.0, "feedback": 0.5, "damping": 3000.0, "flutter": 0.3, "mix": 0.4},
            },
            {
                "id": "mixer_1",
                "type": "mixer",
                "row": 1,
                "params": {
                    "ch1_gain": 0.65,
                    "ch1_pan": -0.2,
                    "ch2_gain": 0.85,
                    "ch2_pan": 0.0,
                    "ch3_gain": 0.75,
                    "ch3_pan": 0.2,
                    "ch4_gain": 0.0,
                    "ch4_pan": 0.0,
                    "master_vol": 0.8,
                },
            },
        ],
        "cables": [
            {"from": {"moduleId": "bytebeat_1", "jack": "out"}, "to": {"moduleId": "bitcrusher_1", "jack": "in"}, "color": "var(--omo-orange)"},
            {"from": {"moduleId": "acid_1", "jack": "out"}, "to": {"moduleId": "spring_1", "jack": "in"}, "color": "var(--omo-cyan)"},
            {"from": {"moduleId": "bitcrusher_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in1"}, "color": "var(--omo-orange)"},
            {"from": {"moduleId": "percussion_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in2"}, "color": "var(--omo-yellow)"},
            {"from": {"moduleId": "spring_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in3"}, "color": "var(--omo-green)"},
        ],
    },
    "★ 808 & 303 Acid Techno Jam": {
        "name": "★ 808 & 303 Acid Techno Jam",
        "rowCount": 2,
        "description": "Multi-stem drum machine and acid synth loop: discrete 808 Kick, Snare Snap, and Hi-Hat stems alongside a squelching 303 bassline. Hit [SYNC] or [S] to lock all downbeats in unison.",
        "modules": [
            {
                "id": "kick_1",
                "type": "percussion",
                "row": 0,
                "params": {"bpm": 128, "decay": 0.45, "mode": "808kick", "pattern": "four_floor"},
            },
            {
                "id": "snare_1",
                "type": "percussion",
                "row": 0,
                "params": {"bpm": 128, "decay": 0.35, "mode": "snare", "pattern": "backbeat"},
            },
            {
                "id": "hat_1",
                "type": "percussion",
                "row": 0,
                "params": {"bpm": 128, "decay": 0.08, "mode": "hihat", "pattern": "every_8th"},
            },
            {
                "id": "acid_1",
                "type": "acid303",
                "row": 0,
                "params": {"bpm": 128, "cutoff": 550, "resonance": 16.0, "envMod": 0.75, "wave": "sawtooth"},
            },
            {
                "id": "fuzz_1",
                "type": "fuzz",
                "row": 1,
                "params": {"gain": 5.0, "tone": 4500, "mix": 0.65},
            },
            {
                "id": "filter_1",
                "type": "filter",
                "row": 1,
                "params": {"cutoff": 1800, "resonance": 3.5, "drive": 1.4, "mode": "lowpass"},
            },
            {
                "id": "delay_1",
                "type": "delay",
                "row": 1,
                "params": {"time": 234.0, "feedback": 0.45, "damping": 3200, "flutter": 0.2, "mix": 0.35},
            },
            {
                "id": "mixer_1",
                "type": "mixer",
                "row": 1,
                "params": {
                    "ch1_gain": 0.95,
                    "ch1_pan": 0.0,
                    "ch2_gain": 0.85,
                    "ch2_pan": 0.0,
                    "ch3_gain": 0.7,
                    "ch3_pan": 0.35,
                    "ch4_gain": 0.8,
                    "ch4_pan": -0.25,
                    "master_vol": 0.85,
                },
            },
        ],
        "cables": [
            {"from": {"moduleId": "kick_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in1"}, "color": "var(--omo-accent)"},
            {"from": {"moduleId": "snare_1", "jack": "out"}, "to": {"moduleId": "fuzz_1", "jack": "in"}, "color": "var(--omo-orange)"},
            {"from": {"moduleId": "fuzz_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in2"}, "color": "var(--omo-orange)"},
            {"from": {"moduleId": "hat_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in3"}, "color": "var(--omo-yellow)"},
            {"from": {"moduleId": "acid_1", "jack": "out"}, "to": {"moduleId": "filter_1", "jack": "in"}, "color": "var(--omo-cyan)"},
            {"from": {"moduleId": "filter_1", "jack": "out"}, "to": {"moduleId": "delay_1", "jack": "in"}, "color": "var(--omo-green)"},
            {"from": {"moduleId": "delay_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in4"}, "color": "var(--omo-magenta)"},
        ],
    },
    "★ Daft Modular Funk (MIDI Live)": {
        "name": "★ Daft Modular Funk (MIDI Live)",
        "description": "Multi-track MIDI File Player running Daft Punk into Ladder Filter, Chorus, and 808 beat.",
        "rowCount": 2,
        "modules": [
            {
                "id": "midi_1",
                "type": "midi_player",
                "row": 0,
                "params": {
                    "rate": 1.0,
                    "transpose": 0,
                    "gain": 1.8,
                    "level": 1.0,
                    "timbre": "poly_epiano",
                    "starter": "Daft Punk - Around The World.mid",
                },
            },
            {
                "id": "filter_1",
                "type": "filter",
                "row": 0,
                "params": {"cutoff": 1600.0, "resonance": 3.8, "drive": 1.5, "mode": "lowpass"},
            },
            {
                "id": "chorus_1",
                "type": "chorus",
                "row": 0,
                "params": {"rate": 0.8, "depth": 0.65, "mix": 0.5},
            },
            {
                "id": "kick_1",
                "type": "percussion",
                "row": 1,
                "params": {"sound": "808kick", "bpm": 123.0, "decay": 0.45, "pattern": "four_floor"},
            },
            {
                "id": "snare_1",
                "type": "percussion",
                "row": 1,
                "params": {"sound": "snare", "bpm": 123.0, "decay": 0.25, "pattern": "backbeat"},
            },
            {
                "id": "tape_1",
                "type": "tape_warmer",
                "row": 1,
                "params": {"saturation": 2.2, "warmth": 0.7, "wow": 0.2, "hiss": 0.02},
            },
            {
                "id": "mixer_1",
                "type": "mixer",
                "row": 1,
                "params": {
                    "ch1_gain": 0.9,
                    "ch1_pan": 0.0,
                    "ch2_gain": 0.95,
                    "ch2_pan": 0.0,
                    "ch3_gain": 0.8,
                    "ch3_pan": 0.0,
                    "ch4_gain": 0.0,
                    "ch4_pan": 0.0,
                    "master_vol": 0.85,
                },
            },
        ],
        "cables": [
            {"from": {"moduleId": "midi_1", "jack": "out"}, "to": {"moduleId": "filter_1", "jack": "in"}, "color": "var(--omo-cyan)"},
            {"from": {"moduleId": "filter_1", "jack": "out"}, "to": {"moduleId": "chorus_1", "jack": "in"}, "color": "var(--omo-green)"},
            {"from": {"moduleId": "chorus_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in1"}, "color": "var(--omo-cyan)"},
            {"from": {"moduleId": "kick_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in2"}, "color": "var(--omo-accent)"},
            {"from": {"moduleId": "snare_1", "jack": "out"}, "to": {"moduleId": "tape_1", "jack": "in"}, "color": "var(--omo-orange)"},
            {"from": {"moduleId": "tape_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in3"}, "color": "var(--omo-magenta)"},
        ],
    },
    "★ Euclidean Breakbeat & Modular Sample Jam": {
        "name": "★ Euclidean Breakbeat & Modular Sample Jam",
        "description": "4-track Bjorklund Euclidean sequencer driving vintage TR-909/707 samples, West-Coast macro percussion, and stochastic morphing wavetable lead.",
        "modules": [
            {
                "id": "euclid_1",
                "type": "quad_euclid",
                "row": 0,
                "params": {"bpm": 125, "active_ch": "ch1", "steps": 16, "pulses": 4, "offset": 0, "run": "running"},
            },
            {
                "id": "sample_kick",
                "type": "sample_player",
                "row": 0,
                "params": {"kit": "tr909", "voice": "kick", "pitch": 0, "decay": 0.45, "crunch": 0.2, "cutoff": 12000, "level": 1.0},
            },
            {
                "id": "sample_snare",
                "type": "sample_player",
                "row": 0,
                "params": {"kit": "tr707", "voice": "snare", "pitch": 0, "decay": 0.35, "crunch": 0.3, "cutoff": 10000, "level": 0.95},
            },
            {
                "id": "macro_perc_1",
                "type": "macro_percussion",
                "row": 0,
                "params": {"model": "metallic_hat", "pitch": 60, "decay": 0.25, "harmonics": 0.5, "morph": 0.4, "fold": 0.2, "accent": 0.8},
            },
            {
                "id": "stoch_1",
                "type": "stochastic_vault",
                "row": 1,
                "params": {"rate": 4.0, "deja_vu": 0.8, "length": 16, "spread": 1.5, "scale": "dorian", "root": "A", "jitter": 0.15},
            },
            {
                "id": "wave_dual_1",
                "type": "wavetable_dual",
                "row": 1,
                "params": {"freq1": 55.0, "freq2": 110.0, "detune": 7.0, "table1": "ppg_bell", "table2": "vocal_formant", "morph": 0.45, "cross_fm": 0.2, "sub_level": 0.5},
            },
            {
                "id": "filter_1",
                "type": "filter",
                "row": 1,
                "params": {"mode": "lowpass", "cutoff": 950.0, "resonance": 5.5, "drive": 1.4},
            },
            {
                "id": "delay_1",
                "type": "delay",
                "row": 1,
                "params": {"time": 480.0, "feedback": 0.5, "damping": 2500.0, "flutter": 0.2, "mix": 0.45},
            },
            {
                "id": "mixer_1",
                "type": "mixer",
                "row": 1,
                "params": {
                    "ch1_gain": 0.95,
                    "ch1_pan": 0.0,
                    "ch2_gain": 0.9,
                    "ch2_pan": 0.0,
                    "ch3_gain": 0.8,
                    "ch3_pan": 0.2,
                    "ch4_gain": 0.85,
                    "ch4_pan": -0.1,
                    "master_vol": 0.85,
                },
            },
        ],
        "cables": [
            {"from": {"moduleId": "euclid_1", "jack": "trig1"}, "to": {"moduleId": "sample_kick", "jack": "trig"}, "color": "var(--omo-accent)"},
            {"from": {"moduleId": "euclid_1", "jack": "trig2"}, "to": {"moduleId": "sample_snare", "jack": "trig"}, "color": "var(--omo-orange)"},
            {"from": {"moduleId": "euclid_1", "jack": "trig3"}, "to": {"moduleId": "macro_perc_1", "jack": "trig"}, "color": "var(--omo-cyan)"},
            {"from": {"moduleId": "sample_kick", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in1"}, "color": "var(--omo-accent)"},
            {"from": {"moduleId": "sample_snare", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in2"}, "color": "var(--omo-orange)"},
            {"from": {"moduleId": "macro_perc_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in3"}, "color": "var(--omo-green)"},
            {"from": {"moduleId": "stoch_1", "jack": "cv_out"}, "to": {"moduleId": "wave_dual_1", "jack": "scan_cv"}, "color": "var(--omo-magenta)"},
            {"from": {"moduleId": "wave_dual_1", "jack": "out"}, "to": {"moduleId": "filter_1", "jack": "in"}, "color": "var(--omo-cyan)"},
            {"from": {"moduleId": "filter_1", "jack": "out"}, "to": {"moduleId": "delay_1", "jack": "in"}, "color": "var(--omo-yellow)"},
            {"from": {"moduleId": "delay_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in4"}, "color": "var(--omo-magenta)"},
        ],
    },
    "★ Jungle Amen Break & West-Coast Acid": {
        "name": "★ Jungle Amen Break & West-Coast Acid",
        "description": "165 BPM Amen Breakbeat slicer in jungle stutter mode combined with procedural West-Coast FM sub kick, resonant Acid 303 bass, and tape warmth.",
        "modules": [
            {
                "id": "slicer_1",
                "type": "amen_slicer",
                "row": 0,
                "params": {"bpm": 165, "break": "amen_classic", "mode": "jungle_stutter", "slice": 1, "stutter": 0.35, "reverse": 0.2, "pitch": 0, "filter": 9000},
            },
            {
                "id": "macro_kick_1",
                "type": "macro_percussion",
                "row": 0,
                "params": {"model": "bass_drum", "pitch": 50, "decay": 0.4, "harmonics": 0.45, "morph": 0.3, "fold": 0.25, "accent": 0.9},
            },
            {
                "id": "acid_1",
                "type": "acid303",
                "row": 0,
                "params": {"bpm": 165, "cutoff": 550.0, "resonance": 16.0, "envMod": 0.7, "wave": "sawtooth"},
            },
            {
                "id": "tape_1",
                "type": "tape_warmer",
                "row": 1,
                "params": {"saturation": 2.6, "warmth": 0.75, "wow": 0.25, "hiss": 0.03},
            },
            {
                "id": "spring_1",
                "type": "spring",
                "row": 1,
                "params": {"tension": 2.0, "drive": 2.0, "damp": 3200, "mix": 0.4},
            },
            {
                "id": "mixer_1",
                "type": "mixer",
                "row": 1,
                "params": {
                    "ch1_gain": 0.95,
                    "ch1_pan": 0.0,
                    "ch2_gain": 0.9,
                    "ch2_pan": 0.0,
                    "ch3_gain": 0.85,
                    "ch3_pan": 0.0,
                    "master_vol": 0.85,
                },
            },
        ],
        "cables": [
            {"from": {"moduleId": "slicer_1", "jack": "out"}, "to": {"moduleId": "tape_1", "jack": "in"}, "color": "var(--omo-orange)"},
            {"from": {"moduleId": "tape_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in1"}, "color": "var(--omo-orange)"},
            {"from": {"moduleId": "macro_kick_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in2"}, "color": "var(--omo-accent)"},
            {"from": {"moduleId": "acid_1", "jack": "out"}, "to": {"moduleId": "spring_1", "jack": "in"}, "color": "var(--omo-cyan)"},
            {"from": {"moduleId": "spring_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in3"}, "color": "var(--omo-magenta)"},
        ],
    },
    "★ TR-Matrix Drums & Ducking Sidechain Bass": {
        "name": "★ TR-Matrix Drums & Ducking Sidechain Bass",
        "description": "16-step TR-style clickable drum sequencer driving 909 kick, snare, and metallic hats, with a Sidechain Ducking VCA pumping a resonant sub-bass drone out of the kick's path.",
        "modules": [
            {
                "id": "tr_seq_1",
                "type": "tr_matrix_seq",
                "row": 0,
                "params": {"bpm": 128, "swing": 15, "accent": 0.65, "steps": 16, "run": "running"},
            },
            {
                "id": "kick_drum",
                "type": "sample_player",
                "row": 0,
                "params": {"kit": "tr909", "voice": "kick", "pitch": 0, "decay": 0.5, "crunch": 0.25, "cutoff": 12000, "level": 1.0},
            },
            {
                "id": "snare_drum",
                "type": "sample_player",
                "row": 0,
                "params": {"kit": "tr909", "voice": "snare", "pitch": 0, "decay": 0.35, "crunch": 0.3, "cutoff": 10000, "level": 0.95},
            },
            {
                "id": "hihat_voice",
                "type": "macro_percussion",
                "row": 0,
                "params": {"model": "metallic_hat", "pitch": 60, "decay": 0.2, "harmonics": 0.5, "morph": 0.4, "fold": 0.2, "accent": 0.8},
            },
            {
                "id": "sub_drone",
                "type": "vco",
                "row": 1,
                "params": {"wave1": "sawtooth", "freq1": 55.0, "wave2": "triangle", "detune2": 6.0, "subLevel": 0.7, "fmDepth": 0.1, "drift": 0.3},
            },
            {
                "id": "acid_filter",
                "type": "filter",
                "row": 1,
                "params": {"cutoff": 650.0, "resonance": 4.5, "drive": 1.4, "type": "lowpass"},
            },
            {
                "id": "sidechain_1",
                "type": "sidechain_vca",
                "row": 1,
                "params": {"ducking": 0.85, "threshold": -14.0, "attack": 2.0, "release": 190.0, "mode": "audio_peak"},
            },
            {
                "id": "mixer_1",
                "type": "mixer",
                "row": 1,
                "params": {
                    "ch1_gain": 0.95,
                    "ch1_pan": 0.0,
                    "ch2_gain": 0.9,
                    "ch2_pan": 0.0,
                    "ch3_gain": 0.8,
                    "ch3_pan": 0.2,
                    "ch4_gain": 0.85,
                    "ch4_pan": -0.1,
                    "master_vol": 0.85,
                },
            },
        ],
        "cables": [
            {"from": {"moduleId": "tr_seq_1", "jack": "trig_bd"}, "to": {"moduleId": "kick_drum", "jack": "trig"}, "color": "var(--omo-accent)"},
            {"from": {"moduleId": "tr_seq_1", "jack": "trig_sd"}, "to": {"moduleId": "snare_drum", "jack": "trig"}, "color": "var(--omo-orange)"},
            {"from": {"moduleId": "tr_seq_1", "jack": "trig_ch"}, "to": {"moduleId": "hihat_voice", "jack": "trig"}, "color": "var(--omo-cyan)"},
            {"from": {"moduleId": "tr_seq_1", "jack": "trig_bd"}, "to": {"moduleId": "sidechain_1", "jack": "sidechain"}, "color": "var(--omo-accent)"},
            {"from": {"moduleId": "sub_drone", "jack": "out"}, "to": {"moduleId": "acid_filter", "jack": "in"}, "color": "var(--omo-green)"},
            {"from": {"moduleId": "acid_filter", "jack": "out"}, "to": {"moduleId": "sidechain_1", "jack": "in"}, "color": "var(--omo-green)"},
            {"from": {"moduleId": "kick_drum", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in1"}, "color": "var(--omo-accent)"},
            {"from": {"moduleId": "snare_drum", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in2"}, "color": "var(--omo-orange)"},
            {"from": {"moduleId": "hihat_voice", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in3"}, "color": "var(--omo-cyan)"},
            {"from": {"moduleId": "sidechain_1", "jack": "out"}, "to": {"moduleId": "mixer_1", "jack": "in4"}, "color": "var(--omo-magenta)"},
        ],
    },
}


def list_presets(patches_dir: Path) -> list[dict[str, Any]]:
    """List all factory and user presets."""
    result = []
    # Factory presets
    for name, p in FACTORY_PRESETS.items():
        result.append({
            "name": name,
            "type": "factory",
            "description": p.get("description", ""),
        })

    # User presets in patches_dir
    if patches_dir.is_dir():
        for path in sorted(patches_dir.glob("*.json")):
            try:
                data = json.loads(path.read_text("utf-8"))
                result.append({
                    "name": path.stem,
                    "type": "user",
                    "description": data.get("description", "User preset"),
                })
            except (json.JSONDecodeError, OSError):
                continue
    return result


def get_preset(name: str, patches_dir: Path) -> dict[str, Any] | None:
    """Retrieve preset by name from factory or user directory."""
    if name in FACTORY_PRESETS:
        return FACTORY_PRESETS[name]

    user_file = patches_dir / f"{Path(name).name}.json"
    if user_file.is_file():
        try:
            return json.loads(user_file.read_text("utf-8"))
        except (json.JSONDecodeError, OSError):
            return None
    return None


def save_user_preset(name: str, data: dict[str, Any], patches_dir: Path) -> Path:
    """Save user preset to patches directory."""
    patches_dir.mkdir(parents=True, exist_ok=True)
    clean_name = "".join(c for c in name if c.isalnum() or c in ("-", "_", " ")).strip()
    if not clean_name:
        clean_name = "Untitled Patch"
    file_path = patches_dir / f"{clean_name}.json"
    data["name"] = clean_name
    file_path.write_text(json.dumps(data, indent=2), "utf-8")
    return file_path


def load_state(state_file: Path) -> dict[str, Any]:
    """Load last autosaved session state or default to Deep Abyssal Drone."""
    if state_file.is_file():
        try:
            return json.loads(state_file.read_text("utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return FACTORY_PRESETS["Deep Abyssal Drone"]


def save_state(state: dict[str, Any], state_file: Path) -> None:
    """Autosave session state."""
    state_file.parent.mkdir(parents=True, exist_ok=True)
    state_file.write_text(json.dumps(state, indent=2), "utf-8")
