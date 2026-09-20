# Changelog

## 0.7.3 — 2026-09-20
- **Real-World Hardware Design Families (Procedural Faceplate Textures):**
  - Classified all 43 module faceplates into 7 historical/boutique Eurorack manufacturing aesthetics via a new `styleClass` property in `MODULE_DEFINITIONS` (`ui.js`): **Moog Heritage** (wrinkle black powder-coat, cream serif), **Make Noise / Mutable** (satin FR-4, ENIG gold traces, occult diamond silkscreen), **Roland Acid & Electro** (brushed charcoal, 808/303 bright accents), **Boutique DIY FR-4** (exposed copper trace grid, matte solder mask), **Euro Brushed Steel** (hairline anodized aluminum, Doepfer/Intellijel), **Vintage Tape & Studio** (warm hammertone beige), and **Digital Precision** (stealth chassis, backlit cyan badges).
  - All textures are 100% procedural CSS (gradients, box-shadows, `repeating-linear-gradient`/`conic-gradient` patterns) — zero images, zero network requests, minimal GPU cost.
- **Real Knob Archetypes:** Added 4 physical potentiometer body styles (`knob-davies` skirted pointer, `knob-moog` spun-aluminum fluted collet with conic-gradient reflection, `knob-sifam` soft-touch ribbed cap with theme-adaptive accent color, `knob-trimpot` compact precision encoder), assigned per hardware family and rendered via `def.knobType` in `renderModule()`.
- **Silkscreen Jack Signal Halos:** Jacks now carry a `data-signal` attribute (`in`, `out`, `cv`, `gate`) inferred from jack name/direction, each with a distinct outline treatment (solid ring for audio in, double-ring block for audio out, dashed ring for CV, squared badge for gate/clock/trig) matching real Eurorack faceplate conventions. Added a threaded `.jack-bezel` collar layer between the knurled nut and the contact bore.
- **Panel Screw Realism:** Nylon anti-rash washer halos and natural pseudo-random screwdriver-slot rotation angles (varying per module via `nth-child`) instead of uniformly aligned screws.
- Verified with the pytest suite (15 passed) and Playwright screenshots of the live rack: cable-to-jack coordinate math (`cables.js`, `getBoundingClientRect`-based) is unaffected since jack footprint dimensions were preserved.

## 0.7.2 — 2026-09-19
- **Push-Docking Drawer Layout (Zero Occlusion):**
  - Converted `#rack-container` from an under-drawer background surface into a dynamically push-docked workspace: opening the left MIDI drawer smoothly shifts the rack (`margin-left: 380px; width: calc(100% - 380px);`) and opening the right Module catalog shifts the rack (`margin-right: 370px; width: calc(100% - 370px);`).
  - Completely eliminates module and rack occlusion: all modules, controls, jacks, and the top Master Mixing Console remain 100% visible and un-obscured right alongside open drawers.
  - Responsive safety clamp: automatically scales margins down on narrower screens (< 1100px) so racks never get compressed out of usability.
  - Synchronous cable re-rendering: SVG patch cables automatically update their curves during and after drawer transition animations, keeping patch cords firmly attached to jacks during docking.
- **Drag-Active Ghosting & Penetrating Drop Targets:**
  - Added `body.dragging-active` states: when dragging any MIDI card or Module catalog card, open drawers smoothly fade to 55% opacity with `pointer-events: none` and stripped drop-shadows.
  - Prevents side drawers from accidentally swallowing mouse drag events or breaking HTML5 drop targets on underlying racks.
- **Universal Drop Target Zones:**
  - Expanded MIDI Player drop zones from the narrow 35px titlebar to the entire module panel (`.module-panel[data-type="midi_player"]`), accompanied by glowing cyan dashed outline and box-shadow feedback (`.midi-panel-drag-over`).
  - Row slot drop handling: dragging a MIDI card directly onto any empty rack row slot (`.rack-modules-slot`) automatically loads it into that row's MIDI player, or automatically spawns a new MIDI File Player in that row if one does not exist yet.
  - Catalog module cards (`.catalog-card`) are now draggable: drag any module type from the catalog drawer and drop it directly onto the desired rack row slot.
- **Keyboard & UX Shortcuts:**
  - Added `Escape` key handling to instantly close all open drawers and return full width to the rack workspace.

## 0.7.1 — 2026-09-19
- **Horizontal Viewport Lock & Side-to-Side Snap:**
  - Enforced strict horizontal containment (`overflow-x: hidden; width: 100%; max-width: 100%; box-sizing: border-box;`) across `#rack-container`, `#rack`, `.rack-row`, `.master-console-row`, and `#modular-rows`.
  - Removed fixed and `max-content` minimum widths that previously expanded beyond viewport width due to rail screw strips (48 screws per rail) or wide modules.
  - Made the 8 Master Mixing Console channel strips dynamically flexible (`flex: 1 1 70px; min-width: 58px; max-width: 105px;`), ensuring the console plate and all modular rows snap to fit 100% of any display resolution (including 1080p and 80-inch TV modes) with zero horizontal scrollbar.
- **Edge Autoscrolling for Multi-Row Vertical Cable Patching:**
  - Solved out-of-reach socket connections between distant rows (e.g. patching from Row 2 or Row 3 up to the top Master Console): dragging a cable end within 90px of the viewport edge or completely off-screen initiates smooth, continuous autoscrolling via `requestAnimationFrame`.
  - Dynamic scroll acceleration: scrolling velocity scales proportionally from 4px/frame up to 32px/frame based on how far off-screen the cable end is dragged.
  - Viewport-relative jack coordinate re-anchoring: `updateDragCoordsOnScroll` recalculates origin jack coordinates against the SVG viewbox on every scroll frame, keeping plugged jacks firmly seated while the dragged plug stays locked under the cursor as rails travel beneath it.
  - Added glowing visual guide overlays (`.rack-scroll-edge.top` and `.rack-scroll-edge.bottom`) that illuminate with directional chevrons when autoscroll is actively moving the rack.
