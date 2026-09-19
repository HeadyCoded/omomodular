# Changelog

## 0.6.1 — 2026-09-19
- **MIDI Search Engine Overhaul & Stale Process Fix:**
  - Fixed BitMidi search query mutation that appended `" riff"` and discarded legitimate artist/song matches (e.g. Daft Punk, Mario, Queen, Bach).
  - Upgraded link scraping regex to capture extended slugs (`-mid-1`, `-mid-2`) and title attributes cleanly.
  - Implemented tokenized matching against local starter library so partial artist/song keywords match immediately.
  - Added 6 offline starter loops for common search terms: `Super Mario Bros - Overworld Theme`, `Doom - E1M1 At Dooms Gate`, `Queen - Another One Bites The Dust`, `Megalovania - Sans Theme`, `Michael Jackson - Billie Jean`, and `Zelda - Overworld Main Theme`.
  - Added live 350ms debounced input search in the drawer UI: results update dynamically as you type without requiring Enter or button clicks.
  - Fixed silent failure on non-200 responses: UI now checks `resp.ok` and displays descriptive status errors.
  - Terminated stale background server process that was running pre-MIDI routes and restarted latest backend on port 8796.

## 0.6.0 — 2026-09-19
- **Single-Track MIDI Filter & Riff Library:**
  - Added filter pills to MIDI drawer (`[ALL FILES]`, `[★ 1-TRACK RIFFS]`, `[MULTI-TRACK]`) with backend `filter_type` support across `/api/midi/starters` and `/api/midi/search`.
  - Added binary SMF header inspector (`inspect_midi_header`) reading track counts directly from `MThd` chunks (bytes 8-14) to identify 1-track loops vs. multi-channel orchestrations.
  - Bundled 7 isolated 1-track starter riffs: `Acid 303 Resonance Riff (1-Track)`, `Deep Moog Sub Bassline (1-Track)`, `Cyberpunk 16th Arp Hook (1-Track)`, `Funky Slap Bass Groove (1-Track)`, `Detroit Techno Stabs (1-Track)`, `Chiptune Retro Lead (1-Track)`, and `Dark Synthwave Bass (1-Track)`.
  - Added `[1-TRK]` instant isolate button to every track row in the MIDI Player module: isolate any stem from a complex multi-track song with one click.
  - Added quick `[1-TRK]` load button on multi-track search cards to automatically isolate the melodic/bass lead.
- **Authentic Eurorack Hardware Aesthetics & Variable Widths:**
  - Redesigned flagship **MIDI File Player** to 380px width (32HP) with expanded track list, clear LED indicators, and dual transport rows.
  - Slimmed utility **Signal Mult** to 110px (compact 4HP buffer).
  - Scaled **Analog Drums 808** and **Acid 303 Voice** to 230px faceplates with Roland-inspired matte carbon and silver anodization.
  - Distinct panel personalities for all modules: Moog ladder filter, Tascam Portastudio, CRT phosphor bytebeat, and metallic edge chamfers.
  - Upgraded jacks to 28px knurled hex nuts with deep black 11px sockets.
- **80" Hisense TV Rack Simulation Mode:**
  - Extruded brushed aluminum rails with threaded channel guides and countersunk slotted hex screws along every row.
  - Added `[F] TV RACK` toggle button in header and `F` keyboard shortcut.
  - 10-foot couch UI scaling: enlarged knobs (48px) and knurled jacks (30px) optimized for 1080p rendering on large displays.

## 0.5.0 — 2026-09-19
- **Multi-Track MIDI File Player Module (`midi_player`):**
  - Standard MIDI File (SMF Format 0 & 1) parser with microsecond-to-second timing and multi-channel extraction.
  - Multi-track visual layer inspector: renders all discrete tracks (bass, melody, drums, chords) with note counters and active-note LEDs.
  - Per-track live `[M]` Mute and `[S]` Solo controls: mute unwanted stems or isolate individual layers in real-time.
  - Polyphonic synthesizer engine with selectable timbres (`analog_saw`, `poly_epiano`, `chiptune`, `fm_bell`, `sine_sub`).
  - Modular CV/Gate jacks: `AUDIO OUT` (polyphonic mix of unmuted tracks), `PITCH` (frequency CV), `GATE` (digital high trigger), and `VEL` (velocity 0-1).
  - Drag-and-drop faceplate: accepts `.mid` files dragged from the OS file manager or directly from the search drawer.
  - Transport & Sync: Play, Pause, Rewind, Loop toggle, and downbeat synchronization with `[⟳ SYNC]` / `S` key.
