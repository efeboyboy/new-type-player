import * as Tone from "tone";

// Utility function for sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class AFG248Step {
  constructor() {
    this.cv = new Tone.Signal(0);
    this.trigger = new Tone.Signal(0);
    this.externalMode = false;
    this.externalInputIndex = 0;
    this.stepDuration = 0.25; // Default to quarter note
  }
}

class AFG248PlayHead {
  constructor() {
    this.currentStep = 0;
    this.cvOut = new Tone.Signal(0);
    this.triggerOut = new Tone.Signal(0);
    this.timeMultiplier = 1;
    this.running = false;
  }
}

class AudioEngine {
  constructor() {
    this.initialized = false;

    // Create nodes without connecting them
    this.masterVolume = new Tone.Volume(0);

    // Create quad outputs
    this.quadOutputs = {
      frontLeft: new Tone.Gain(),
      frontRight: new Tone.Gain(),
      rearLeft: new Tone.Gain(),
      rearRight: new Tone.Gain(),
    };

    // Create oscillators and basic components
    this.osc1 = new Tone.Oscillator({
      type: "sine",
      frequency: 110, // A2 - bass oscillator
      volume: -12, // Lower volume for better mixing
    });

    this.osc2 = new Tone.Oscillator({
      type: "triangle",
      frequency: 220, // A3 - mid oscillator
      volume: -12,
    });

    this.osc3 = new Tone.Oscillator({
      type: "sine",
      frequency: 440, // A4 - high oscillator
      volume: -12,
    });

    this.noise = new Tone.Noise({
      type: "pink", // Pink noise is more musical
      volume: -24, // Lower noise volume
    });

    // Create filters with musical default frequencies
    this.bandpassFilters = Array(3)
      .fill()
      .map(
        (_, i) =>
          new Tone.Filter({
            type: "bandpass",
            frequency: [800, 1200, 2000][i], // Different frequencies for each oscillator
            Q: 2, // Sharper resonance
          })
      );

    // Create wave folders with moderate folding
    this.waveFolders = Array(3)
      .fill()
      .map(
        () =>
          new Tone.WaveShaper((x) => {
            const fold = 2.5; // Slightly more harmonics
            return Math.sin(x * Math.PI * fold);
          })
      );

    // Create LPGs (but don't connect yet)
    this.lpgs = Array(4)
      .fill()
      .map(() => ({
        vactrol: null,
        vca: null,
        filter: null,
        envelope: null,
        lfo: null,
      }));

    // Create matrix mixer components
    this.matrixMixer = {
      inputs: Array(4)
        .fill()
        .map(() => new Tone.Gain(1)),
      outputs: Array(4)
        .fill()
        .map(() => new Tone.Gain(1)),
      matrix: Array(4)
        .fill()
        .map(() =>
          Array(4)
            .fill()
            .map(() => new Tone.Gain(0))
        ),
    };

    // Create spatial directors with better default spread
    this.spatialDirectors = Array(4)
      .fill()
      .map((_, i) => ({
        panner: new Tone.Panner([-0.6, 0.6, -0.3, 0.3][i]), // Wide stereo spread
        reverb: new Tone.Reverb({
          decay: 1.5, // Moderate reverb decay
          wet: 0.15, // Subtle reverb mix
          preDelay: 0.01,
        }),
        frontGain: new Tone.Gain(0.8),
        rearGain: new Tone.Gain(0.2),
        outputs: {
          fl: new Tone.Gain(),
          fr: new Tone.Gain(),
          rl: new Tone.Gain(),
          rr: new Tone.Gain(),
        },
      }));

    // Create other components with better defaults
    this.noiseFilter = new Tone.Filter({
      type: "bandpass",
      frequency: 2000,
      Q: 3,
    });

    this.noiseVCA = new Tone.Gain(0.3); // Lower noise gain
    this.toneShaper = new Tone.EQ3({
      low: 2, // Slight bass boost
      mid: 0,
      high: -3, // Tame highs
      lowFrequency: 200,
      highFrequency: 2000,
    });
    this.freqShifter = new Tone.FrequencyShifter({
      frequency: 0,
      wet: 0.5,
    });

    // Initialize clock system with missing buses added
    this.clockSystem = {
      master: {
        frequency: {
          get value() {
            return Tone.Transport.bpm.value / 60;
          },
          set value(f) {
            Tone.Transport.bpm.value = f * 60;
          },
        },
        start: () => Tone.Transport.start(),
        stop: () => Tone.Transport.stop(),
        set callback(fn) {
          if (this._repeatEventId) {
            Tone.Transport.clear(this._repeatEventId);
          }
          this._repeatEventId = Tone.Transport.scheduleRepeat(fn, "4n");
        },
      },
      counters: {
        "16n": 0,
        "8n": 0,
        "4n": 0,
        "2n": 0,
        "1n": 0,
      },
      divisions: {
        "16n": new Tone.Signal(0),
        "8n": new Tone.Signal(0),
        "4n": new Tone.Signal(0),
        "2n": new Tone.Signal(0),
        "1n": new Tone.Signal(0),
      },
      buses: Array(4)
        .fill()
        .map(() => new Tone.Signal(0)),
    };

    this.initializeClockSystem();

    // Initialize AFG system properties
    this.afg = {
      playheads: [new AFG248PlayHead(), new AFG248PlayHead()],
      steps: Array(16)
        .fill(null)
        .map(() => new AFG248Step()),
      clockInputs: [new Tone.Signal(0), new Tone.Signal(0)],
      strobeInput: new Tone.Signal(0),
      addressCV: new Tone.Signal(0),
      externalInputs: Array(4)
        .fill(null)
        .map(() => new Tone.Signal(0)),
      externalCV: Array(4)
        .fill(null)
        .map(() => new Tone.Signal(0)),
    };

    this.initializeAFG();

    // Create envelope generators
    this.envelopes = Array(4)
      .fill()
      .map(() => {
        const env = new Tone.Envelope({
          attack: 0.01,
          decay: 0.2,
          sustain: 0.5,
          release: 0.5,
          attackCurve: "exponential",
          releaseCurve: "exponential",
        });

        return {
          envelope: env,
          offset: new Tone.Add(0.2),
          multiply: new Tone.Multiply(1),
          isLooping: false,
          timeScale: 1,
        };
      });

    // Initialize other properties
    this.activeSequences = [];
    this.clockRoutings = {};
  }

