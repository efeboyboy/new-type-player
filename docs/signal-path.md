# Signal Path Documentation

## Module Overview (Based on Buchla 200 Series)

### Control Sources

- Spatial Director 227 (or 204) - Quad spatial processing with CV-controlled reverb
- Envelope Generator 284 (Dual) - Rise-fall function generator with looping capability
- Gate 292 - Gate and trigger processing
- Filter 291 & 295 - Dual bandpass filtering system
- AFG (Arbitrary Function Generator) 248-160Z - Multi-function sequencer/controller
- Sequencer 246 - 16-step sequencer with dual playheads

### Sound Sources

- Complex Oscillators 258 (3x) with CV-controlled wave shaping
- White Noise Generator 265 for uncertainty and texture
- Matrix Mixer 205 (4x4) for flexible routing

## Project Refactor Proposal

The current long, linear sound engine presents challenges in both troubleshooting and modularity. This refactor proposes to redesign the architecture so that every component has its own defined inputs and outputs, allowing flexible routing between any module. This setup would function like a true modular synth—on the web—offering greater flexibility and control for both development and sound design.

## Updated Module Architecture with Defined Inputs and Outputs

### Oscillators (OSC 1, 2, and 3)

Each oscillator receives pitch control from the step sequencer and routes its output to the Matrix Mixer.

**Inputs:**

- V/OCT (from Step Sequencer)

**Outputs:**

- Matrix Mixer Input 1 (OSC 1)
- Matrix Mixer Input 2 (OSC 2)
- Matrix Mixer Input 3 (OSC 3)

**Controls:**

- Tune Knob (for pitch adjustment)
- Wave Shape Knob (to morph between waveforms)

### Noise Generator

A noise source without external input, routed directly to the Matrix Mixer.

**Inputs:**

- None

**Outputs:**

- Matrix Mixer Input 4

**Controls:**

- Noise Level Knob
- Noise Type Knob (to select noise color or type)

### Matrix Mixer

The central hub for mixing and routing sound generators.

**Inputs:**

- From OSC 1, 2, 3, and Noise Generator

**Outputs:**

- Out 1: Band Pass Filter A
- Out 2: Band Pass Filter B
- Out 3: LPG 3 Input
- Out 4: LPG 4 Input

**Controls:**

- VCA Knobs (one for each input, controlling signal levels)

### Band Pass Filters

Two band pass filters process outputs from the Matrix Mixer.

**Inputs:**

- Filter A: Matrix Mixer Out 1
- Filter B: Matrix Mixer Out 2

**Outputs:**

- Filter A: To LPG 1 Input
- Filter B: To LPG 2 Input

**Controls:**

- Cutoff frequency
- Modulation depth

### Low Pass Gates (LPG 1–4)

Each LPG receives input from either the filters or matrix outputs and applies envelope modulation before sending the signal to the master mixer.

**Each LPG has:**

**Inputs:**

- Signal In (from Matrix Mixer or Band Pass Filters)
- MOD (Envelope from corresponding EG)

**Outputs:**

- Master Mixer Input

**Controls:**

- Mod Attenuverter Knob (controls envelope modulation depth)
- VCA Knob (controls signal level before going to the master mixer)

**LPG Routing:**

_LPG 1:_

- In: Band Pass Filter A Output
- MOD: Envelope from EG 1

_LPG 2:_

- In: Band Pass Filter B Output
- MOD: Envelope from EG 2

_LPG 3:_

- In: Matrix Mixer Output 3
- MOD: Envelope from EG 3

_LPG 4:_

- In: Matrix Mixer Output 4
- MOD: Envelope from EG 4

### Envelope Generators (EG 1–4)

Each envelope modulates its corresponding LPG and has specific triggering mechanisms.

**Inputs:**

- GATE: Trigger source (Clock or manual button)

**Outputs:**

- ENV: Envelope output to LPG's MOD input
- EOC: End of Cycle trigger for chaining or self-looping

**Envelope Routing:**

_EG 1:_

- GATE: Triggered by Clock ×4
- ENV: Routed to LPG 1 MOD

