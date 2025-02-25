import ToneService from "./ToneService";
const Tone = ToneService.getTone();

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
      threshold: -24, // Lower threshold for earlier compression
      ratio: 4, // Slightly higher ratio for more control
      attack: 0.003, // Faster attack to catch transients
      release: 0.25, // Quicker release
      knee: 12, // Softer knee for smoother compression
    });

    this.masterLimiter = new Tone.Limiter({
      threshold: -3, // Lower threshold to catch peaks
    });

    this.masterVolume = new Tone.Volume(-6); // Start at -6dB for headroom

    // Create quad outputs with reduced gain
    this.quadOutputs = {
      frontLeft: new Tone.Gain(0.7),
      frontRight: new Tone.Gain(0.7),
      rearLeft: new Tone.Gain(0.7),
      rearRight: new Tone.Gain(0.7),
    };

    // Create oscillators and basic components with lower initial volumes
    this.osc1 = new Tone.Oscillator({
      type: "sine",
      frequency: 440,
      volume: -24, // Lower initial volume
    });

    this.osc2 = new Tone.Oscillator({
      type: "triangle",
      frequency: 440,
      volume: -24, // Lower initial volume
    });

    this.osc3 = new Tone.Oscillator({
      type: "sine",
      frequency: 440,
      volume: -24, // Lower initial volume
    });

    this.noise = new Tone.Noise({
      type: "pink",
      volume: -30, // Even lower volume for noise
    });

    // Create filters with musical default frequencies
    this.bandpassFilters = Array(3)
      .fill()
      .map(
        (_, i) =>
          new Tone.Filter({
            type: "bandpass",
            frequency: [800, 1200, 2000][i], // Different frequencies for each oscillator
            Q: 1.5, // Reduced from 2 to 1.5 for less resonant peaks
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
            Q: 1.0, // Reduced from 1.5 to 1.0 for gentler resonance
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

      // Apply any pending envelope LFO settings now that transport is started
      this.applyPendingEnvelopeLFOs();
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

        // Update frequency if provided, default to A4 (440Hz)
        if (params.frequency !== undefined) {
          osc.frequency.value = Math.max(20, Math.min(20000, params.frequency));
        } else {
          osc.frequency.value = 440; // Default to A4
        }

        // Handle wave morphing based on waveShape value (0-1)
        if (params.waveShape !== undefined) {
          const waveShape = params.waveShape;

          // Set basic waveform type
          if (waveShape === 0) {
            osc.type = "sawtooth";
          } else if (waveShape === 0.5) {
            osc.type = "square"; // Using square for pulse wave
          } else if (waveShape === 1) {
            osc.type = "triangle";
          } else {
            // For in-between values, use the closest waveform and apply wave shaping
            if (waveShape < 0.5) {
              osc.type = "sawtooth";
              // Apply wave shaping to morph towards pulse
              const morphAmount = waveShape * 2; // 0->1 for saw->pulse
              this.setWaveShaping(oscNumber, "sawtooth-to-pulse", morphAmount);
            } else {
              osc.type = "square";
              // Apply wave shaping to morph towards triangle
              const morphAmount = (waveShape - 0.5) * 2; // 0->1 for pulse->triangle
              this.setWaveShaping(oscNumber, "pulse-to-triangle", morphAmount);
            }
          }

          // Apply wave folding for additional timbral shaping
          this.setWaveFold(oscNumber, waveShape);
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
        const normalizedAmount = amount * 10; // Scale to 0-10 range
        let shapeFunc;

        if (normalizedAmount < 5) {
          // Gentle sine folding for subtle harmonics
          const fold = 1 + normalizedAmount * 0.5;
          shapeFunc = (x) => Math.sin(x * Math.PI * fold);
        } else if (normalizedAmount < 8) {
          // Asymmetric folding for richer harmonics
          const fold = 1 + (normalizedAmount - 5) * 0.8;
          shapeFunc = (x) => {
            const folded = Math.sin(x * Math.PI * fold);
            return folded * Math.cos(x * Math.PI * 0.5) * 0.9;
          };
        } else {
          // Hard folding for aggressive timbres
          const fold = 1 + (normalizedAmount - 8);
          shapeFunc = (x) => {
            const folded = Math.sin(x * Math.PI * fold);
            const shaped = Math.sign(folded) * Math.pow(Math.abs(folded), 0.7);
            return shaped * 0.9;
          };
        }

        // Schedule the wave folder update
        const now = Tone.now();
        const folder = this.waveFolders[oscNumber - 1];
        if (folder) {
          folder.curve = new Float32Array(1024).map((_, i) => {
            const x = i / 512 - 1;
            return shapeFunc(x);
          });
        }
      }
    } catch (error) {
      console.warn(
        `Error setting wave fold for oscillator ${oscNumber}:`,
        error
      );
    }
  }

  // New method to handle wave shaping for morphing
  setWaveShaping(oscNumber, morphType, amount) {
    if (!this.initialized) return;

    try {
      const folder = this.waveFolders[oscNumber - 1];
      if (!folder) return;

      let shapeFunc;
      const PI = Math.PI;

      switch (morphType) {
        case "sawtooth-to-pulse":
          // Morph from sawtooth to pulse by gradually squaring the waveform
          shapeFunc = (x) => {
            // Start with a sawtooth shape
            const saw = x;
            // Gradually transform towards pulse with smoother transition
            const shaped = Math.tanh(Math.sin(x * PI) * (1 + amount * 3));
            // Interpolate between sawtooth and shaped wave
            return saw * (1 - amount) + shaped * amount;
          };
          break;

        case "pulse-to-triangle":
          // Morph from pulse to triangle by smoothing the edges
          shapeFunc = (x) => {
            // Start with a pulse shape
            const pulse = Math.tanh(Math.sin(x * PI) * 5); // Smoother pulse
            // Create a triangle shape
            const tri = Math.asin(Math.sin(x * PI)) / (PI / 2);
            // Interpolate between pulse and triangle with smoothing
            return pulse * (1 - amount) + tri * amount;
          };
          break;

        default:
          // Default to identity function
          shapeFunc = (x) => x;
      }

      // Create lookup table for the wave shaping function
      folder.curve = new Float32Array(1024).map((_, i) => {
        const x = i / 512 - 1;
        return shapeFunc(x);
      });
    } catch (error) {
      console.warn(
        `Error setting wave shaping for oscillator ${oscNumber}:`,
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

        // Store the rate for later use if transport isn't started yet
        envSystem.pendingLfoRate = rate;

        // If Tone.Transport isn't ready, just save the state for later
        if (!Tone.Transport) {
          console.warn(
            `Envelope ${channel} loop state set to ${enabled}, but Tone.Transport not available.`
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

          // If transport is stopped, we'll apply this when transport starts
          if (Tone.Transport.state === "stopped") {
            console.log(
              `Envelope ${channel} loop state set to ${enabled}, will be applied when transport starts.`
            );
          }
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

  // Add a method to apply pending envelope LFO settings when transport starts
  applyPendingEnvelopeLFOs() {
    if (!this.envelopes) return;

    this.envelopes.forEach((envSystem, channel) => {
      if (envSystem.isLooping && envSystem.pendingLfoRate) {
        console.log(`Applying pending LFO settings for envelope ${channel}`);
        // Re-apply the LFO settings now that transport is started
        this.setEnvelopeLFO(channel, true, envSystem.pendingLfoRate);
      }
    });
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
      // Start Tone.js
      await Tone.start();
      console.log("Tone.js started successfully");

      // Initialize components
      await this.initializeComponents();
      console.log("Components initialized successfully");

      // Reinitialize master effects to ensure they're properly created
      this.masterLimiter = new Tone.Limiter({
        threshold: -3,
      });

      // Ensure master volume is created
      if (!this.masterVolume) {
        this.masterVolume = new Tone.Volume(-6);
        console.log("Created master volume");
      }

      // Connect master chain
      this.connectMasterChain();

      // Apply limiter and compressor settings with a small delay to ensure connections are established
      setTimeout(() => {
        try {
          // Apply limiter settings for better volume control
          this.setLimiterSettings();

          // Apply compressor settings
          this.setCompressorSettings();

          // Set initial master volume to a reasonable level
          this.masterVolume.volume.value = -6; // -6dB is unity gain
        } catch (error) {
          console.error("Error applying audio settings:", error);
        }
      }, 100);

      // Initialize LPG modes
      this.initializeLPGModes();

      // Initialize envelope behaviors
      this.initializeEnvelopeBehaviors();

      this.initialized = true;
      console.log("Audio engine initialization complete");
    } catch (error) {
      console.error("Failed to initialize audio engine:", error);
      throw error;
    }
  }

  async initializeComponents() {
    try {
      // Initialize LPGs with more stable filter settings
      for (let i = 0; i < 4; i++) {
        const lpg = this.lpgs[i];
        const offset = this.globalEnvelope.offsets[i];

        lpg.vactrol = new Tone.Follower({
          smoothing: 0.1, // Slower response time for stability
          minValue: 0,
          maxValue: 1,
        });

        lpg.vca = new Tone.Gain(0); // Start closed

        lpg.filter = new Tone.Filter({
          frequency: 200, // Start at a safe frequency
          type: "lowpass",
          rolloff: -12, // Less steep slope for stability
          Q: 0.5, // Lower Q for stability
        });

        lpg.envelope = new Tone.Envelope({
          attack: Math.max(0.01, this.globalEnvelope.rise * offset),
          decay: Math.max(0.01, this.globalEnvelope.fall * offset),
          sustain: this.globalEnvelope.level * offset,
          release: Math.max(0.01, this.globalEnvelope.fall * offset),
          attackCurve: "exponential",
          releaseCurve: "exponential",
        });

        // Initialize LFOs for LPG C & D (indices 2 and 3)
        if (i >= 2) {
          lpg.lfo = new Tone.LFO({
            frequency: 1,
            min: 0,
            max: 1,
            type: "sine",
          });

          // Ensure LFO is properly initialized but not started
          // This will prevent the InvalidAccessError when disconnecting
          try {
            // Start and immediately stop to initialize internal state
            lpg.lfo.start();
            lpg.lfo.stop();
          } catch (error) {
            console.debug("LFO initialization sequence:", error);
          }
        }

        // Initialize wave folders with safe settings
        this.waveFolders[i] = new Tone.WaveShaper({
          curve: new Float32Array(1024).fill(0),
          oversample: "2x",
        });

        // Connect components with smoother parameter changes
        lpg.envelope.connect(lpg.vactrol);
        lpg.vactrol.connect(lpg.vca.gain);

        // Scale envelope to filter frequency (200Hz - 8kHz for stability)
        const filterScale = new Tone.Scale(200, 8000);
        lpg.vactrol.connect(filterScale);
        filterScale.connect(lpg.filter.frequency);

        lpg.filter.connect(lpg.vca);
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
    try {
      // Ensure master effects are initialized
      if (!this.masterCompressor) {
        console.warn("Master compressor not initialized, creating a new one");
        this.masterCompressor = new Tone.Compressor({
          threshold: -24,
          ratio: 4,
          attack: 0.003,
          release: 0.25,
          knee: 12,
        });
      }

      if (!this.masterLimiter) {
        console.warn("Master limiter not initialized, creating a new one");
        this.masterLimiter = new Tone.Limiter({
          threshold: -3,
        });
      }

      // Connect quad outputs to master chain
      Object.values(this.quadOutputs).forEach((output) => {
        output.connect(this.masterCompressor);
      });

      // Connect master effects chain
      this.masterCompressor.connect(this.masterLimiter);
      this.masterLimiter.connect(this.masterVolume);
      this.masterVolume.toDestination();

      console.log("Master chain connected successfully");
    } catch (error) {
      console.error("Failed to connect master chain:", error);
    }
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

  // Add method to mute/unmute audio without stopping oscillators
  setMuted(muted, fadeTime = 0.1) {
    if (!this.initialized) {
      console.warn("Cannot set muted state: Audio engine not initialized");
      return;
    }

    try {
      // Ensure oscillators are running
      this.ensureOscillatorsStarted();

      // Store the current volume value before muting if not already stored
      if (muted && this._previousVolume === undefined) {
        // If current volume is already -Infinity, store a reasonable default
        this._previousVolume =
          this.masterVolume.volume.value === -Infinity
            ? 0 // 0 dB is unity gain
            : this.masterVolume.volume.value;

        console.log(`Storing previous volume: ${this._previousVolume} dB`);
      }

      if (muted) {
        // Mute by setting volume to -Infinity (with optional fade)
        console.log(`Muting audio with fade time: ${fadeTime}s`);
        if (fadeTime > 0) {
          this.masterVolume.volume.rampTo(-Infinity, fadeTime);
        } else {
          this.masterVolume.volume.value = -Infinity;
        }
      } else if (this._previousVolume !== undefined) {
        // Restore previous volume (with optional fade)
        console.log(
          `Unmuting audio to ${this._previousVolume} dB with fade time: ${fadeTime}s`
        );
        if (fadeTime > 0) {
          this.masterVolume.volume.rampTo(this._previousVolume, fadeTime);
        } else {
          this.masterVolume.volume.value = this._previousVolume;
        }

        // Clear the stored volume if we're unmuting
        if (!muted) {
          this._previousVolume = undefined;
        }
      } else {
        // No previous volume stored, set to a reasonable default
        console.log("No previous volume stored, setting to 0 dB");
        if (fadeTime > 0) {
          this.masterVolume.volume.rampTo(0, fadeTime);
        } else {
          this.masterVolume.volume.value = 0;
        }
      }
    } catch (error) {
      console.error("Error setting mute state:", error);
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
    if (!this.masterCompressor) {
      console.warn("Master compressor not initialized");
      return;
    }

    try {
      // Check if the properties exist before setting them
      if (
        this.masterCompressor.threshold &&
        typeof this.masterCompressor.threshold.value !== "undefined"
      ) {
        this.masterCompressor.threshold.value = threshold;
      } else {
        console.warn("Master compressor threshold property not accessible");
      }

      if (
        this.masterCompressor.ratio &&
        typeof this.masterCompressor.ratio.value !== "undefined"
      ) {
        this.masterCompressor.ratio.value = ratio;
      } else {
        console.warn("Master compressor ratio property not accessible");
      }

      if (
        this.masterCompressor.attack &&
        typeof this.masterCompressor.attack.value !== "undefined"
      ) {
        this.masterCompressor.attack.value = attack;
      } else {
        console.warn("Master compressor attack property not accessible");
      }

      if (
        this.masterCompressor.release &&
        typeof this.masterCompressor.release.value !== "undefined"
      ) {
        this.masterCompressor.release.value = release;
      } else {
        console.warn("Master compressor release property not accessible");
      }

      if (
        this.masterCompressor.knee &&
        typeof this.masterCompressor.knee.value !== "undefined"
      ) {
        this.masterCompressor.knee.value = knee;
      } else {
        console.warn("Master compressor knee property not accessible");
      }
    } catch (error) {
      console.error("Error setting compressor settings:", error);
    }
  }

  // Add method to adjust limiter settings
  setLimiterSettings({ threshold = -3 } = {}) {
    if (!this.masterLimiter) {
      console.warn("Master limiter not initialized");
      return;
    }

    try {
      // Check if the threshold property exists before setting it
      if (
        this.masterLimiter.threshold &&
        typeof this.masterLimiter.threshold.value !== "undefined"
      ) {
        this.masterLimiter.threshold.value = threshold;
      } else {
        console.warn("Master limiter threshold property not accessible");
      }

      // Note: Tone.js Limiter doesn't expose a release property directly
      // It uses a fixed fast release internally as it's a wrapper around Compressor
      // If we need to control release, we would need to use a Compressor instead
    } catch (error) {
      console.error("Error setting limiter settings:", error);
    }
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
  async setLPGParams(index, { mode, level, modAmount } = {}) {
    // Validate index and initialization
    if (index === undefined || index < 0 || index >= 4) {
      console.warn(`Invalid LPG index: ${index}`);
      return false;
    }

    if (!this.initialized) {
      console.warn("Audio engine not initialized");
      return false;
    }

    if (!this.lpgs || !this.lpgs[index]) {
      console.warn(`LPG ${index} not available`);
      return false;
    }

    try {
      const lpg = this.lpgs[index];

      // Validate lpg components
      if (!lpg.vactrol || !lpg.vca || !lpg.filter) {
        console.warn(`LPG ${index} components not fully initialized`);
        return false;
      }

      // Batch parameter updates to minimize audio glitches
      const now = Tone.now();

      // Set LPG mode (vcf, vca, or both)
      if (mode !== undefined) {
        try {
          // Disconnect existing connections
          lpg.vactrol.disconnect();

          // Reconnect based on mode
          switch (mode) {
            case "vcf":
              // In VCF mode, envelope modulates only filter frequency, not VCA gain
              const filterScale = new Tone.Scale(20, 15000); // Full filter range
              lpg.vactrol.connect(filterScale);
              filterScale.connect(lpg.filter.frequency);

              // Set VCA to always pass signal at full level in VCF-only mode
              lpg.vca.gain.cancelScheduledValues(now);
              lpg.vca.gain.linearRampToValueAtTime(level || 0.7, now + 0.02);
              break;

            case "vca":
              // In VCA mode, envelope modulates only VCA gain, not filter frequency
              lpg.vactrol.connect(lpg.vca.gain);

              // Set filter to always pass signal with high cutoff in VCA-only mode
              lpg.filter.frequency.cancelScheduledValues(now);
              lpg.filter.frequency.linearRampToValueAtTime(20000, now + 0.02);

              // Ensure VCA gain is directly controlled by level parameter in VCA mode
              lpg.vca.gain.cancelScheduledValues(now);
              lpg.vca.gain.linearRampToValueAtTime(level || 0, now + 0.02);
              break;

            case "both":
            default:
              // In VCF+VCA mode, envelope modulates both filter frequency and VCA gain
              const combinedFilterScale = new Tone.Scale(20, 8000); // More controlled filter range
              lpg.vactrol.connect(combinedFilterScale);
              combinedFilterScale.connect(lpg.filter.frequency);
              lpg.vactrol.connect(lpg.vca.gain);

              // Apply level parameter to VCA gain in combined mode
              lpg.vca.gain.cancelScheduledValues(now);
              lpg.vca.gain.linearRampToValueAtTime(level || 0.5, now + 0.02);
              break;
          }
        } catch (error) {
          console.warn(`Error setting LPG ${index} mode:`, error);
        }
      }

      // Set VCA level with ramp
      if (level !== undefined && lpg.vca && lpg.vca.gain) {
        try {
          const gainValue = Math.max(0, Math.min(1, level));
          lpg.vca.gain.cancelScheduledValues(now);
          lpg.vca.gain.linearRampToValueAtTime(gainValue, now + 0.02);
        } catch (error) {
          console.warn(`Error setting LPG ${index} level:`, error);
        }
      }

      // Set modulation amount (affects filter resonance and envelope sensitivity)
      if (modAmount !== undefined) {
        try {
          // Adjust filter resonance based on modAmount
          const qValue = Math.max(0.1, Math.min(20, modAmount * 10));
          lpg.filter.Q.cancelScheduledValues(now);
          lpg.filter.Q.linearRampToValueAtTime(qValue, now + 0.02);

          // Adjust envelope sensitivity
          lpg.vactrol.smoothing = Math.max(0.01, 0.2 - modAmount * 0.15);
        } catch (error) {
          console.warn(`Error setting LPG ${index} modulation amount:`, error);
        }
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

      // For LPG A & B (indices 0 & 1), always trigger the envelope
      // For LPG C & D (indices 2 & 3), only trigger if not in looping mode

      // Check if this is LPG C or D and if it's in looping mode
      if (index >= 2 && lpg.lfo) {
        try {
          // Check if LFO is running - if so, skip triggering
          if (lpg.lfo.state === "started") {
            // Skip triggering if LPG is already in looping mode
            return;
          }
        } catch (error) {
          console.debug(`Error checking LPG ${index} LFO state:`, error);
          // Continue with triggering if we can't check LFO state
        }
      }

      if (lpg.envelope) {
        lpg.envelope.triggerAttackRelease(duration);
      }
    } catch (error) {
      console.warn(`Error triggering LPG ${index}:`, error);
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
      lpg.vca.gain.value = 0.7; // Default level instead of fixed 1
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

      // Set initial gain level
      lpg.vca.gain.value = 0.7; // Default level

      // In VCF+VCA mode, envelope modulates both filter frequency and VCA gain
      // Connect envelope to both filter and VCA
      const filterScale = new Tone.Scale(20, 8000); // More controlled filter range
      lpg.vactrol.disconnect();
      lpg.vactrol.connect(filterScale);
      filterScale.connect(lpg.filter.frequency);
      lpg.vactrol.connect(lpg.vca.gain);

      // Initialize LFO for independent looping (but don't start it yet)
      if (lpg.lfo) {
        try {
          // Ensure LFO is stopped initially
          if (lpg.lfo.state === "started") {
            lpg.lfo.stop();
          }

          // Configure LFO for smooth modulation
          lpg.lfo.type = "sine";
          lpg.lfo.min = 0;
          lpg.lfo.max = 1;
          lpg.lfo.frequency.value = 1; // Default 1Hz

          // Ensure LFO is not connected to anything initially
          lpg.lfo.disconnect();
        } catch (error) {
          console.debug(`LPG ${i} LFO initialization:`, error);
        }
      }
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

  // Add method to start/stop LPG LFO
  setLPGLFO(index, enabled, rate = 1) {
    // Validate index and initialization
    if (index === undefined || index < 0 || index >= 4) {
      console.warn(`Invalid LPG index: ${index}`);
      return false;
    }

    // Only LPG C & D (indices 2 & 3) can use independent looping
    if (index < 2) {
      console.warn(
        `LPG ${index} (A or B) does not support independent looping`
      );
      return false;
    }

    if (!this.initialized) {
      console.warn("Audio engine not initialized");
      return false;
    }

    if (!this.lpgs || !this.lpgs[index]) {
      console.warn(`LPG ${index} not available`);
      return false;
    }

    try {
      const lpg = this.lpgs[index];

      // Validate LFO component
      if (!lpg.lfo) {
        console.warn(`LPG ${index} LFO not initialized`);
        return false;
      }

      // Safely handle disconnection - don't try to disconnect if not connected
      try {
        // Instead of disconnecting everything, only disconnect from vactrol if connected
        // This avoids the InvalidAccessError
        if (lpg.lfo.state === "started") {
          lpg.lfo.disconnect(lpg.vactrol);
        }
      } catch (disconnectError) {
        // Silently handle disconnect errors - the LFO might not be connected yet
        console.debug(`Note: LPG ${index} LFO was not connected to disconnect`);
      }

      if (enabled) {
        // Clamp rate to reasonable values (0.1 to 20 Hz)
        const safeRate = Math.max(0.1, Math.min(20, rate || 1));

        try {
          // Set frequency with ramp to avoid clicks
          lpg.lfo.frequency.cancelScheduledValues(Tone.now());
          lpg.lfo.frequency.linearRampToValueAtTime(safeRate, Tone.now() + 0.1);

          // Connect LFO to vactrol for independent triggering
          lpg.lfo.connect(lpg.vactrol);

          // Start LFO if not already running
          if (lpg.lfo.state !== "started") {
            lpg.lfo.start();
          }
        } catch (lfoError) {
          console.warn(`Error starting LPG ${index} LFO:`, lfoError);
        }
      } else {
        try {
          // Stop LFO if running
          if (lpg.lfo.state === "started") {
            lpg.lfo.stop();
          }

          // We already safely disconnected above, no need to do it again
        } catch (lfoError) {
          console.warn(`Error stopping LPG ${index} LFO:`, lfoError);
        }
      }

      return true;
    } catch (error) {
      console.warn(`Error setting LPG ${index} LFO:`, error);
      return false;
    }
  }

  // Method to ensure all oscillators are started
  ensureOscillatorsStarted() {
    if (!this.initialized) {
      console.warn("Audio engine not initialized, cannot start oscillators");
      return false;
    }

    try {
      // Check and start each oscillator if not already running
      if (this.osc1 && this.osc1.state !== "started") {
        this.osc1.start();
        console.log("Started oscillator 1");
      }

      if (this.osc2 && this.osc2.state !== "started") {
        this.osc2.start();
        console.log("Started oscillator 2");
      }

      if (this.osc3 && this.osc3.state !== "started") {
        this.osc3.start();
        console.log("Started oscillator 3");
      }

      if (this.noise && this.noise.state !== "started") {
        this.noise.start();
        console.log("Started noise generator");
      }

      return true;
    } catch (error) {
      console.error("Error starting oscillators:", error);
      return false;
    }
  }

  // Debug method to help diagnose audio issues
  debugAudioState() {
    console.group("Audio Engine Debug Info");

    // Check initialization state
    console.log(`Initialized: ${this.initialized}`);

    // Check Tone.js context state
    console.log(`Tone.js context state: ${Tone.context.state}`);

    // Check Transport state
    console.log(`Transport state: ${Tone.Transport.state}`);

    // Check oscillator states
    console.log(
      `Oscillator 1 state: ${this.osc1 ? this.osc1.state : "not created"}`
    );
    console.log(
      `Oscillator 2 state: ${this.osc2 ? this.osc2.state : "not created"}`
    );
    console.log(
      `Oscillator 3 state: ${this.osc3 ? this.osc3.state : "not created"}`
    );
    console.log(
      `Noise state: ${this.noise ? this.noise.state : "not created"}`
    );

    // Check master volume
    console.log(
      `Master volume: ${
        this.masterVolume ? this.masterVolume.volume.value : "not created"
      } dB`
    );
    console.log(`Muted: ${this._previousVolume !== undefined}`);

    // Check envelope states
    if (this.envelopes) {
      this.envelopes.forEach((env, i) => {
        console.log(
          `Envelope ${i} looping: ${env.isLooping}, has loopId: ${!!env.loopId}`
        );
      });
    }

    console.groupEnd();

    return {
      initialized: this.initialized,
      contextState: Tone.context.state,
      transportState: Tone.Transport.state,
      oscillatorsRunning:
        this.osc1 &&
        this.osc1.state === "started" &&
        this.osc2 &&
        this.osc2.state === "started" &&
        this.osc3 &&
        this.osc3.state === "started" &&
        this.noise &&
        this.noise.state === "started",
      masterVolume: this.masterVolume ? this.masterVolume.volume.value : null,
      isMuted: this._previousVolume !== undefined,
    };
  }
}

// Create and export a single instance
const audioEngine = new AudioEngine();
export default audioEngine;