  initializeClockSystem() {
    // Set initial tempo (2Hz = 120 BPM)
    this.clockSystem.master.frequency.value = 2;

    // Create our own pattern generator for quantization
    this.sequenceQuantizer = {
      values: [0, 2, 4, 5, 7, 9, 11], // Major scale
      currentIndex: 0,
      mode: "up",
      next() {
        let value = this.values[this.currentIndex];

        switch (this.mode) {
          case "up":
            this.currentIndex = (this.currentIndex + 1) % this.values.length;
            break;
          case "down":
            this.currentIndex =
              (this.currentIndex - 1 + this.values.length) % this.values.length;
            break;
          case "upDown":
            if (this.currentIndex >= this.values.length - 1) {
              this.mode = "down";
            } else if (this.currentIndex <= 0) {
              this.mode = "up";
            }
            this.currentIndex += this.mode === "up" ? 1 : -1;
            break;
          case "random":
            this.currentIndex = Math.floor(Math.random() * this.values.length);
            break;
        }

        return value / 12; // Normalize to 0-1 range
      },
      setScale(scale) {
        this.values = scale;
      },
      setMode(newMode) {
        if (["up", "down", "upDown", "random"].includes(newMode)) {
          this.mode = newMode;
        }
      },
    };

    // Create the clock tick callback with enhanced timing
    this.clockTick = (time) => {
      // Update counters with improved timing precision
      this.clockSystem.counters["16n"] =
        (this.clockSystem.counters["16n"] + 1) % 4;

      if (this.clockSystem.counters["16n"] === 0) {
        this.clockSystem.counters["8n"] =
          (this.clockSystem.counters["8n"] + 1) % 2;
        if (this.clockSystem.counters["8n"] === 0) {
          this.clockSystem.counters["4n"] =
            (this.clockSystem.counters["4n"] + 1) % 2;
          if (this.clockSystem.counters["4n"] === 0) {
            this.clockSystem.counters["2n"] =
              (this.clockSystem.counters["2n"] + 1) % 2;
            if (this.clockSystem.counters["2n"] === 0) {
              this.clockSystem.counters["1n"] =
                (this.clockSystem.counters["1n"] + 1) % 2;
            }
          }
        }
      }

      // Update clock divisions with precise timing
      Object.entries(this.clockSystem.divisions).forEach(
        ([division, signal]) => {
          signal.setValueAtTime(this.clockSystem.counters[division], time);
        }
      );

      // Process AFG playheads
      this.afg.playheads.forEach((playhead, index) => {
        if (playhead.active) {
          const clockDiv = this.handleClockDivision(playhead.clockDiv);
          const shouldTrigger =
            time > playhead.lastTrig + (60 / this.tempo) * clockDiv;

          if (shouldTrigger) {
            playhead.lastTrig = time;
            playhead.position = (playhead.position + 1) % 16;

            // Get step values with quantization and morphing
            const step = this.afg.steps[playhead.position];
            let cv = step.externalMode
              ? this.afg.externalCV[step.externalInputIndex].value
              : step.cv1.value;

            // Apply quantization
            cv = this.sequenceQuantizer.next();

            // Apply morphing
            cv = this.sequenceMorph.interpolator.curve(cv);

            // Trigger envelopes and update oscillators
            this.triggerEnvelope(index, time);
            this.setOscillatorParams(index + 1, {
              frequency: Tone.Frequency(48 + cv * 24, "midi").toFrequency(),
              waveShape: step.cv2.value,
            });
          }
        }
      });

      // Distribute clock pulses with uncertainty
      this.distributeClockPulse(time);
    };

    // Set the callback
    this.clockSystem.master.callback = this.clockTick;
  }