_EG 2:_

- GATE: Triggered by Clock ×4
- ENV: Routed to LPG 2 MOD

_EG 3:_

- BUTTON: Manual trigger
- GATE: EOC self-trigger for looping
- ENV: Routed to LPG 3 MOD

_EG 4:_

- BUTTON: Manual trigger
- GATE: EOC self-trigger for looping
- ENV: Routed to LPG 4 MOD

## Signal Flow Architecture (Original Design)

### Control Signal Path

1. Spatial Director 227:

   - 4 inputs, 4 outputs with CV-controlled positioning
   - Built-in reverb processing
   - Quadraphonic or stereo output options

2. Envelope & Gate Processing:

   - Envelope Generator 284 → Gate 292 → Filters (291/295)
   - Rise-fall envelopes with looping capability
   - Gate processing for envelope triggering
   - Duration control for all envelope stages

3. Sequencing and Control:
   - AFG 248 controls oscillator pitch and waveshaping
   - Sequencer 246 provides 16-step sequences
   - Dual independent playheads for complex patterns
   - External CV input options for sequence modulation

### Audio Signal Path

1. Sound Sources:

   - 3x Oscillator 258 with wave shaping
   - Each oscillator features a Shape control that morphs between two waveform types
   - Wave folder processing per oscillator
   - White Noise 265 for additional texture
   - Frequency shifting available between oscillators

2. Matrix Mixer 205:

   - 4 Inputs (3x OSC, 1x Noise)
   - 4 Outputs with individual routing
   - Flexible cross-patching between any source and destination
   - Independent level control per crosspoint

3. Filtering and Processing:
   - Filter 291: Dual bandpass filtering for outputs A & B
   - Filter 295: Additional filtering for outputs C & D
   - CV control of filter parameters from envelopes
   - Independent resonance control per filter

## NYSTHI Module Specifications

### Dual Low Pass Gate (Based on Buchla 208)

- Implementation based on Aalto research paper on LPG
- Each LPG features:
  - VCA/LP Mode Selection (VCA only, VCA+LP, LP only)
  - Resonance control (when in LP mode)
  - Signal Input
  - Signal Output
  - CV Input with Level Control (Left slider)
  - Base Level Control (Right slider)
- Vactrol response models with slight variations per instance

### Dual Envelope Generator (Based on Buchla 208)

- Two identical envelope sections
- Per envelope:
  - Gate/Trigger Input (+ manual trigger)
  - End of Cycle Output (1ms pulse)
  - Sustained/Transient Mode Selection
  - Envelope Output (0V to 10V)
  - Controls:
    - Attack (2ms to 10s, CV controllable)
    - Duration (2ms to 10s, active in transient mode)
    - Decay (2ms to 10s, CV controllable)

## Current Implementation Status

### Sound Sources

### Oscillators

1. OSC1 → Wave Folder → Bandpass Filter → Matrix Input 1
   - Shape control: Morphs between Sine and Saw waveforms
2. OSC2 → Wave Folder → Bandpass Filter → Matrix Input 2
   - Shape control: Morphs between Sine and Saw waveforms
3. OSC3 → Wave Folder → 3-Band EQ → Matrix Input 3
   - Shape control: Morphs between Sine and Square waveforms
   - 3-Band EQ with Low, Mid, High controls

### Bleak Oscillator

Bleak is a virtual analog oscillator with zero aliasing that provides simple but effective waveform control. It features classic analog waveforms with continuous morphing capabilities.

#### Controls and Inputs:

- **Detune**: Adjusts the pitch of the oscillator (± 100 cents)
- **Wave**: Morphs continuously between waveforms:
  - Saw: Full left
  - Pulse: Center
  - Triangle: Full right
- **V/OCT**: Main input that defines the pitch (1V per octave convention). Zero volts corresponds to a C3 note
- **Out**: Main oscillator output

### Noise

- Noise Generator → Matrix Input 4

## Matrix Mixer (4x4)

- 4 Inputs (OSC1, OSC2, OSC3, Noise)
- 4 Outputs with individual routing to Low Pass Gates

