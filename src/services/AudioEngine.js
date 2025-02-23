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

    // Create mixer channels (4x4 matrix mixer)
    this.mixer = {
      inputs: Array(4)
        .fill()
        .map(() => new Tone.Gain(0.5)),
      outputs: Array(4)
        .fill()
        .map((_, i) => {
          const out = new Tone.Gain(0.5);
          // Only connect to panner initially, rest of chain connects when reverb is ready
          out.connect(this.spatialDirectors[i].panner);
          return out;
        }),
      matrix: Array(4)
        .fill()
        .map(() =>
          Array(4)
            .fill()
            .map(() => new Tone.Gain(0))
        ),
    };

    // Connect matrix crosspoints
    this.mixer.inputs.forEach((input, i) => {
      this.mixer.outputs.forEach((output, j) => {
        input.connect(this.mixer.matrix[i][j]);
        this.mixer.matrix[i][j].connect(output);
      });
    });

    // Create envelope generators (Buchla 284-style)
    this.envelopes = Array(4)
      .fill()
      .map(
        () =>
          new Tone.Envelope({
            attack: 0.1,
            decay: 0.2,
            sustain: 0.5,
            release: 0.8,
            attackCurve: "linear",
            releaseCurve: "exponential",
          })
      );

    // VCAs for envelope control
    this.vcas = Array(4)
      .fill()
      .map(() => new Tone.Gain(0));

    // Connect envelopes to their respective VCAs
    this.envelopes.forEach((env, i) => {
      env.connect(this.vcas[i].gain);
    });

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

    // Primary oscillators (first dual setup)
    this.osc1 = new Tone.Oscillator({
      type: "sine",
      frequency: 440,
    });
    // Route through wave folder and filter before VCA
    this.osc1.chain(this.waveFolders[0], this.bandpassFilters[0], this.vcas[0]);
    this.vcas[0].connect(this.mixer.inputs[0]);

    this.osc2 = new Tone.Oscillator({
      type: "sine",
      frequency: 440,
    });
    this.osc2.chain(this.waveFolders[1], this.bandpassFilters[1], this.vcas[1]);
    this.vcas[1].connect(this.mixer.inputs[1]);

    // Additional oscillator with frequency shifter
    this.osc3 = new Tone.Oscillator({
      type: "sine",
      frequency: 440,
    });

    // Frequency Shifter implementation (Buchla 285)
    this.freqShifter = new Tone.FrequencyShifter({
      frequency: 0,
      wet: 1,
    });

    // Route osc3 through wave folder, freq shifter, filter, then VCA
    this.osc3.chain(
      this.waveFolders[2],
      this.freqShifter,
      this.bandpassFilters[2],
      this.vcas[2]
    );
    this.vcas[2].connect(this.mixer.inputs[2]);

    // Noise generator with tone shaping
    this.noise = new Tone.Noise({
      type: "white",
      volume: -10,
    });
    this.noise.chain(this.toneShaper, this.vcas[3]);
    this.vcas[3].connect(this.mixer.inputs[3]);

    // Initialize sequences array
    this.activeSequences = [];

    // Default mixer settings - diagonal connections
    this.setMixerPoint(0, 0, 1);
    this.setMixerPoint(1, 1, 1);
    this.setMixerPoint(2, 2, 1);
    this.setMixerPoint(3, 3, 1);

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

  // Set envelope parameters for a specific channel
  setEnvelope(channel, params) {
    if (channel >= 0 && channel < 4 && this.envelopes[channel]) {
      Object.entries(params).forEach(([param, value]) => {
        this.envelopes[channel][param] = value;
      });
    }
  }

  // Enable envelope looping (LFO mode)
  setEnvelopeLFO(channel, enabled) {
    if (channel >= 0 && channel < 4 && this.envelopes[channel]) {
      this.envelopes[channel].loop = enabled;
    }
  }

  // Set a mixer crosspoint level (0-1)
  setMixerPoint(inputIdx, outputIdx, level) {
    if (inputIdx >= 0 && inputIdx < 4 && outputIdx >= 0 && outputIdx < 4) {
      this.mixer.matrix[inputIdx][outputIdx].gain.value = Math.max(
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

  // Trigger an envelope
  triggerEnvelope(channel, time = "+0.05") {
    if (channel >= 0 && channel < 4 && this.envelopes[channel]) {
      this.envelopes[channel].triggerAttackRelease("8n", time);
    }
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
}

// Create and export a single instance
const audioEngine = new AudioEngine();
export default audioEngine;