  distributeClockPulse(time) {
    // Add safety check to ensure buses is defined
    if (!this.clockSystem || !this.clockSystem.buses) return;

    // Distribute clock to buses based on current routing
    this.clockSystem.buses.forEach((bus, i) => {
      if (this.clockRoutings && this.clockRoutings[i]) {
        const division = this.clockRoutings[i];
        const counter = this.clockSystem.counters[division];
        bus.setValueAtTime(counter, time);
      }
    });

    // Trigger AFG on quarter notes
    if (this.clockSystem.counters["4n"] === 0) {
      this.afg.clockInputs.forEach((clock, i) => {
        if (this.afg.playheads[i].running) {
          clock.setValueAtTime(1, time);
          clock.setValueAtTime(0, time + 0.01);
        }
      });
    }
  }

  // Clock control methods
  setClockDivision(busIndex, division) {
    if (busIndex >= 0 && busIndex < 4 && this.clockSystem.divisions[division]) {
      this.clockRoutings = this.clockRoutings || {};
      this.clockRoutings[busIndex] = division;
    }
  }

  startClock() {
    this.clockSystem.master.start();
    if (Tone.Transport.state !== "started") {
      Tone.Transport.start();
    }
  }

  stopClock() {
    this.clockSystem.master.stop();
    if (Tone.Transport.state === "started") {
      Tone.Transport.stop();
    }
  }

  setClockTempo(bpm) {
    // Convert BPM to Hz (sixteenth notes)
    const hz = (bpm / 60) * 4;
    this.clockSystem.master.frequency.value = hz;
    Tone.Transport.bpm.value = bpm;
  }

  // Add a test method for the clock system
  async testClock() {
    await this.initialize();

    console.log("Testing clock system...");

    // Set up a basic clock routing
    this.setClockDivision(0, "4n"); // Quarter notes on bus 1
    this.setClockDivision(1, "8n"); // Eighth notes on bus 2
    this.setClockDivision(2, "16n"); // Sixteenth notes on bus 3

    // Start AFG playheads
    this.startAFG(0);
    this.startAFG(1);

    // Set up some basic CV values
    for (let i = 0; i < 16; i++) {
      this.setAFGStep(i, {
        cv: Math.random(),
        trigger: Math.random() > 0.5 ? 1 : 0,
      });
    }

    // Start the clock
    this.setClockTempo(120);
    this.startClock();

    // Let it run for 4 seconds
    await new Promise((resolve) => setTimeout(resolve, 4000));

    // Stop everything
    this.stopClock();
    this.stopAFG(0);
    this.stopAFG(1);

    console.log("Clock test complete");
  }

  initializeAFG() {
    // Set up clock processing for each playhead
    this.afg.playheads.forEach((playhead, i) => {
      const clock = this.afg.clockInputs[i];

      // Create clock detection
      const clockTrigger = new Tone.GreaterThan(0.5);
      const prevClock = new Tone.Signal(0);

      // Connect clock to trigger detector
      clock.connect(clockTrigger);

      // Create clock edge detection
      const onChange = new Tone.Signal(0);
      clockTrigger.connect(onChange);

      // Monitor clock changes
      onChange.setValueAtTime = (value, time) => {
        // Only trigger on rising edge (0 to 1)
        if (value === 1 && prevClock.value === 0) {
          if (playhead.running) {
            this.advancePlayhead(i, time);
          }
        }
        prevClock.value = value;
      };
    });

    // Set up strobe processing for CV addressing
    const strobeTrigger = new Tone.GreaterThan(0.5);
    const prevStrobe = new Tone.Signal(0);

    // Connect strobe to trigger detector
    this.afg.strobeInput.connect(strobeTrigger);

    // Create strobe edge detection
    const onStrobe = new Tone.Signal(0);
    strobeTrigger.connect(onStrobe);

    // Monitor strobe changes
    onStrobe.setValueAtTime = (value, time) => {
      // Only trigger on rising edge
      if (value === 1 && prevStrobe.value === 0) {
        const address = Math.floor(this.afg.addressCV.value * 16);
        this.jumpToStep(address, time);
      }
      prevStrobe.value = value;
    };
  }

  // Start AFG playhead
  startAFG(headIndex) {
    if (headIndex >= 0 && headIndex < 2) {
      this.afg.playheads[headIndex].running = true;
    }
  }

  // Stop AFG playhead
  stopAFG(headIndex) {
    if (headIndex >= 0 && headIndex < 2) {
      this.afg.playheads[headIndex].running = false;
    }
  }

  // Set step values
  setAFGStep(stepIndex, values) {
    if (stepIndex >= 0 && stepIndex < 16) {
      const step = this.afg.steps[stepIndex];
      if (values.cv !== undefined) step.cv1.value = values.cv;
      if (values.trigger !== undefined) step.trig1.value = values.trigger;
      if (values.duration !== undefined) step.duration = values.duration;
      if (values.externalMode !== undefined)
        step.externalMode = values.externalMode;
      if (values.externalInput !== undefined)
        step.externalInputIndex = values.externalInput;
    }
  }