- **Left Pop-Out Open MIDI Archive Drawer:**
  - Header `[M] MIDI` button and `M` keyboard shortcut opens sliding Tokyo-night search drawer on the left screen margin.
  - Direct integration with BitMidi archive (113,000+ songs, zero login, zero API keys).
  - FastAPI proxy backend (`/api/midi/search`, `/api/midi/download`, `/api/midi/starters`) with local caching in `omomodular/midi/downloads/`.
  - Bundled offline starter catalog: `Acid Techno 303 & 808`, `Bach - Two-Part Invention`, `Cyberpunk Synthwave Arp`, `Daft Punk - Around The World`.
  - Draggable search cards with quick `[LOAD]` button that automatically routes files into the active MIDI Player module.
- **Factory Preset:**
  - Added `★ Daft Modular Funk (MIDI Live)`: 2-row patch with Daft Punk multi-track MIDI running through Ladder Filter, Dimension Chorus, and 808 drums.

## 0.4.0 — 2026-09-19
- **Transport Reset & Downbeat Synchronization Engine:**
  - Added header `[⟳ SYNC]` button with neon flash feedback and `S` keyboard shortcut.
  - Implemented `dsp.syncDownbeat()`: instantly resets internal step registers to 0 across all rhythmic sound sources while preserving independent user-dialed tempos.
  - Upgraded **Analog Drums (808)** (`percussion`): 16-step clock grid, selectable patterns (`auto`, `four_floor`, `backbeat`, `every_8th`, `syncopated`, `every_16th`), and instant `resetClock()` for kick/snare/hat multi-stem locking.
  - Upgraded **Acid 303 Voice** (`acid303`): 16-step squelch baseline sequencer with accents, variable VCA decay, and `resetClock()`.
  - Implemented `resetClock()` across **8-Step Gate Sequencer**, **Euclidean Rhythms**, **Turing Machine**, **Sample & Hold**, **ADSR Envelope**, **Maths Function Gen**, and **Bytebeat Glitch**.
  - Added factory preset `★ 808 & 303 Acid Techno Jam` demonstrating discrete Kick, Snare, Hi-Hat, and 303 bass stems locking on Beat 1 into the 4-channel master mixer.

## 0.3.0 — 2026-09-18
- **Multi-Row Eurorack Rails Engine:**
  - Added multi-tier Eurorack case architecture supporting arbitrary rows of rails.
  - Integrated `[+ Row]` header button, row removal controls, and active-row targeting.
  - Updated SVG patch cable physics to calculate deep bezier hanging loops when patching across rows ($dy > 100\text{px}$).
- **Massive Modular Ecosystem (Expanded to 42 Modules):**
  - **Euclidean Rhythm Generator** (`euclid`): Bjorklund algorithmic pulse generator for polyrhythms with audio impulse click.
  - **Turing Machine** (`turing`): Pseudo-random shift register generating quantized melodies in minor, pentatonic, dorian, and chromatic scales.
  - **Sample & Hold** (`sample_hold`): Analog S&H with internal pink/white noise source and variable slew glide.
  - **ADSR Envelope & VCA** (`adsr`): 4-stage envelope generator with looping LFO mode.
  - **Maths Function Generator** (`maths`): Dual slew and function generator with log/linear/exponential curve shaping.
  - **Harmonic Additive Synthesizer** (`harmonic`): 6-overtone additive sine oscillator with individual harmonic level faders.
  - **Bytebeat Glitch Oscillator** (`bytebeat`): Algorithmic C-style one-line mathematical bytebeat generator with selectable math formulas.
  - **Mechanical Spring Reverb Tank** (`spring`): Dual-spring dispersion tank with drive saturation, tension feedback, and high damping.
  - **Stereo Ping-Pong BBD Delay** (`pingpong`): Cross-feedback stereo delay bouncing between stereo channels with analog warmth.
  - **State Variable Filter** (`svf`): 12dB/oct Oberheim-style multi-mode SVF continuously morphing from Lowpass to Notch to Highpass.
  - **Leslie Rotary Cabinet** (`rotary`): Rotating horn and drum cabinet simulation with physical Doppler pitch shift and stereo motion.
  - **Portastudio Tape Warmer** (`tape_warmer`): 4-track cassette emulation with head saturation, wow/flutter, and tape hiss.
  - **Sub-Bass Booster** (`sub_harmonic`): Subharmonic frequency divider producing deep -1 and -2 octave low-end foundation.
  - **A/B Crossfader** (`crossfader`): Dual-channel crossfader with equal-power trigonometric morphing curve.
  - **Quad Morphing LFO** (`quad_lfo`): 4-phase quadrature low-frequency modulation oscillator with 90-degree phase offsets.
  - Plus Wavetable VCO, FM Quad Operator, Analog Drums 808, Acid 303 Voice, 7-Band EQ, Comb Resonator, VCA Glue Compressor, Germanium Fuzz, Shimmer Reverb, 8-Step Gate Sequencer, and Signal Mult.