- **Bidirectional Cable Dragging:**
  - Upgraded jack event listeners to allow dragging cables from OUT to IN or from IN to OUT, with one-click un-patching on already-connected inputs.

## 0.7.0 — 2026-09-19
- **Permanent Full-Length Top Master Mixing Console Rack:**
  - Upgraded the master mixer from a cramped 4-channel module inside arbitrary rows into a dedicated, full-length 8-channel master console rack permanently anchored along the top of the Eurorack workspace.
  - 8 stereo input channel strips (IN 1 through IN 8) featuring knurled hex jacks, live signal-present LEDs, per-channel [M] Mute and [S] Solo buttons, rotary Pan dials (L 100% to R 100%, center detent C), and Level gain controls (0.0 to 1.2).
  - Master Output Section: integrated live summed waveform CRT oscilloscope (1024 FFT buffer), rotary Master Volume dial, and active brickwall dynamics protection limiter LED.
  - Identity & Utility Plate: Model 800-M branding, dynamic patched channels counter badge (e.g. '3 / 8 PATCHED'), and [FLAT MIX] button to instantly reset all channels to unity level (0.85) and center pan.
  - Zero-clutter modular rows: frees up all modular rail rows below (ROW 1, ROW 2, etc.) exclusively for sound generators and audio processors.
  - Backward-compatible patch state & droop physics: existing presets and saved patches targeting mixer_1 (in1 through in4) cleanly connect to the top console rack with realistic drooping cables, while channels 5 through 8 remain open for new sound sources.

## 0.6.4 — 2026-09-19
- **Global Master BPM Engine & Instant Tempo Snapping:**
  - Added Master BPM input (30 to 260 BPM) and interactive Snap Ratio selector (1x FULL, 1/2 HALF, 1/4 QUARTER, 1/8 8th, 1/16 16th, 2x DOUBLE, MATCH MIDI) to top rack header bar.
  - Added [SNAP BPM] button and 'B' keyboard shortcut to snap all sound generators (Analog Drums 808, Acid 303 Voice, Sequencer, MIDI File Player) in mathematical lockstep with downbeat synchronization.
  - Added 'Shift+S' shortcut to snap all module tempos and immediately realign downbeats.
- **Per-Module Tempo Snap Controls:**
  - Added individual lightning [SNAP] buttons to headers of tempo-governed modules (percussion, acid303, sequencer, midi_player) for snapping individual sources to the master tempo independently.
  - Physical knob rotation and animated feedback: snapping dynamically updates internal parameters, rotates the .knob-dial CSS transform (-140deg to +140deg), updates value text badges, and triggers a glowing .knob-snapped animation pulse.
- **MIDI File Player Tempo Integration:**
  - Added 'BPM SNAP RATIO' control to MIDI Player faceplate (FREE, 1x FULL, 1/2 HALF, 1/4 QUARTER, 1/8 8th, 1/16 16th, 2x DOUBLE) that locks the SPEED rate dial to (masterBpm / midiBpm) * ratio.
  - Added [USE {bpm} BPM] one-click button on the MIDI file header badge to promote detected MIDI tempo to Master Rack BPM and snap all modules to match the song.

## 0.6.3 — 2026-09-19
- **Seamless MIDI Looping & Silence Trimming:**
  - Fixed lookahead scheduler wrap gap: previously, when `currentTime` wrapped past `totalDuration`, downbeat notes starting near `0.000s` fell behind the window start and were skipped or delayed, creating a jarring pause on every repetition.
  - Implemented boundary-spanning lookahead slices: when the lookahead window crosses `totalDuration`, notes at the head of cycle `N + 1` are pre-scheduled ahead of time directly onto the Web Audio hardware clock queue with zero latency.
  - Added automatic leading silence normalization in `midi_parser.js`: detects `minStartTick` across all tracks and offsets all events so the first note begins immediately at `0.000s`.
  - Added smart musical bar & beat loop quantizer: snaps loop duration to the nearest integer measure or beat if notes release slightly before the barline, eliminating truncated bars and trailing dead space.
  - Added interactive `[SNAP: AUTO]` dropdown to the MIDI Player transport row (`AUTO`, `1 BAR`, `2 BARS`, `4 BARS`, `8 BARS`, `12 BARS`, `16 BARS`, `EXACT RAW`) to lock any loop to exact modular bar lengths.
  - Dynamic duration re-calculation: isolating or muting tracks automatically recalculates the loop duration based on the active stems.

## 0.6.2 — 2026-09-19
- **MIDI Voice Gain Staging & Volume Boost:**
  - Fixed severe internal attenuation where `noteGain` was scaled to `velNormalized * 0.22`, yielding ~0.07 peak amplitude (-23 dB down compared to VCO, 303, and drum modules).
  - Implemented dynamic gain staging with baseline velocity sensitivity: `(0.35 + 0.65 * velNormalized) * 0.75 * gainBoost * trackVol`.
  - Added analog-style soft-knee saturation curve (`WaveShaperNode` with `tanh(x * 1.3)` transfer function) before output gain, allowing punchy modular levels (~0.85-1.1 peak) without harsh digital clipping during polyphonic chords.
  - Added dedicated `BOOST` knob (0.5x to 4.0x, default 1.8x) and expanded `LEVEL` knob range (0 to 2.0x, default 1.0) on the module faceplate.
  - Added per-track volume sliders (`0%` to `250%`) to every track row in the live layer inspector with isolated mousedown handlers.
  - Updated factory presets (`Daft Modular Funk`) with matching gain staging.

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