  // Set external input value
  setAFGExternalInput(inputIndex, value) {
    if (inputIndex >= 0 && inputIndex < 4) {
      this.afg.externalInputs[inputIndex].value = value;
    }
  }

  // Set playhead time multiplier
  setAFGTimeMultiplier(headIndex, multiplier) {
    if (headIndex >= 0 && headIndex < 2) {
      this.afg.playheads[headIndex].timeMultiplier = multiplier;
    }
  }

  // Internal method to advance playhead
  advancePlayhead(headIndex, time) {
    const playhead = this.afg.playheads[headIndex];
    const step = this.afg.steps[playhead.currentStep];

    // Get CV value (either from step or external input)
    const cvValue = step.externalMode
      ? this.afg.externalInputs[step.externalInputIndex].value
      : step.cv1.value;

    // Update outputs
    playhead.cvOut.setValueAtTime(cvValue, time);
    playhead.triggerOut.setValueAtTime(step.trigger.value, time);

    // Schedule next step
    const nextTime = time + step.stepDuration * playhead.timeMultiplier;
    Tone.Transport.scheduleOnce(() => {
      playhead.currentStep = (playhead.currentStep + 1) % 16;
    }, nextTime);
  }

  // Jump to specific step
  jumpToStep(stepIndex, time) {
    if (stepIndex >= 0 && stepIndex < 16) {
      this.afg.playheads.forEach((playhead) => {
        playhead.currentStep = stepIndex;
        this.advancePlayhead(playhead, time);
      });
    }
  }

  // Set wave folding amount (0-1)
  setWaveFold(oscNumber, amount) {
    if (oscNumber >= 1 && oscNumber <= 3) {
      const fold = 1 + amount * 4; // Map 0-1 to 1-5 folds
      this.waveFolders[oscNumber - 1].setMap((x) => {
        return Math.sin(x * Math.PI * fold);
      });
    }
  }

  // Set bandpass filter parameters
  setFilter(oscNumber, frequency, Q) {
    if (oscNumber >= 1 && oscNumber <= 3) {
      const filter = this.bandpassFilters[oscNumber - 1];
      filter.frequency.value = frequency;
      filter.Q.value = Q;
    }
  }

  // Set tone shaper parameters (in dB)
  setToneShape(low, mid, high) {
    this.toneShaper.low.value = low;
    this.toneShaper.mid.value = mid;
    this.toneShaper.high.value = high;
  }

  // Get a random CV value (-1 to 1)
  getRandomCV() {
    return this.randomSampleHold.value * 2 - 1;
  }

  // Enhanced envelope methods
  setEnvelope(channel, params) {
    if (channel >= 0 && channel < 4) {
      const envSystem = this.envelopes[channel];
      const env = envSystem.envelope;

      if (params.attack !== undefined)
        env.attack = params.attack * envSystem.timeScale;
      if (params.decay !== undefined)
        env.decay = params.decay * envSystem.timeScale;
      if (params.sustain !== undefined) env.sustain = params.sustain;
      if (params.release !== undefined)
        env.release = params.release * envSystem.timeScale;
      if (params.offset !== undefined) envSystem.offset.value = params.offset;
      if (params.scale !== undefined) envSystem.multiply.value = params.scale;
      if (params.timeScale !== undefined)
        envSystem.timeScale = params.timeScale;
    }
  }

  // Enable envelope looping (LFO mode) with timing control
  setEnvelopeLFO(channel, enabled, rate = 1) {
    if (channel >= 0 && channel < 4) {
      const envSystem = this.envelopes[channel];
      envSystem.isLooping = enabled;

      if (enabled) {
        const totalTime =
          (envSystem.envelope.attack + envSystem.envelope.decay) *
          envSystem.timeScale;
        const loopTime = totalTime / rate;

        // Schedule the loop
        Tone.Transport.scheduleRepeat((time) => {
          if (envSystem.isLooping) {
            this.triggerEnvelope(channel, time);
          }
        }, loopTime);
      }
    }
  }

  // Enhanced trigger with proper timing
  triggerEnvelope(channel, time = "+0.05", params = {}) {
    if (channel >= 0 && channel < 4) {
      const envSystem = this.envelopes[channel];
      const lpg = this.lpgs[channel];

      // Use provided duration or calculate from envelope settings
      const duration =
        params.duration ||
        (envSystem.envelope.attack + envSystem.envelope.decay) *
          envSystem.timeScale;

      // Convert velocity (0-1) to appropriate envelope scaling
      if (params.velocity !== undefined) {
        const velocityScale = Math.max(0.1, params.velocity);
        envSystem.multiply.value = velocityScale;
      }

      // Trigger envelope with timing consideration
      envSystem.envelope.triggerAttackRelease(duration, time);

      // If in LFO mode, ensure LFO is running
      if (envSystem.isLooping && lpg.lfo.state !== "started") {
        lpg.lfo.start(time);
      } else if (!envSystem.isLooping && lpg.lfo.state === "started") {
        lpg.lfo.stop(time);
      }
    }
  }

