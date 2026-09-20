# OmoModular

A minimalist, tactile Eurorack modular synthesizer and ambient drone workstation designed for Omarchy.

Features an authentic modular rack with physical rails, 3.5mm jacks, dangling physics patch cables with gravity and sag, rotary vector knobs, and a live vector oscilloscope. Runs a zero-dependency Web Audio DSP engine inside a dedicated Chromium `--app` window and dynamically synchronizes with your active Omarchy system theme.

---

## 51 Eurorack Modules

OmoModular features an expansive ecosystem of 51 vintage, modern, and boutique Eurorack modules:

| Module | Category | Description |
| :--- | :--- | :--- |
| **Dual Drone VCO** | Source | Dual analog waveforms, micro-detune, sub-octave, cross-FM, slow drift |
| **Chord Swarm VCO** | Source | 4-voice supersaw & chord cluster with spread detuning, sub-bass, and chord modes |
| **Wavetable VCO** | Source | Morphable wavetable oscillator across analog saw, digital pulse, vocal, and bell spectra |
| **Dual Morphing Wavetable** | Source | Dual periodic wavetable oscillator with Fourier harmonic series, cross-FM, and sub-octave bass |
| **FM Quad Operator** | Source | 4-operator FM synthesis engine with ratio tuning and feedback |
| **Harmonic Oscillator** | Source | 6-overtone additive sine oscillator with individual harmonic level faders |
| **Turing Machine** | Source | Music Thing style shift register generating quantized melodies in multiple musical scales |
| **Sub-Bass Booster** | Source | Subharmonic frequency divider producing deep -1 and -2 octave low-end foundation |
| **Acid 303 Voice** | Source | Roland TB-303 analog baseline voice with squelchy diode ladder filter and accent |
| **Analog Drums (808)** | Percussion | Analog kick, snappy snare, and metallic hi-hat percussion voice |
| **Open Sample Drum** | Percussion | Vintage PCM drum machine (909/707/Linn/DMX/CR-78) with 12-bit SP-1200 decimation and WAV drag-and-drop |
| **Macro Percussion Voice** | Percussion | Plaits/Basimilus algorithmic percussion synth with 6 physical models, wavefolder, and punch |
| **Amen Break Slicer** | Percussion | 16-step transient chopper breakbeat slicer with master BPM sync, jungle stutter, and reverse playback |
| **16-Step DRUM MATRIX** | Percussion | 4-track clickable TR-style drum matrix sequencer with swing, accent, and direct trigger outs |
| **Euclidean Poly-Rhythm** | Sequencer | 4-track Bjorklund Euclidean sequencer with independent step/pulse/offset rings and 4 trigger outs |
| **Stochastic Random CV** | Modulation | Mutable Marbles inspired generative random melody and rhythmic gate engine with scale quantizer |
| **Noise & Texture** | Texture | White, Pink, Brown noise generator with tape/vinyl texture |
| **Bytebeat Glitch** | Lo-Fi | Algorithmic C-style one-line mathematical bytebeat oscillator |
| **Ladder Filter** | Filter | Resonant 24dB lowpass/bandpass/highpass with saturation drive |
| **State Variable SVF** | Filter | 12dB/oct Oberheim-style multi-mode SVF continuously morphing LP -> Notch -> HP |
| **Formant Filter** | Filter | Dual-peak vocal tract filter continuously morphing across vowel formants (A-E-I-O-U) |
| **Comb Resonator** | Filter | High-Q tuned comb filter with resonant ringing and chromatic pitch tracking |
| **7-Band Graphic EQ** | Filter | Discrete graphic equalizer covering sub-bass to air (60Hz - 12kHz) |
| **Wavefolder** | Distortion | Trigonometric harmonic wavefolding and soft-clipping warmth |
| **Germanium Fuzz** | Distortion | Vintage Germanium diode asymmetric saturation and fuzzy harmonic breakup |
| **Bitcrusher** | Lo-Fi | Digital downsampling decimation and bit-depth quantization crunch |
| **Portastudio Tape Warmer** | Lo-Fi | 4-track cassette emulation with head saturation, wow/flutter, and tape hiss |
| **Ring Modulator** | Dissonance | Carrier frequency multiplication for alien, metallic, and robotic tones |
| **Karplus Resonator** | Physical | Tuned string and metallic plate physical modeling resonator |
| **Tape Delay** | Time | Stereo delay with feedback, damping filter, and wow/flutter |
| **Stereo Ping-Pong BBD** | Time | Bucket brigade analog delay bouncing cross-feedback between stereo channels |
| **Space Reverb** | Space | Ambient diffusion reverb for endless drone washes |
| **Mechanical Spring Reverb** | Space | Dual-spring dispersion tank with drive saturation, tension feedback, and damping |
| **Shimmer Reverb** | Space | Celestial ambient shimmer reverb with octave-transposed infinite feedback |
| **Granular Clouds** | Texture | Real-time micro-sampling grain texture cloud generator with pitch spray |
| **Dimension Chorus** | Modulation | Multi-voice bucket-brigade delay stereo chorus and flanger |
| **Optical Phaser** | Modulation | 6-stage analog allpass phaser with sweeping feedback swoosh |
| **Auto-Pan & Tremolo** | Spatial | Stereo spatial motion and optical amplitude chopper |
| **Leslie Rotary Cabinet** | Spatial | Rotating horn and drum cabinet simulation with physical Doppler pitch shift |
| **ADSR Envelope & VCA** | Modulation | 4-stage envelope generator with looping LFO mode |
| **Maths Function Gen** | Modulation | Dual slew and function generator with log/linear/exponential curve shaping |
| **Quad Morphing LFO** | Modulation | 4-phase quadrature low-frequency modulation oscillator with 90-degree phase offsets |
| **Euclidean Rhythm Gen** | Utility | Bjorklund algorithmic pulse generator for polyrhythms with audio impulse click |
| **8-Step Gate Sequencer** | Utility | Rhythmic 8-step volume chopper and sync gate pulse generator |
| **Sample & Hold** | Utility | Analog S&H with internal pink/white noise source and variable slew glide |
| **Signal Mult & Inverter** | Utility | 1-to-3 audio signal splitter with dual direct outs and phase inverted output |
| **A/B Crossfader** | Utility | Dual-channel crossfader with equal-power trigonometric morphing curve |
| **VCA Glue Compressor** | Dynamics | Bus compressor with threshold, ratio, attack, release, and makeup gain |
| **Sidechain Ducking VCA** | Dynamics | Dynamic ducking amplifier and envelope follower preventing low-end clash |
| **MIDI File Player** | Source | Standard MIDI File (SMF 0/1) workstation with live stem mixer, CV/Gate outs, and drag-and-drop |
| **4-Ch Mixer & Master** | Master | 4 stereo channels with gain, pan, master limiter, and live oscilloscope |