- **Factory Presets:**
  - `★ The Colossus (3-Row Monster Rack)`: 3-row generative modular workstation showcasing cross-tier patching.
  - `Algorithmic Cyberpunk Glitch (2-Row)`: Dual-tier industrial glitch and breakbeat patch.
- **Module Library Drawer:**
  - Dynamic category chips with 13 categories (Source, Filter, Distortion, Lo-Fi, Time, Space, Modulation, Texture, Physical, Utility, Dynamics, Spatial, Percussion).
  - Dynamic count banner displaying all 42 modules.

## 0.2.0 — 2026-09-18
- Expanded modular catalog from 8 to **16 full-featured Eurorack modules**:
  - **Chord Swarm VCO** (`swarm`): 4-voice supersaw & chord cluster with spread detuning, sub-bass, and chord modes (Minor 7th, Major 7th, Fifth, Sus4, Unison).
  - **Granular Clouds** (`granular`): Real-time micro-sampling grain texture cloud generator with variable grain size, density, and pitch spray.
  - **Karplus Resonator** (`resonator`): Tuned string and metallic plate physical modeling resonator with feedback damping.
  - **Formant Filter** (`formant`): Dual-peak vocal tract filter continuously morphing across English vowel formants (A-E-I-O-U).
  - **Dimension Chorus** (`chorus`): Multi-voice bucket-brigade delay stereo chorus and flanger with quadrature LFOs.
  - **Optical Phaser** (`phaser`): 6-stage analog allpass phaser with sweeping feedback swoosh.
  - **Ring Modulator** (`ringmod`): Carrier frequency multiplication for alien, metallic, and robotic tones.
  - **Auto-Pan & Tremolo** (`autopan`): Stereo spatial motion and optical amplitude chopper.
- Added 4 new factory drone presets:
  - `★ Ethereal Swarm Choir` (Swarm VCO -> Formant Filter -> Dimension Chorus -> Space Reverb)
  - `★ Alien Transmission` (VCO -> Ring Modulator -> Optical Phaser -> Tape Delay)
  - `★ Granular Dreamscape` (Swarm VCO -> Granular Clouds -> Space Reverb -> Auto-Pan)
  - `★ Metallic Plate Resonator` (Noise -> Karplus Resonator -> Dimension Chorus -> Tape Delay)
- Restored and verified module lifecycle methods and clean audio graph teardown.

## 0.1.0 — 2026-09-18
- Initial release of OmoModular: minimalist Omarchy-themed Eurorack drone synthesizer.
- Audio DSP Engine: Web Audio API synthesis with 8 Eurorack modules (Dual Drone VCO, Noise, Ladder Filter, Wavefolder, Bitcrusher, Tape Delay, Space Reverb, 4-Ch Mixer).
- Interactive Patching: Dangling physics-based bezier cables with gravity and sag, auto-colored from Omarchy palette.
- Hotkeys: `Space` for master mute/run, `C` for cable ghost mode, `Tab`/`D` for module drawer, `R` for parameter randomization.
- Persistence & Presets: Autosave session state, factory presets, and user preset saving in `~/.config/omomodular/patches/`.
- Dynamic Omarchy Theme Sync: Live WebSocket theme reload when switching Omarchy desktop themes.
- Desktop Integration: Dedicated Chromium `--app` window launcher (`~/.local/bin/omomodular`) and `.desktop` entry.