  // Set a mixer crosspoint level (0-1)
  setMixerPoint(inputIdx, outputIdx, level) {
    if (inputIdx >= 0 && inputIdx < 4 && outputIdx >= 0 && outputIdx < 4) {
      this.matrixMixer.matrix[inputIdx][outputIdx].gain.value = Math.max(
        0,
        Math.min(1, level)
      );
    }
  }

  // Set frequency shift amount
  setFrequencyShift(shiftAmount) {
    this.freqShifter.frequency.value = shiftAmount;
  }

  // Method to set oscillator waveform (sine, square, sawtooth)
  setWaveform(oscNumber, waveform) {
    const osc = this[`osc${oscNumber}`];
    if (osc) {
      osc.type = waveform;
    }
  }

  // Start playback of the sequence
  startPlayback(sequence) {
    if (!sequence || !sequence.notes || sequence.notes.length === 0) {
      console.warn("Invalid sequence format:", sequence);
      return;
    }

    // Stop any existing playback
    this.stopPlayback();

    // Start all sound sources
    this.osc1.start();
    this.osc2.start();
    this.osc3.start();
    this.noise.start();

    // Sort notes by start time
    const sortedNotes = [...sequence.notes].sort(
      (a, b) => a.startTime - b.startTime
    );

    // Calculate time divisions
    const minTime = Math.min(...sortedNotes.map((n) => n.startTime));
    const maxTime = Math.max(...sortedNotes.map((n) => n.endTime));
    const duration = maxTime - minTime;
    const stepSize = duration / 16; // Divide into 16 steps

    // Create sequences for each channel
    const channels = [[], [], [], []];

    sortedNotes.forEach((note) => {
      const pitch = note.pitch;
      let channel;

      // Distribute notes across channels based on pitch
      if (pitch < 48) channel = 0; // Low range to osc1
      else if (pitch < 72) channel = 1; // Mid range to osc2
      else if (pitch < 96) channel = 2; // High range to osc3
      else channel = 3; // Highest to noise

      // Calculate step index
      const step = Math.floor((note.startTime - minTime) / stepSize);

      // Ensure we have arrays for each step
      while (channels[channel].length <= step) {
        channels[channel].push(null);
      }

      channels[channel][step] = {
        frequency: Tone.Frequency(note.pitch, "midi").toFrequency(),
        velocity: note.velocity / 127, // Convert MIDI velocity to 0-1
        duration: Math.max(0.1, note.endTime - note.startTime),
      };
    });

    // Fill any gaps with nulls to maintain timing
    channels.forEach((channel) => {
      while (channel.length < 16) {
        channel.push(null);
      }
    });

    // Create sequences for each channel
    this.activeSequences = channels.map((channel, i) => {
      return new Tone.Sequence(
        (time, event) => {
          if (!event) return;

          const { frequency, velocity, duration } = event;

          // Handle each channel differently
          switch (i) {
            case 0: // Osc1
              this.osc1.frequency.setValueAtTime(frequency, time);
              this.triggerEnvelope(0, time, { duration, velocity });
              break;
            case 1: // Osc2
              this.osc2.frequency.setValueAtTime(frequency, time);
              this.triggerEnvelope(1, time, { duration, velocity });
              break;
            case 2: // Osc3
              this.osc3.frequency.setValueAtTime(frequency, time);
              this.triggerEnvelope(2, time, { duration, velocity });
              break;
            case 3: // Noise
              if (frequency) {
                const volume = velocity * 20 - 20; // Convert to dB range -20 to 0
                this.noise.volume.setValueAtTime(volume, time);
                this.triggerEnvelope(3, time, { duration, velocity });
              }
              break;
          }
        },
        channel,
        "16n"
      ).start(0);
    });

    // Set tempo based on sequence
    if (sequence.tempos && sequence.tempos[0]) {
      Tone.Transport.bpm.value = sequence.tempos[0].qpm;
    } else {
      Tone.Transport.bpm.value = 120; // Default tempo
    }

    // Start transport if not already running
    if (Tone.Transport.state !== "started") {
      Tone.Transport.start();
    }
  }

  // Stop playback
  stopPlayback() {
    Tone.Transport.stop();
    this.activeSequences.forEach((seq) => seq.dispose());
    this.activeSequences = [];

    // Stop all sound sources
    this.osc1.stop();
    this.osc2.stop();
    this.osc3.stop();
    this.noise.stop();
  }

  // Update tempo
  setTempo(bpm) {
    Tone.Transport.bpm.value = bpm;
  }