---

## Dual Sound Archive: Sample & MIDI Repositories

Hit `[M]` or click `[M] ARCHIVES` in the top bar to slide out the left archive drawer:

### Sample Archive (`[♪ SAMPLES]`)
- **12 Bundled Offline Starter Samples:** Embedded high-quality 16-bit 44.1kHz `.wav` percussion samples across 5 categories (808 Sub Kick, 909 Punch Kick, Linn Retro Kick, 909 Crisp Snare, 707 Rim Snare, 808 Handclap, 909 Open Hat, 808 Closed Hat, DMX Cowbell, Modular Laser Zap, Wooden Clave, and 165 BPM Amen Breakbeat).
- **Freesound CC0 Creative Commons Online Search:** Search thousands of royalty-free drum samples and breaks with zero configuration required for starters, plus optional user Freesound API key saving.
- **Web Audio Audition Preview:** Zero-latency `[▶ PLAY]` / `[■ STOP]` auditioning directly from the search cards through the master mixing engine before adding to the rack.
- **Smart Drag & Drop Loading:** Drag any sample card directly onto an empty Eurorack rail slot to auto-spawn an `Open Sample Drum` (`sample_player`) or `Amen Break Slicer` (`amen_slicer`), or drop directly onto an existing module faceplate to instantly reload its audio buffer.

### MIDI Archive (`[♫ MIDI FILES]`)
- **113,000+ Songs Online:** Zero-login, direct search and live fetch from the public BitMidi archive.
- **Single-Track Riff Filtering (`[★ 1-TRACK RIFFS]`):** Filter specifically for isolated single-instrument basslines, 303 squelches, arpeggios, and leads.
- **Instant Stem Isolation (`[1-TRK]`):** Every multi-track song can be loaded as a full orchestration or isolated to a single lead/bass stem with one click.
- **Offline Starter Catalog:** Bundled recognizable loops (Mario, Doom, Queen, Megalovania, Billie Jean, Zelda, Acid 303, Moog Sub, Daft Punk, Bach).
- **Drag & Drop:** Drag any search card directly into the rack or onto a MIDI File Player faceplate.

