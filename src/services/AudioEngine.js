import * as Tone from "tone";

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
    // Add clock system before other components
    this.clockSystem = {
      // Master clock source (frequency in Hz for 120 BPM quarter notes)
      master: new Tone.Clock(),

      // Clock divisions (whole, half, quarter, eighth, sixteenth)
      divisions: {
        "1n": new Tone.Signal(0),
        "2n": new Tone.Signal(0),
        "4n": new Tone.Signal(0),
        "8n": new Tone.Signal(0),
        "16n": new Tone.Signal(0),
      },

      // Division counters
      counters: {
        "1n": 0,
        "2n": 0,
        "4n": 0,
        "8n": 0,
        "16n": 0,
      },

      // Distribution buses
      buses: Array(4)
        .fill()
        .map(() => new Tone.Signal(0)),
    };

    // Initialize clock processing
    this.initializeClockSystem();

    // Create quad outputs first (Front L/R, Rear L/R)
    this.quadOutputs = {
      frontLeft: new Tone.Gain().toDestination(),
      frontRight: new Tone.Gain().toDestination(),
      rearLeft: new Tone.Gain().toDestination(),
      rearRight: new Tone.Gain().toDestination(),
    };

    // Spatial director (227) - one per mixer output
    this.spatialDirectors = Array(4)
      .fill()
      .map(() => {
        // Create all nodes first
        const director = {
          panner: new Tone.Panner(0),
          reverb: new Tone.Reverb({
            decay: 2,
            wet: 0.2,
            preDelay: 0.01,
          }),
          frontGain: new Tone.Gain(0.7),
          rearGain: new Tone.Gain(0.3),
          outputs: {
            fl: new Tone.Gain(),
            fr: new Tone.Gain(),
            rl: new Tone.Gain(),
            rr: new Tone.Gain(),
          },
        };

        // Wait for reverb to initialize
        director.reverb.generate().then(() => {
          // Connect the spatial routing
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
        });

        return director;
      });

    // Create all audio components first
    // Wave folders and shapers for each oscillator
    this.waveFolders = Array(3)
      .fill()
      .map(
        () =>
          new Tone.WaveShaper((x) => {
            // Buchla-style wave folding
            const fold = 2;
            return Math.sin(x * Math.PI * fold);
          })
      );

    // Dual band pass filters (one per oscillator)
    this.bandpassFilters = Array(3)
      .fill()
      .map(
        () =>
          new Tone.Filter({
            type: "bandpass",
            frequency: 1000,
            Q: 1,
          })
      );

    // Tone shaper (simplified 10-channel cam filter using EQ)
    this.toneShaper = new Tone.EQ3({
      low: 0,
      mid: 0,
      high: 0,
      lowFrequency: 200,
      highFrequency: 2000,
    });

    // Frequency Shifter implementation (Buchla 285)
    this.freqShifter = new Tone.FrequencyShifter({
      frequency: 0,
      wet: 1,
    });

    // Primary oscillators
    this.osc1 = new Tone.Oscillator({
      type: "sine",
      frequency: 440,
    });

    this.osc2 = new Tone.Oscillator({
      type: "sine",
      frequency: 440,
    });

    this.osc3 = new Tone.Oscillator({
      type: "sine",
      frequency: 440,
    });

    // Noise source
    this.noise = new Tone.Noise({
      type: "white",
      volume: -10,
    });

    // Create Low Pass Gates (LPGs) - Buchla style
    this.lpgs = Array(4)
      .fill()
      .map(() => {
        const lpg = {
          vactrol: new Tone.Follower(0.1),
          filter: new Tone.Filter({
            type: "lowpass",
            frequency: 2000,
            Q: 0.5,
            rolloff: -24,
          }),
          vca: new Tone.Gain(0), // Start closed
          response: new Tone.WaveShaper((x) => {
            return Math.pow(Math.max(0, x), 1.5); // More dramatic curve
          }),
          input: new Tone.Gain(1), // Input stage
          output: new Tone.Gain(1), // Output stage
        };

        // Proper signal flow within LPG
        lpg.input.connect(lpg.filter);
        lpg.filter.connect(lpg.vca);
        lpg.vca.connect(lpg.output);

        return lpg;
      });

    // Create a proper 4x4 matrix mixer with direct connections
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

    // Connect matrix crosspoints properly
    this.matrixMixer.inputs.forEach((input, i) => {
      this.matrixMixer.outputs.forEach((output, j) => {
        // Connect input to crosspoint
        input.connect(this.matrixMixer.matrix[i][j]);
        // Connect crosspoint to output
        this.matrixMixer.matrix[i][j].connect(this.matrixMixer.outputs[j]);
      });
    });

    // Connect matrix outputs to spatial directors
    this.matrixMixer.outputs.forEach((output, i) => {
      output.connect(this.spatialDirectors[i].panner);
    });

    // Now connect all the signal chains
    // Connect oscillator chains to use new LPG structure
    this.osc1.chain(
      this.waveFolders[0],
      this.bandpassFilters[0],
      this.lpgs[0].input,
      this.lpgs[0].output,
      this.matrixMixer.inputs[0]
    );

    this.osc2.chain(
      this.waveFolders[1],
      this.bandpassFilters[1],
      this.lpgs[1].input,
      this.lpgs[1].output,
      this.matrixMixer.inputs[1]
    );

    this.osc3.chain(
      this.waveFolders[2],
      this.freqShifter,
      this.bandpassFilters[2],
      this.lpgs[2].input,
      this.lpgs[2].output,
      this.matrixMixer.inputs[2]
    );

    // Connect noise chain
    this.noise.chain(
      this.toneShaper,
      this.lpgs[3].input,
      this.lpgs[3].output,
      this.matrixMixer.inputs[3]
    );

    // Set default mixer settings
    for (let i = 0; i < 4; i++) {
      this.setMixerPoint(i, i, 0.7); // Diagonal connections at 70%
    }

    // Initialize sequences array
    this.activeSequences = [];

    // Random voltage source (source of uncertainty)
    this.randomSource = new Tone.Noise("pink").start();
    this.randomSampleHold = new Tone.Follower(0.1);
    this.randomSource.connect(this.randomSampleHold);

    // Multi-Arbitrary Function Generator (248)
    this.afg = {
      // 16 steps with CV and trigger values
      steps: Array(16)
        .fill()
        .map(() => new AFG248Step()),

      // Two independent playheads
      playheads: [new AFG248PlayHead(), new AFG248PlayHead()],

      // Four external CV inputs
      externalInputs: Array(4)
        .fill()
        .map(() => new Tone.Signal(0)),

      // Clock input for each playhead
      clockInputs: Array(2)
        .fill()
        .map(() => new Tone.Signal(0)),

      // Manual CV address input
      addressCV: new Tone.Signal(0),

      // Strobe input for sampling address CV
      strobeInput: new Tone.Signal(0),
    };

    // Initialize AFG processing
    this.initializeAFG();

    // Create envelope generators (Buchla 284-style) with proper timing
    this.envelopes = Array(4)
      .fill()
      .map(() => {
        const env = new Tone.Envelope({
          attack: 0.01, // Faster attack
          decay: 0.2,
          sustain: 0.5,
          release: 0.5,
          attackCurve: "exponential",
          releaseCurve: "exponential",
        });

        // Add offset capability with initial values
        const offset = new Tone.Add(0.2); // Small positive offset
        const multiply = new Tone.Multiply(1);

        env.chain(offset, multiply);

        return {
          envelope: env,
          offset: offset,
          multiply: multiply,
          isLooping: false,
          timeScale: 1,
        };
      });

    // Connect envelopes to LPGs with proper gain staging
    this.envelopes.forEach((envSystem, i) => {
      const lpg = this.lpgs[i];

      // Connect envelope through vactrol simulation
      envSystem.envelope.chain(
        envSystem.offset,
        envSystem.multiply,
        lpg.vactrol
      );

      // Connect vactrol to response shaper
      lpg.vactrol.connect(lpg.response);

      // Create proper scaling for filter and VCA
      const freqScale = new Tone.Scale(20, 8000); // Wider frequency range
      const gainScale = new Tone.Scale(0, 1);

      lpg.response.connect(freqScale);
      lpg.response.connect(gainScale);

      freqScale.connect(lpg.filter.frequency);
      gainScale.connect(lpg.vca.gain);
    });
  }

  initializeClockSystem() {
    // Set initial tempo (2Hz = 120 BPM)
    this.clockSystem.master.frequency.value = 2;

    // Create the clock tick callback
    this.clockTick = (time) => {
      // Update counters
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
              this.clockSystem.divisions["1n"].setValueAtTime(
                this.clockSystem.counters["1n"],
                time
              );
            }
            this.clockSystem.divisions["2n"].setValueAtTime(
              this.clockSystem.counters["2n"],
              time
            );
          }
          this.clockSystem.divisions["4n"].setValueAtTime(
            this.clockSystem.counters["4n"],
            time
          );
        }
        this.clockSystem.divisions["8n"].setValueAtTime(
          this.clockSystem.counters["8n"],
          time
        );
      }
      this.clockSystem.divisions["16n"].setValueAtTime(
        this.clockSystem.counters["16n"] > 0 ? 1 : 0,
        time
      );

      // Distribute clock pulses
      this.distributeClockPulse(time);
    };

    // Set the callback after it's created
    this.clockSystem.master.callback = this.clockTick;
  }

  distributeClockPulse(time) {
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
      if (values.cv !== undefined) step.cv.value = values.cv;
      if (values.trigger !== undefined) step.trigger.value = values.trigger;
      if (values.duration !== undefined) step.stepDuration = values.duration;
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
      : step.cv.value;

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
  triggerEnvelope(channel, time = "+0.05") {
    if (channel >= 0 && channel < 4) {
      const envSystem = this.envelopes[channel];
      const duration =
        (envSystem.envelope.attack + envSystem.envelope.decay) *
        envSystem.timeScale;

      // Trigger with timing consideration
      envSystem.envelope.triggerAttackRelease(duration, time);
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
    if (!sequence || sequence.length === 0) return;

    // Stop any existing playback
    this.stopPlayback();

    // Start all sound sources
    this.osc1.start();
    this.osc2.start();
    this.osc3.start();
    this.noise.start();

    const channels = sequence.length;

    for (let i = 0; i < channels; i++) {
      // Create a Tone.Sequence for each channel
      const seq = new Tone.Sequence(
        (time, note) => {
          // Route through matrix mixer
          switch (i) {
            case 0:
              this.osc1.frequency.setValueAtTime(
                Tone.Frequency(note, "midi"),
                time
              );
              this.triggerEnvelope(0, time);
              break;
            case 1:
              this.osc2.frequency.setValueAtTime(
                Tone.Frequency(note, "midi"),
                time
              );
              this.triggerEnvelope(1, time);
              break;
            case 2:
              this.osc3.frequency.setValueAtTime(
                Tone.Frequency(note, "midi"),
                time
              );
              this.triggerEnvelope(2, time);
              break;
            case 3:
              // For noise channel, we'll just modulate the volume based on the note value
              const volume = (note / 127) * 10 - 20; // Convert MIDI to dB range -20 to -10
              this.noise.volume.setValueAtTime(volume, time);
              this.triggerEnvelope(3, time);
              break;
          }
        },
        sequence[i],
        "8n"
      );

      seq.loop = true;
      this.activeSequences.push(seq);
      seq.start(0);
    }

    // Start the transport if it's not already running
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
    // Start audio context
    await Tone.start();

    // Set initial volume
    Tone.Destination.volume.value = -12; // Start at a safe level

    // Initialize all components
    await Promise.all(
      this.spatialDirectors.map((director) => director.reverb.generate())
    );

    // Set default spatial positions
    for (let i = 0; i < 4; i++) {
      this.setSpatialPosition(i, i % 2 ? 0.5 : -0.5, i < 2 ? -0.5 : 0.5);
    }

    // Ensure clock system is ready
    this.clockSystem.master.frequency.value = 2; // 120 BPM

    // Initialize AFG
    this.afg.steps.forEach((step, i) => {
      step.cv.value = 0;
      step.trigger.value = 0;
      step.stepDuration = 0.25;
    });

    return this;
  }

  // Test direct signal path
  async testDirectPath() {
    await this.initialize();

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
      await Tone.sleep(1);

      // Test osc2
      this.osc2.frequency.value = 554.37;
      await Tone.sleep(1);

      // Test osc3
      this.osc3.frequency.value = 659.25;
      await Tone.sleep(1);

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
        this.freqShifter,
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
    await this.initialize();

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

      console.log(`Updated oscillator ${oscNumber} params:`, params);
    }
  }
}

// Create and export a single instance
const audioEngine = new AudioEngine();
export default audioEngine;