  // Set spatial position for a channel (-1 to 1 for x/y)
  setSpatialPosition(channel, x, y) {
    if (channel >= 0 && channel < 4) {
      const director = this.spatialDirectors[channel];

      // Set left/right position
      director.panner.pan.value = x;

      // Set front/back balance
      const frontAmount = (1 - y) * 0.5; // More positive y = more rear
      const rearAmount = (1 + y) * 0.5; // More negative y = more front

      director.frontGain.gain.value = frontAmount;
      director.rearGain.gain.value = rearAmount;

      // Calculate quad gains based on position
      const leftAmount = (1 - x) * 0.5;
      const rightAmount = (1 + x) * 0.5;

      director.outputs.fl.gain.value = leftAmount * frontAmount;
      director.outputs.fr.gain.value = rightAmount * frontAmount;
      director.outputs.rl.gain.value = leftAmount * rearAmount;
      director.outputs.rr.gain.value = rightAmount * rearAmount;
    }
  }

  // Set reverb parameters for a channel
  setSpatialReverb(channel, decay, wet) {
    if (channel >= 0 && channel < 4) {
      const reverb = this.spatialDirectors[channel].reverb;
      reverb.decay = decay;
      reverb.wet.value = wet;
    }
  }

  // Initialize Tone.js and prepare audio engine
  async initialize() {
    if (this.initialized) return this;

    try {
      // Start audio context
      await Tone.start();
      await Tone.context.resume();
      await sleep(100); // Small delay to ensure context is ready

      // Connect master volume to destination
      this.masterVolume.toDestination();

      // Connect quad outputs to master volume
      Object.values(this.quadOutputs).forEach((output) => {
        output.connect(this.masterVolume);
      });

      // Initialize LPGs
      for (let i = 0; i < 4; i++) {
        const lpg = this.lpgs[i];

        lpg.vactrol = new Tone.Follower(0.1);
        lpg.vca = new Tone.Gain(0);
        lpg.filter = new Tone.Filter({
          frequency: 2000,
          type: "lowpass",
          rolloff: -12,
        });
        lpg.envelope = new Tone.Envelope({
          attack: 0.1,
          decay: 0,
          sustain: 1,
          release: 0.2,
          attackCurve: "exponential",
          releaseCurve: "exponential",
        });
        lpg.lfo = new Tone.LFO({
          frequency: 1,
          min: 0,
          max: 1,
          type: "sine",
        });

        // Connect LPG components
        lpg.envelope.connect(lpg.vactrol);
        lpg.lfo.connect(lpg.vactrol);
        lpg.vactrol.connect(lpg.vca.gain);
        lpg.vactrol.connect(lpg.filter.frequency);
        lpg.filter.connect(lpg.vca);

        // Initialize envelope parameters and create proper signal chain
        const envSystem = this.envelopes[i];

        // Create a VCA for the envelope to control
        envSystem.vca = new Tone.Gain(0);
        envSystem.envelope.connect(envSystem.vca.gain);
        envSystem.vca.connect(lpg.vactrol);

        // Initialize envelope parameters
        envSystem.envelope.attack = 0.01;
        envSystem.envelope.decay = 0.2;
        envSystem.envelope.sustain = 0.5;
        envSystem.envelope.release = 0.5;
        envSystem.timeScale = 1;

        // Start LFO if in loop mode
        if (envSystem.isLooping) {
          lpg.lfo.start();
        }
      }

      // Connect matrix mixer
      this.matrixMixer.inputs.forEach((input, i) => {
        this.matrixMixer.outputs.forEach((output, j) => {
          input.connect(this.matrixMixer.matrix[i][j]);
          this.matrixMixer.matrix[i][j].connect(output);
        });
      });

      // Connect matrix outputs to spatial directors
      this.matrixMixer.outputs.forEach((output, i) => {
        if (this.spatialDirectors[i]?.panner) {
          output.connect(this.spatialDirectors[i].panner);
        }
      });

      // Initialize spatial routing
      await Promise.all(
        this.spatialDirectors.map(async (director) => {
          await director.reverb.generate();

          director.panner.connect(director.frontGain);
          director.panner.connect(director.rearGain);
          director.frontGain.connect(director.reverb);
          director.rearGain.connect(director.reverb);
          director.reverb.connect(director.outputs.fl);
          director.reverb.connect(director.outputs.fr);
          director.reverb.connect(director.outputs.rl);
          director.reverb.connect(director.outputs.rr);

          director.outputs.fl.connect(this.quadOutputs.frontLeft);
          director.outputs.fr.connect(this.quadOutputs.frontRight);
          director.outputs.rl.connect(this.quadOutputs.rearLeft);
          director.outputs.rr.connect(this.quadOutputs.rearRight);
        })
      );

      // Connect signal chains
      this.osc1.chain(
        this.waveFolders[0],
        this.bandpassFilters[0],
        this.lpgs[0].filter,
        this.lpgs[0].vca,
        this.matrixMixer.inputs[0]
      );

      this.osc2.chain(
        this.waveFolders[1],
        this.bandpassFilters[1],
        this.lpgs[1].filter,
        this.lpgs[1].vca,
        this.matrixMixer.inputs[1]
      );

      this.osc3.chain(
        this.waveFolders[2],
        this.bandpassFilters[2],
        this.lpgs[2].filter,
        this.lpgs[2].vca,
        this.matrixMixer.inputs[2]
      );

      this.noise.chain(
        this.noiseFilter,
        this.noiseVCA,
        this.lpgs[3].filter,
        this.lpgs[3].vca,
        this.matrixMixer.inputs[3]
      );

      // Set default mixer settings
      for (let i = 0; i < 4; i++) {
        this.setMixerPoint(i, i, 0.7);
      }

      // Final delay to ensure everything is ready
      await sleep(100);

      this.initialized = true;
      console.log("Audio engine initialized with Buchla-style LPGs");
      return this;
    } catch (error) {
      console.error("Failed to initialize audio engine:", error);
      throw error;
    }
  }