---

## 80" Fullscreen TV Rack Simulation Mode

Press `[F]` or click `[:: TV RACK]` in the top bar:
- Extruded brushed aluminum rails with threaded channels and slotted hex screws.
- Knurled 28-30px jack nuts with deep sockets and physical module chamfers.
- 10-foot couch UI scaling optimized for 1080p rendering on large displays.

---

## Multi-Row Eurorack Rails

OmoModular supports arbitrary rows of Eurorack rails:
- **`[+ Row]` button** on the header or bottom banner creates a new rail row on demand.
- **Active-Row Targeting:** Clicking any row marks it active for incoming module placement from the library drawer.
- **Cross-Row Hanging Cables:** Physics engine calculates deep hanging loops for patch cables spanning across tiers.

---

## Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `F` | Toggle 80" Fullscreen TV Rack Simulation Mode |
| `M` | Toggle Left Pop-Out MIDI Archive & Search Drawer |
| `S` | Transport Reset / SYNC — instantly resets downbeat step phase across all active rhythmic modules |
| `Space` | Master audio mute / panic cut |
| `C` | Toggle cable ghosting (dims cables to 18% opacity to view panel controls) |
| `Tab` / `D` | Toggle collapsible Module Library Drawer |
| `R` | Randomize parameters on the hovered/selected module |

---

## Presets & State

- **Factory Presets:**
  - `★ TR-Matrix Drums & Ducking Sidechain Bass`: 16-step TR-style clickable drum sequencer driving 909 kick, snare, and metallic hats, with a Sidechain Ducking VCA pumping a resonant sub-bass drone out of the kick's path.
  - `★ Euclidean Breakbeat & Modular Sample Jam`: 4-track Euclidean polyrhythm sequencer driving 909 kick, 707 snare, macro percussion, and stochastic wavetable lead into delay/reverb and master console.
  - `★ Jungle Amen Break & West-Coast Acid`: 165 BPM Amen break slicer in jungle stutter mode with macro sub kick, 303 acid line, tape warmer, and spring tank.
  - `★ 808 & 303 Acid Techno Jam`: Multi-stem drum machine and acid synth loop (discrete 808 Kick, Snare, and Hi-Hat stems alongside squelching 303 bassline). Hit `[SYNC]` or `S` to lock all stems in unison.
  - `★ The Colossus (3-Row Monster Rack)`: 3-row generative modular workstation showcasing cross-tier patching.
  - `★ Algorithmic Cyberpunk Glitch (2-Row)`: Dual-tier industrial glitch and breakbeat patch.
  - `★ Deep Abyssal Drone`: Sub-octave drone VCO and brown noise into resonant lowpass, tape echo, and massive space reverb.
  - `★ Solar Flare FM`: Cross-frequency modulated oscillators into wavefolder and sweeping resonant bandpass filter.
  - `★ Lo-Fi Cyberpunk Wasteland`: Industrial saw drone and white noise chewed up by bitcrusher with tape flutter.
  - `★ Cosmic Meditation`: Pure harmonic sine waves drifting with micro-detune into tape delay and infinite ambient reverb.
  - `★ Ethereal Swarm Choir`: Chord Swarm VCO into vocal Formant Filter, Dimension Chorus, and Space Reverb.
  - `★ Alien Transmission`: Sub drone into Ring Modulator, 6-Stage Phaser, and Tape Delay.
  - `★ Granular Dreamscape`: Chord Swarm into real-time Granular Clouds, Space Reverb, and Auto-Pan.
  - `★ Metallic Plate Resonator`: Analog noise into tuned Karplus Resonator, Dimension Chorus, and Tape Delay.
- **Autosave:** Remembers all modules, parameters, and patch cables across app restarts in `~/.config/omomodular/state.json`.
- **User Patches:** Saved as JSON files in `~/.config/omomodular/patches/`.

---

## Quick Launch

```bash
# Launch via installed binary
omomodular

# Or run directly from repo
cd ~/Work/omomodular
./.venv/bin/python -m omomodular
```
