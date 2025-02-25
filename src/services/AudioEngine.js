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
    this.tempo = 120; // Default tempo in BPM

    // Create master effects chain
    this.masterCompressor = new Tone.Compressor({
      threshold: -24, // Start compressing when signal exceeds -24dB
      ratio: 4, // For every 4dB increase in input, output increases by 1dB
      attack: 0.003, // Fast attack to catch transients
      release: 0.25, // Moderate release time
      knee: 12, // Soft knee for smoother compression
    });

    this.masterLimiter = new Tone.Limiter({
      threshold: -3, // Prevent output from exceeding -3dB
      release: 0.05, // Fast release to prevent pumping
    });

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

    // Create matrix bandpass filters (for Matrix Out 1 & 2)
    this.matrixBandpassFilters = Array(2)
      .fill()
      .map(
        (_, i) =>
          new Tone.Filter({
            type: "bandpass",
            frequency: [1000, 1500][i], // Different frequencies for each filter
            Q: 1.5, // Moderate resonance
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

    // Add global envelope control
    this.globalEnvelope = {
      rise: 0.1, // Global rise time (attack)
      fall: 0.2, // Global fall time (release)
      level: 0.8, // Global level (sustain)
      offsets: [1, 0.8, 0.6, 0.4], // Different strengths for each channel
    };

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
      .map((_, i) => {
        const env = new Tone.Envelope({
          attack: this.globalEnvelope.rise * this.globalEnvelope.offsets[i],
          decay: this.globalEnvelope.fall * this.globalEnvelope.offsets[i],
          sustain: this.globalEnvelope.level * this.globalEnvelope.offsets[i],
          release: this.globalEnvelope.fall * this.globalEnvelope.offsets[i],
          attackCurve: "exponential",
          releaseCurve: "exponential",
        });

        return {
          envelope: env,
          offset: new Tone.Add(0.2),
          multiply: new Tone.Multiply(this.globalEnvelope.offsets[i]),
          isLooping: false,
          timeScale: 1,
        };
      });

    // Initialize other properties
    this.activeSequences = [];
    this.clockRoutings = {};

    // Add sequence morphing utilities
    this.sequenceMorph = {
      interpolator: {
        curve: (value) => {
          // Simple utility to pass through the value
          // Can be expanded for more complex morphing
          return value;
        },
      },
    };
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
            (this.clockSystem.counters["4n"] + 1) % 4;

          // Trigger envelopes A & B on quarter notes (Clock x4)
          if (this.clockSystem.counters["4n"] % 1 === 0) {
            this.triggerEnvelope(0, time, { duration: 0.02 }); // Envelope A
            this.triggerEnvelope(1, time, { duration: 0.02 }); // Envelope B
          }

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
          const clockDiv = this.handleClockDivision(playhead.clockDiv || "4n");
          const tempo = this.tempo || Tone.Transport.bpm.value;
          const shouldTrigger =
            time > (playhead.lastTrig || 0) + (60 / tempo) * clockDiv;

          if (shouldTrigger) {
            playhead.lastTrig = time;
            playhead.position = ((playhead.position || 0) + 1) % 16;

            // Get step values with quantization and morphing
            const step = this.afg.steps[playhead.position];
            if (!step) return;

            let cv = 0;
            if (step.externalMode && step.externalInputIndex !== undefined) {
              const externalCV =
                this.afg.externalCV &&
                this.afg.externalCV[step.externalInputIndex];
              cv = externalCV ? externalCV.value : 0;
            } else if (step.cv1) {
              cv = step.cv1.value;
            }

            // Apply quantization
            cv = this.sequenceQuantizer.next();

            // Apply morphing (safely check if it exists)
            if (this.sequenceMorph && this.sequenceMorph.interpolator) {
              cv = this.sequenceMorph.interpolator.curve(cv);
            }

            // Trigger envelopes and update oscillators
            this.triggerEnvelope(index, time);
            this.setOscillatorParams(index + 1, {
              frequency: Tone.Frequency(48 + cv * 24, "midi").toFrequency(),
              waveShape: step.cv2 ? step.cv2.value : 0,
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

  setTempo(bpm) {
    this.tempo = bpm;
    Tone.Transport.bpm.value = bpm;
  }

  setClockTempo(bpm) {
    this.tempo = bpm;
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

  // Set oscillator parameters
  setOscillatorParams(oscNumber, params) {
    if (!this.initialized) {
      console.warn("Audio engine not initialized");
      return;
    }

    try {
      if (oscNumber >= 1 && oscNumber <= 3) {
        const osc = this[`osc${oscNumber}`];
        if (!osc) {
          console.warn(`Oscillator ${oscNumber} not found`);
          return;
        }

        // Update frequency if provided
        if (params.frequency !== undefined) {
          osc.frequency.value = Math.max(20, Math.min(20000, params.frequency));
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
    } catch (error) {
      console.warn(`Error setting oscillator ${oscNumber} parameters:`, error);
    }
  }

  // Set wave folding amount (0-1)
  setWaveFold(oscNumber, amount) {
    if (!this.initialized) return;

    try {
      if (oscNumber >= 1 && oscNumber <= 3) {
        // Map 0-1 to different wave shaping functions for more timbral variety
        const normalizedAmount = amount * 15; // Scale up the input range more dramatically
        let shapeFunc;

        if (normalizedAmount < 5) {
          // Gentle sine folding for subtle harmonics
          const fold = 1 + normalizedAmount * 0.8;
          shapeFunc = (x) => Math.sin(x * Math.PI * fold);
        } else if (normalizedAmount < 10) {
          // Asymmetric folding for richer harmonics
          const fold = 1 + (normalizedAmount - 5) * 1.2;
          shapeFunc = (x) => {
            const folded = Math.sin(x * Math.PI * fold);
            return folded * Math.cos(x * Math.PI * 0.7) * 1.2;
          };
        } else {
          // Hard folding for aggressive timbres
          const fold = 1 + (normalizedAmount - 10) * 1.5;
          shapeFunc = (x) => {
            const folded = Math.sin(x * Math.PI * fold);
            const shaped = Math.sign(folded) * Math.pow(Math.abs(folded), 0.6);
            return shaped * 1.5; // Increase output gain for more presence
          };
        }

        this.waveFolders[oscNumber - 1].setMap(shapeFunc);
      }
    } catch (error) {
      console.warn(
        `Error setting wave fold for oscillator ${oscNumber}:`,
        error
      );
    }
  }

  // Set frequency shift amount
  setFrequencyShift(shiftAmount) {
    if (!this.initialized) return;

    try {
      this.freqShifter.frequency.value = Math.max(
        0,
        Math.min(1000, shiftAmount)
      );
    } catch (error) {
      console.warn("Error setting frequency shift:", error);
    }
  }

  // Enhanced envelope methods
  setEnvelope(channel, params) {
    if (channel >= 0 && channel < 4) {
      // Update global envelope if this is channel 0 (master)
      if (
        channel === 0 &&
        (params.rise !== undefined ||
          params.fall !== undefined ||
          params.level !== undefined)
      ) {
        if (params.rise !== undefined) this.globalEnvelope.rise = params.rise;
        if (params.fall !== undefined) this.globalEnvelope.fall = params.fall;
        if (params.level !== undefined)
          this.globalEnvelope.level = params.level;

        // Update all channels with scaled values
        this.envelopes.forEach((envSystem, i) => {
          const env = envSystem.envelope;
          env.attack =
            this.globalEnvelope.rise * this.globalEnvelope.offsets[i];
          env.decay = this.globalEnvelope.fall * this.globalEnvelope.offsets[i];
          env.sustain =
            this.globalEnvelope.level * this.globalEnvelope.offsets[i];
          env.release =
            this.globalEnvelope.fall * this.globalEnvelope.offsets[i];
        });
      } else {
        // Individual channel updates
        const envSystem = this.envelopes[channel];
        const env = envSystem.envelope;
        const offset = this.globalEnvelope.offsets[channel];

        if (params.rise !== undefined) env.attack = params.rise * offset;
        if (params.fall !== undefined) {
          env.decay = params.fall * offset;
          env.release = params.fall * offset;
        }
        if (params.level !== undefined) env.sustain = params.level * offset;
      }
    }
  }

  initializeEnvelopeBehaviors() {
    // Set up envelopes A & B (0 & 1) to be triggered by clock
    // These are transient envelopes (non-sustaining)
    for (let i = 0; i < 2; i++) {
      const envSystem = this.envelopes[i];
      const env = envSystem.envelope;

      // Set to transient mode (non-sustaining)
      env.sustain = 0;

      // Faster attack and decay for percussive sounds
      env.attack = i === 0 ? 0.002 : 0.002; // Both have 2ms attack
      env.decay = i === 0 ? 0.2 : 1; // Envelope A: 0.2s decay, Envelope B: 1s decay
      env.release = env.decay;
    }

    // Set up envelopes C & D (2 & 3) for self-cycling behavior
    for (let i = 2; i < 4; i++) {
      const envSystem = this.envelopes[i];
      const env = envSystem.envelope;

      // Set to sustained mode
      env.sustain = 0.7;

      // Longer attack and decay for cycling envelopes
      env.attack = i === 2 ? 1 : 0.02; // Envelope C: 1s attack, Envelope D: 0.02s attack
      env.decay = 3; // Both have 3s decay
      env.release = env.decay;

      // Enable looping
      this.setEnvelopeLFO(i, true, i === 2 ? 0.25 : 0.15); // Different rates for variation
    }

    // Connect envelope C to modulate Matrix Bandpass Filter A cutoff
    const filterScaleA = new Tone.Scale(200, 5000); // Scale range for filter frequency
    this.envelopes[2].envelope.connect(filterScaleA);
    filterScaleA.connect(this.matrixBandpassFilters[0].frequency);

    // Connect envelope D to modulate Matrix Bandpass Filter B cutoff
    const filterScaleB = new Tone.Scale(200, 5000); // Scale range for filter frequency
    this.envelopes[3].envelope.connect(filterScaleB);
    filterScaleB.connect(this.matrixBandpassFilters[1].frequency);
  }

  // Enable envelope looping (LFO mode) with timing control
  setEnvelopeLFO(channel, enabled, rate = 1) {
    if (channel >= 0 && channel < 4 && this.envelopes) {
      try {
        const envSystem = this.envelopes[channel];
        if (!envSystem) {
          console.warn(`Envelope system ${channel} not initialized yet.`);
          return;
        }

        // Set the flag whether it's successfully implemented or not
        envSystem.isLooping = enabled;

        // If Tone.Transport isn't ready, just save the state for later
        if (!Tone.Transport || Tone.Transport.state === "stopped") {
          console.log(
            `Envelope ${channel} loop state set to ${enabled}, but transport not started.`
          );
          return;
        }

        if (enabled) {
          // Calculate loop time based on envelope settings
          const totalTime =
            (envSystem.envelope.attack + envSystem.envelope.decay) *
            (envSystem.timeScale || 1);
          const loopTime = Math.max(0.1, totalTime / (rate || 1)); // Ensure minimum loop time

          // Clear any existing events
          if (envSystem.loopId) {
            Tone.Transport.clear(envSystem.loopId);
          }

          // Schedule the loop
          envSystem.loopId = Tone.Transport.scheduleRepeat((time) => {
            if (envSystem.isLooping) {
              this.triggerEnvelope(channel, time);
            }
          }, loopTime);

          console.log(
            `Envelope ${channel} looping enabled with period ${loopTime}s`
          );
        } else if (envSystem.loopId) {
          Tone.Transport.clear(envSystem.loopId);
          envSystem.loopId = null;
          console.log(`Envelope ${channel} looping disabled`);
        }
      } catch (error) {
        console.error(`Error setting envelope ${channel} LFO:`, error);
      }
    } else {
      console.warn(
        `Invalid envelope channel ${channel} or envelopes not initialized`
      );
    }
  }

  // Enhanced trigger with proper timing
  triggerEnvelope(channel, time = "+0.01", params = {}) {
    if (channel >= 0 && channel < 4 && this.envelopes) {
      try {
        const envSystem = this.envelopes[channel];
        if (!envSystem || !envSystem.envelope) {
          console.warn(`Envelope system ${channel} not properly initialized.`);
          return;
        }

        const lpg = this.lpgs && this.lpgs[channel];

        // Use provided duration or calculate from envelope settings
        const duration =
          params.duration ||
          (envSystem.envelope.attack + envSystem.envelope.decay) *
            (envSystem.timeScale || 1);

        // Convert velocity (0-1) to appropriate envelope scaling
        if (params.velocity !== undefined && envSystem.multiply) {
          const velocityScale = Math.max(0.2, params.velocity); // Minimum velocity of 0.2
          envSystem.multiply.value = velocityScale;
        }

        // Reset filter and VCA if they exist
        if (lpg && lpg.filter && lpg.vca) {
          lpg.filter.frequency.cancelScheduledValues(time);
          lpg.vca.gain.cancelScheduledValues(time);
          lpg.filter.frequency.setValueAtTime(20, time);
          lpg.vca.gain.setValueAtTime(0, time);
        }

        // Trigger with timing consideration
        envSystem.envelope.triggerAttackRelease(duration, time);
      } catch (error) {
        console.error(`Error triggering envelope ${channel}:`, error);
      }
    } else {
      console.warn(
        `Invalid envelope channel ${channel} or envelopes not initialized`
      );
    }
  }

  // Set a mixer crosspoint level (0-1)
  setMixerPoint(inputIdx, outputIdx, level) {
    if (inputIdx >= 0 && inputIdx < 4 && outputIdx >= 0 && outputIdx < 4) {
      const mixer = this.ensureMatrixMixerInitialized();
      if (
        mixer &&
        mixer.matrix &&
        mixer.matrix[inputIdx] &&
        mixer.matrix[inputIdx][outputIdx]
      ) {
        mixer.matrix[inputIdx][outputIdx].gain.value = Math.max(
          0,
          Math.min(1, level)
        );
      } else {
        console.warn(
          "Matrix mixer not fully initialized for setting point",
          inputIdx,
          outputIdx
        );
      }
    }
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
    if (this.initialized) return;

    try {
      await Tone.start();
      await this.initializeComponents();
      this.connectMasterChain();

      // Initialize LPG modes
      this.initializeLPGModes();

      // Initialize envelope behaviors
      this.initializeEnvelopeBehaviors();

      // Start oscillators
      this.osc1.start();
      this.osc2.start();
      this.osc3.start();
      this.noise.start();

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize audio engine:", error);
      throw error;
    }
  }

  async initializeComponents() {
    try {
      // Initialize LPGs
      for (let i = 0; i < 4; i++) {
        const lpg = this.lpgs[i];
        const offset = this.globalEnvelope.offsets[i];

        lpg.vactrol = new Tone.Follower(0.01); // Faster response time
        lpg.vca = new Tone.Gain(0); // Start closed
        lpg.filter = new Tone.Filter({
          frequency: 20, // Start fully closed
          type: "lowpass",
          rolloff: -24, // Steeper slope
        });
        lpg.envelope = new Tone.Envelope({
          attack: this.globalEnvelope.rise * offset,
          decay: this.globalEnvelope.fall * offset,
          sustain: this.globalEnvelope.level * offset,
          release: this.globalEnvelope.fall * offset,
          attackCurve: "exponential",
          releaseCurve: "exponential",
        });
        lpg.lfo = new Tone.LFO({
          frequency: 1,
          min: 0, // Full modulation range
          max: 1,
          type: "sine",
        });

        // Connect LPG components with envelope integration
        lpg.envelope.connect(lpg.vactrol);
        lpg.lfo.connect(lpg.vactrol);
        lpg.vactrol.connect(lpg.vca.gain);

        // Scale envelope to filter frequency (20Hz - 20kHz)
        const filterScale = new Tone.Scale(20, 20000);
        lpg.vactrol.connect(filterScale);
        filterScale.connect(lpg.filter.frequency);

        lpg.filter.connect(lpg.vca);

        // Start the LFO
        lpg.lfo.start();
      }

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

      // Connect matrix mixer
      this.matrixMixer.inputs.forEach((input, i) => {
        this.matrixMixer.outputs.forEach((output, j) => {
          input.connect(this.matrixMixer.matrix[i][j]);
          this.matrixMixer.matrix[i][j].connect(output);
        });
      });

      // Connect signal chains
      this.osc1.chain(
        this.waveFolders[0],
        this.bandpassFilters[0],
        this.matrixMixer.inputs[0]
      );

      this.osc2.chain(
        this.waveFolders[1],
        this.bandpassFilters[1],
        this.matrixMixer.inputs[1]
      );

      this.osc3.chain(
        this.waveFolders[2],
        this.toneShaper, // Using tone shaper for OSC3 instead of bandpass filter
        this.matrixMixer.inputs[2]
      );

      this.noise.chain(
        this.noiseFilter,
        this.noiseVCA,
        this.matrixMixer.inputs[3]
      );

      // Connect matrix outputs to matrix bandpass filters and LPGs according to the documentation
      // Matrix Out 1 → Matrix Bandpass Filter A → LPG 1
      this.matrixMixer.outputs[0].connect(this.matrixBandpassFilters[0]);
      this.matrixBandpassFilters[0].connect(this.lpgs[0].filter);

      // Matrix Out 2 → Matrix Bandpass Filter B → LPG 2
      this.matrixMixer.outputs[1].connect(this.matrixBandpassFilters[1]);
      this.matrixBandpassFilters[1].connect(this.lpgs[1].filter);

      // Matrix Out 3 → LPG 3 (Direct)
      this.matrixMixer.outputs[2].connect(this.lpgs[2].filter);

      // Matrix Out 4 → LPG 4 (Direct)
      this.matrixMixer.outputs[3].connect(this.lpgs[3].filter);

      // Connect LPG outputs to spatial directors
      for (let i = 0; i < 4; i++) {
        this.lpgs[i].vca.connect(this.spatialDirectors[i].panner);
      }

      // Set default mixer settings
      for (let i = 0; i < 4; i++) {
        this.setMixerPoint(i, i, 0.7);
      }

      // Final delay to ensure everything is ready
      await sleep(100);
    } catch (error) {
      console.error("Failed to initialize components:", error);
      throw error;
    }
  }

  connectMasterChain() {
    // Connect quad outputs to master chain
    Object.values(this.quadOutputs).forEach((output) => {
      output.connect(this.masterCompressor);
    });

    // Connect master effects chain
    this.masterCompressor.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterVolume);
    this.masterVolume.toDestination();
  }

  // ... rest of your existing methods ...

  setMasterVolume(value, fadeTime = 0.1) {
    // Ensure value is between 0 and 1
    const normalizedValue = Math.max(0, Math.min(1, value));
    // Convert to dB (-Infinity to 0)
    const dbValue =
      normalizedValue === 0 ? -Infinity : Tone.gainToDb(normalizedValue);

    if (fadeTime > 0) {
      this.masterVolume.volume.rampTo(dbValue, fadeTime);
    } else {
      this.masterVolume.volume.value = dbValue;
    }
  }

  // Add method to adjust compressor settings
  setCompressorSettings({
    threshold = -24,
    ratio = 4,
    attack = 0.003,
    release = 0.25,
    knee = 12,
  } = {}) {
    this.masterCompressor.threshold.value = threshold;
    this.masterCompressor.ratio.value = ratio;
    this.masterCompressor.attack.value = attack;
    this.masterCompressor.release.value = release;
    this.masterCompressor.knee.value = knee;
  }

  // Add method to adjust limiter settings
  setLimiterSettings({ threshold = -3, release = 0.05 } = {}) {
    this.masterLimiter.threshold.value = threshold;
    this.masterLimiter.release.value = release;
  }

  dispose() {
    // Dispose of master effects
    this.masterCompressor.dispose();
    this.masterLimiter.dispose();
    this.masterVolume.dispose();

    // ... rest of your dispose logic ...
  }

  // Add method for noise control
  setNoiseParams(params) {
    if (!this.initialized) return;

    try {
      if (params.volume !== undefined) {
        this.noiseVCA.gain.value = Math.max(0, Math.min(1, params.volume));
      }
      if (params.filterFreq !== undefined) {
        this.noiseFilter.frequency.value = params.filterFreq;
      }
      if (params.filterQ !== undefined) {
        this.noiseFilter.Q.value = params.filterQ;
      }
    } catch (error) {
      console.warn("Error setting noise parameters:", error);
    }
  }

  // Set LPG parameters with improved error handling
  async setLPGParams(index, { response, level, resonance }) {
    if (!this.initialized || !this.lpgs[index]) {
      console.warn(`LPG ${index} not initialized`);
      return false;
    }

    try {
      const lpg = this.lpgs[index];

      // Batch parameter updates to minimize audio glitches
      const now = Tone.now();

      // Set vactrol response time (smoothing) with ramp to avoid clicks
      if (response !== undefined) {
        const smoothingValue = Math.max(0.01, Math.min(1, response));
        // Use linearRampToValueAtTime for smoother transitions
        lpg.vactrol.smoothing = smoothingValue;
      }

      // Set VCA level with ramp
      if (level !== undefined) {
        const gainValue = Math.max(0, Math.min(1, level));
        lpg.vca.gain.linearRampToValueAtTime(gainValue, now + 0.02);
      }

      // Set filter resonance with ramp
      if (resonance !== undefined && lpg.filter) {
        const qValue = Math.max(0.1, Math.min(20, resonance));
        lpg.filter.Q.linearRampToValueAtTime(qValue, now + 0.02);
      }

      // Adjust filter frequency based on level with ramp
      if (level !== undefined && lpg.filter) {
        const minFreq = 20;
        const maxFreq = 20000;
        const freqValue = minFreq + (maxFreq - minFreq) * level;
        lpg.filter.frequency.linearRampToValueAtTime(freqValue, now + 0.02);
      }

      return true;
    } catch (error) {
      console.warn(`Error setting LPG ${index} params:`, error);
      return false;
    }
  }

  // Add method to trigger LPG envelope
  triggerLPG(index, duration = 0.1) {
    if (!this.initialized || !this.lpgs[index]) return;

    try {
      const lpg = this.lpgs[index];
      if (lpg.envelope) {
        lpg.envelope.triggerAttackRelease(duration);
      }
    } catch (error) {
      console.warn(`Error triggering LPG ${index}:`, error);
    }
  }

  // Add method to start/stop LPG LFO
  setLPGLFO(index, enabled, rate = 1) {
    if (!this.initialized || !this.lpgs[index]) return;

    try {
      const lpg = this.lpgs[index];
      if (enabled) {
        lpg.lfo.frequency.value = rate;
        lpg.lfo.start();
      } else {
        lpg.lfo.stop();
      }
    } catch (error) {
      console.warn(`Error setting LPG ${index} LFO:`, error);
    }
  }

  // Set filter parameters (frequency and Q)
  setFilter(filterNumber, frequency, q) {
    if (!this.initialized) {
      console.warn("Audio engine not initialized");
      return;
    }

    try {
      if (filterNumber >= 1 && filterNumber <= 2) {
        const filter = this.bandpassFilters[filterNumber - 1];
        if (!filter) {
          console.warn(`Filter ${filterNumber} not found`);
          return;
        }

        // Update frequency if provided (clamp between 20Hz and 20kHz)
        if (frequency !== undefined) {
          filter.frequency.value = Math.max(20, Math.min(20000, frequency));
        }

        // Update Q if provided (clamp between 0.1 and 20)
        if (q !== undefined) {
          filter.Q.value = Math.max(0.1, Math.min(20, q));
        }
      }
    } catch (error) {
      console.warn(`Error setting filter ${filterNumber} parameters:`, error);
    }
  }

  // Set tone shaper (EQ3) parameters
  setToneShape(low, mid, high) {
    if (!this.initialized) {
      console.warn("Audio engine not initialized");
      return;
    }

    try {
      // Update low frequency band (-12 to +12 dB)
      if (low !== undefined) {
        this.toneShaper.low.value = Math.max(-12, Math.min(12, low));
      }

      // Update mid frequency band (-12 to +12 dB)
      if (mid !== undefined) {
        this.toneShaper.mid.value = Math.max(-12, Math.min(12, mid));
      }

      // Update high frequency band (-12 to +12 dB)
      if (high !== undefined) {
        this.toneShaper.high.value = Math.max(-12, Math.min(12, high));
      }
    } catch (error) {
      console.warn("Error setting tone shape parameters:", error);
    }
  }

  initializeLPGModes() {
    // LPG 1 & 2: VCF mode by default (filter active, gain fixed at 1)
    for (let i = 0; i < 2; i++) {
      const lpg = this.lpgs[i];
      // Configure filter parameters for VCF mode
      lpg.filter.type = "lowpass";
      lpg.filter.Q.value = 2; // Moderate resonance
      // Set VCA to always pass signal at full level in VCF-only mode
      lpg.vca.gain.value = 1;
      // In VCF mode, envelope modulates only filter frequency, not VCA gain
      const filterScale = new Tone.Scale(20, 15000); // Full filter range
      lpg.vactrol.disconnect();
      lpg.vactrol.connect(filterScale);
      filterScale.connect(lpg.filter.frequency);
    }

    // LPG 3 & 4: VCF+VCA mode by default (both filter and gain modulated)
    for (let i = 2; i < 4; i++) {
      const lpg = this.lpgs[i];
      // Configure filter parameters for VCF+VCA mode
      lpg.filter.type = "lowpass";
      lpg.filter.Q.value = 1; // Less resonance in combined mode

      // In VCF+VCA mode, envelope modulates both filter frequency and VCA gain
      // Connect envelope to both filter and VCA
      const filterScale = new Tone.Scale(20, 8000); // More controlled filter range
      lpg.vactrol.connect(filterScale);
      filterScale.connect(lpg.filter.frequency);
      lpg.vactrol.connect(lpg.vca.gain);
    }
  }

  // Handle clock division conversion
  handleClockDivision(clockDiv) {
    // Convert name-based clock divisions to numerical values
    switch (clockDiv) {
      case "16n":
        return 0.25;
      case "8n":
        return 0.5;
      case "4n":
        return 1;
      case "2n":
        return 2;
      case "1n":
        return 4;
      default:
        // If a number is passed, return it directly
        return typeof clockDiv === "number" ? clockDiv : 1;
    }
  }

  // Test method for the updated signal path
  async testSignalPath() {
    try {
      await this.initialize();
      console.log("Testing updated signal path...");

      // Start the oscillators and noise
      this.osc1.start();
      this.osc2.start();
      this.osc3.start();
      this.noise.start();

      // Set reasonable default frequencies
      this.osc1.frequency.value = 110; // A2
      this.osc2.frequency.value = 220; // A3
      this.osc3.frequency.value = 440; // A4

      // Set the mixer routing (connect each input to its corresponding output)
      for (let i = 0; i < 4; i++) {
        this.setMixerPoint(i, i, 0.8); // 80% level
      }

      // Set the clock tempo
      this.setClockTempo(120);

      // Start the clock to trigger envelopes A & B
      this.startClock();

      console.log("Signal path test initialized successfully");
      console.log("- Oscillators are running");
      console.log("- Matrix mixer is routing signals");
      console.log("- Clock is triggering envelopes A & B");
      console.log("- Envelopes C & D are self-cycling");

      return true;
    } catch (error) {
      console.error("Signal path test failed:", error);
      return false;
    }
  }

  // Helper to ensure matrix mixer is initialized
  ensureMatrixMixerInitialized() {
    if (!this.matrixMixer) {
      console.log("Creating matrix mixer");
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
    }
    return this.matrixMixer;
  }

  // Add method to set matrix bandpass filter parameters
  setMatrixBandpassFilterParams(filterIndex, params = {}) {
    if (!this.initialized || filterIndex < 0 || filterIndex > 1) {
      console.warn("Cannot set matrix bandpass filter parameters");
      return;
    }

    try {
      const filter = this.matrixBandpassFilters[filterIndex];

      // Update frequency if provided
      if (params.frequency !== undefined) {
        filter.frequency.value = Math.max(
          20,
          Math.min(20000, params.frequency)
        );
      }

      // Update Q if provided
      if (params.Q !== undefined) {
        filter.Q.value = Math.max(0.1, Math.min(20, params.Q));
      }

      // Update gain if provided
      if (params.gain !== undefined) {
        filter.gain.value = Math.max(-40, Math.min(40, params.gain));
      }
    } catch (error) {
      console.warn(
        `Error setting matrix bandpass filter ${filterIndex} parameters:`,
        error
      );
    }
  }
}

// Create and export a single instance
const audioEngine = new AudioEngine();
export default audioEngine;