  // Test direct signal path
  async testDirectPath() {
    await Tone.start();
    await sleep(100);

    console.log("Testing direct signal path...");

    // Start oscillators
    this.osc1.start();
    this.osc2.start();
    this.osc3.start();

    // Test each oscillator in sequence
    const testSequence = async () => {
      // Test osc1
      this.osc1.frequency.value = 440;
      await Tone.Destination.volume.rampTo(-12, 0.1);
      await sleep(100);

      // Test osc2
      this.osc2.frequency.value = 554.37;
      await sleep(100);

      // Test osc3
      this.osc3.frequency.value = 659.25;
      await sleep(100);

      // Stop all
      this.osc1.stop();
      this.osc2.stop();
      this.osc3.stop();

      // Disconnect test monitor
      this.osc1.disconnect(this.testMonitor);
      this.osc2.disconnect(this.testMonitor);
      this.osc3.disconnect(this.testMonitor);

      // Restore original connections
      this.osc1.chain(
        this.waveFolders[0],
        this.bandpassFilters[0],
        this.lpgs[0].filter,
        this.lpgs[0].vca,
        this.matrixMixer.inputs[0]
      );

      this.osc2.chain(
        this.waveFolders[1],
        this.bandpassFilters[1],
        this.lpgs[1].filter,
        this.lpgs[1].vca,
        this.matrixMixer.inputs[1]
      );

      this.osc3.chain(
        this.waveFolders[2],
        this.bandpassFilters[2],
        this.lpgs[2].filter,
        this.lpgs[2].vca,
        this.matrixMixer.inputs[2]
      );

      console.log("Direct path test complete");
    };

    await testSequence();
  }

  // Test sound output with proper initialization
  async testSound() {
    await Tone.start();
    await sleep(100);

    console.log("Testing full signal path...");

    // Stop any existing playback
    this.stopPlayback();

    // Start oscillators
    this.osc1.start();
    this.osc2.start();
    this.osc3.start();
    this.noise.start();

    // Set some basic frequencies
    this.osc1.frequency.value = 440; // A4
    this.osc2.frequency.value = 554.37; // C#5
    this.osc3.frequency.value = 659.25; // E5

    // Set all mixer points to full
    for (let i = 0; i < 4; i++) {
      this.setMixerPoint(i, i, 1);
    }

    // Trigger envelopes repeatedly
    const triggerInterval = setInterval(() => {
      this.triggerEnvelope(0);
      setTimeout(() => this.triggerEnvelope(1), 150);
      setTimeout(() => this.triggerEnvelope(2), 300);
      setTimeout(() => this.triggerEnvelope(3), 450);
    }, 1000);

    // Stop after 4 seconds
    setTimeout(() => {
      clearInterval(triggerInterval);
      this.stopPlayback();
      console.log("Full path test complete");
    }, 4000);
  }

  // Set oscillator parameters
  setOscillatorParams(oscNumber, params) {
    if (oscNumber >= 1 && oscNumber <= 3) {
      const osc = this[`osc${oscNumber}`];
      if (!osc) return;

      // Update frequency if provided
      if (params.frequency !== undefined) {
        osc.frequency.value = params.frequency;
      }

      // Update wave type if provided
      if (params.waveType !== undefined) {
        osc.type = params.waveType;
      }

      // Update wave shape (folding) if provided
      if (params.waveShape !== undefined) {
        this.setWaveFold(oscNumber, params.waveShape);
      }

      // Update FM amount if provided (only for osc3 which has the frequency shifter)
      if (params.fmAmount !== undefined && oscNumber === 3) {
        this.setFrequencyShift(params.fmAmount * 1000); // Scale to 0-1000 Hz range
      }
    }
  }

  // Add method for noise control
  setNoiseParams(params) {
    if (params.volume !== undefined) {
      this.noiseVCA.gain.value = Math.max(0, Math.min(1, params.volume));
    }
    if (params.filterFreq !== undefined) {
      this.noiseFilter.frequency.value = params.filterFreq;
    }
    if (params.filterQ !== undefined) {
      this.noiseFilter.Q.value = params.filterQ;
    }
  }