## Matrix Output Routing

### Output A (Matrix Out 1)

- Matrix Out 1 → Bandpass Filter A → LPG 1 Input → Master
- Bandpass Filter A cutoff modulated by Envelope C

### Output B (Matrix Out 2)

- Matrix Out 2 → Bandpass Filter B → LPG 2 Input → Master
- Bandpass Filter B cutoff modulated by Envelope D

### Output C (Matrix Out 3)

- Matrix Out 3 → LPG 3 Input → Master

### Output D (Matrix Out 4)

- Matrix Out 4 → LPG 4 Input → Master

## Clock and Trigger System

- Main Clock: Generates BPM-synced triggers (4 ticks per step)
- Clock distribution:
  - Each clock tick triggers Envelopes A & B (same timing as sequencer steps)
  - No direct clock connection to Envelopes C & D

### Trigger and Cycling Behavior

- Envelopes A & B: Triggered by every clock tick from the Clock module
- Envelopes C & D:
  - Self-looping through EOC feedback loop (continuous cycling)
  - Can be manually triggered using their dedicated buttons
  - Once triggered, EOC output connects back to trigger input for infinite cycling

## Envelope Generators

### Envelope A & B (Clock-driven)

- Gate Input: Clock ticks (4 ticks per step)
- Output: LPG 1 & 2 MOD input
- Controls: Attack, Duration, Decay
- Triggered on every clock tick (synchronized with sequencer)
- Default Mode: Transient (sustain OFF)
- Fixed behavior: Always in transient mode for clock sync

Default Values (Envelope A):

- Attack: 0.002s
- Duration: 0.02s
- Decay: 0.2s

Default Values (Envelope B):

- Attack: 0.002s
- Duration: 0.02s
- Decay: 1s

### Envelope C & D (Self-cycling)

- Gate Input: Manual trigger button only
- Self-cycling behavior:
  - EOC output connected back to trigger input
  - Once triggered, cycles indefinitely without need for external triggers
  - Can only be stopped by module reset or power cycle
- Outputs:
  - LPG 3 & 4 MOD input
  - Bandpass Filter A & B cutoff mod
- Controls: Attack, Duration, Decay
- Default Mode: Sustained (sustain ON)
- Fixed behavior: Always in sustained mode

Default Values (Envelope C):

- Attack: 1s
- Duration: 0.02s
- Decay: 3s

Default Values (Envelope D):

- Attack: 0.02s
- Duration: 1s
- Decay: 3s

## Low Pass Gates (LPGs)

Each LPG has:

- Level control (manual) - Functions as gain knob for fine-tuning
- MOD input (from corresponding envelope) - Receives envelope modulation to shape amplitude
- EOC output (if needs to be plugged)
- Audio input (from matrix or if goes through bypass filter)
- Audio output (to master)
- VACTROL FAST response by default
- Mode selection (VCF, VCA, or VCF+VCA)

Default Configurations:

- LPG 1: VCF mode by default
- LPG 2: VCF mode by default
- LPG 3: VCF+VCA mode by default
- LPG 4: VCF+VCA mode by default

Each LPG receives modulation from its corresponding envelope:

- LPG 1 ← Envelope A
- LPG 2 ← Envelope B
- LPG 3 ← Envelope C
- LPG 4 ← Envelope D

## Master Section

- Master Volume → Audio Output

## Control Signal Flow

1. Clock ticks (4 per step) → Envelopes A & B
2. Manual triggers + EOC feedback → Envelopes C & D
3. Envelopes → LPG MOD inputs and Filter cutoff
4. Audio through LPGs → Master Output

## Parameter Ranges

### Envelope Parameters

- Attack: 2ms to 10s
- Duration: 2ms to 10s (active in transient mode)
- Decay: 2ms to 10s

### LPG Parameters

- Level: 0-100%
- MOD Amount: 0-100%

### Filter Parameters

- Cutoff Base: 20Hz-20kHz
- Resonance: 0.1-10
- MOD Amount: 0-100%