  // Enhanced sequence generation from text
  generateSequenceFromText(text) {
    const charCodes = text.split("").map((c) => c.charCodeAt(0));
    const seq = [];

    // Generate base sequence
    for (let i = 0; i < 16; i++) {
      const code = charCodes[i % charCodes.length];
      seq[i] = {
        cv1: (code % 12) / 12, // Quantized pitch
        cv2: ((code >> 4) % 16) / 16, // Wave shape
        trig1: code % 2, // Trigger probability
        trig2: (code >> 1) % 2, // Secondary trigger
        duration: 0.25 * (1 + (code % 4)), // Variable step duration
      };
    }

    // Apply sequence to AFG
    seq.forEach((step, i) => {
      this.updateAFGStep(i, step);
      // Store as morph target
      this.sequenceMorph.target[i].value = step.cv1;
    });

    return seq;
  }

  // Update sequence morphing
  setSequenceMorph(amount) {
    this.sequenceMorph.amount.value = Math.max(0, Math.min(1, amount));
  }

  // Set active voices
  setActiveVoices(count) {
    this.voiceManager.activeVoices = Math.max(
      1,
      Math.min(this.voiceManager.maxVoices, count)
    );
  }

  // Convert a Magenta sequence to our format
  convertFromMagentaSequence(magentaSequence) {
    const sequence = {
      notes: [],
      gates: [],
      accents: [],
      durations: [],
    };

    // Extract notes and timing
    magentaSequence.notes.forEach((note) => {
      sequence.notes.push(note.pitch);
      sequence.durations.push(note.endTime - note.startTime);
      sequence.gates.push(1); // Default gate on for notes
      sequence.accents.push(note.velocity / 127); // Convert MIDI velocity to 0-1
    });

    // Extract control changes if present
    if (magentaSequence.controlChanges) {
      magentaSequence.controlChanges.forEach((cc) => {
        const stepIndex = Math.floor(cc.time * 4); // Convert time to step index
        if (cc.controlNumber === 64) {
          // Gate
          sequence.gates[stepIndex] = cc.value / 127;
        } else if (cc.controlNumber === 11) {
          // Expression/Accent
          sequence.accents[stepIndex] = cc.value / 127;
        }
      });
    }

    return sequence;
  }

  // Convert our sequence to Magenta format
  convertToMagentaSequence(sequence) {
    const magentaSequence = {
      notes: [],
      totalTime: sequence.durations.reduce((sum, dur) => sum + dur, 0),
      tempos: [{ time: 0, qpm: 120 }],
      timeSignatures: [{ time: 0, numerator: 4, denominator: 4 }],
    };

    let currentTime = 0;
    sequence.notes.forEach((note, i) => {
      magentaSequence.notes.push({
        pitch: note,
        startTime: currentTime,
        endTime: currentTime + sequence.durations[i],
        velocity: Math.round(sequence.accents[i] * 127),
        program: 0,
        isDrum: false,
      });
      currentTime += sequence.durations[i];
    });

    // Add gates and accents as control changes
    magentaSequence.controlChanges = [];
    sequence.gates.forEach((gate, i) => {
      magentaSequence.controlChanges.push({
        time: i * 0.25, // Assuming quarter note divisions
        controlNumber: 64,
        value: Math.round(gate * 127),
        program: 0,
      });
    });

    sequence.accents.forEach((accent, i) => {
      magentaSequence.controlChanges.push({
        time: i * 0.25,
        controlNumber: 11,
        value: Math.round(accent * 127),
        program: 0,
      });
    });

    return magentaSequence;
  }

  // Add volume control method
  setMasterVolume(value, rampTime = 0.1) {
    // Ensure value is a valid number and clamp between 0 and 1
    const safeValue = Math.max(0, Math.min(1, Number(value) || 0));

    // Convert linear 0-1 to decibels (-60 to 0)
    // Use -60dB as the minimum instead of -Infinity for better volume control
    const db =
      safeValue === 0 ? -60 : Math.max(-60, 20 * Math.log10(safeValue));

    // Ensure we have a valid ramp time
    const safeRampTime = Math.max(0, Number(rampTime) || 0.1);

    // Use linear ramping for values near silence to prevent exponential ramp errors
    if (db <= -55) {
      this.masterVolume.volume.linearRampToValueAtTime(
        -60,
        Tone.now() + safeRampTime
      );
    } else {
      this.masterVolume.volume.exponentialRampToValueAtTime(
        db,
        Tone.now() + safeRampTime
      );
    }
  }

  // Set LPG parameters
  async setLPGParams(index, { response, level }) {
    if (!this.initialized || !this.lpgs[index]) return;

    try {
      const lpg = this.lpgs[index];

      // Set vactrol response time
      lpg.vactrol.smoothing = response;

      // Set VCA maximum gain
      lpg.vca.gain.value = level;

      // Adjust filter frequency range based on level
      lpg.filter.frequency.value = 200 + level * 10000;

      // Retrigger envelope if not in LFO mode
      if (!lpg.lfo.state === "started") {
        lpg.envelope.triggerAttackRelease(0.01);
      }
    } catch (error) {
      console.warn(`Error setting LPG ${index} params:`, error);
    }
  }
}

// Create and export a single instance
const audioEngine = new AudioEngine();
export default audioEngine;
