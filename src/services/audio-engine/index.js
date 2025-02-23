import * as Tone from "tone";
import { OscillatorBank } from "./modules/OscillatorBank";
import { MatrixMixer } from "./modules/MatrixMixer";
import { SpatialDirector } from "./modules/SpatialDirector";
import { EnvelopeGenerator } from "./modules/EnvelopeGenerator";
import { FilterBank } from "./modules/FilterBank";

// Utility function for sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class AudioEngine {
  constructor() {
    this.initialized = false;

    // Create master volume
    this.masterVolume = new Tone.Volume(0);

    // Initialize all modules
    this.oscillators = new OscillatorBank();
    this.matrixMixer = new MatrixMixer();
    this.spatialDirector = new SpatialDirector();
    this.envelopes = new EnvelopeGenerator();
    this.filters = new FilterBank();

    // Create frequency shifter
    this.freqShifter = new Tone.FrequencyShifter({
      frequency: 0,
      wet: 1,
    });

    // Create noise source
    this.noise = new Tone.Noise({
      type: "white",
      volume: -24,
    });
    this.noiseVCA = new Tone.Gain(0.3);
    this.noiseFilter = new Tone.Filter({
      type: "bandpass",
      frequency: 2000,
      Q: 3,
    });
  }

  async initialize() {
    if (this.initialized) return this;

    try {
      await Tone.start();
      await Tone.context.resume();
      await sleep(100);

      // Connect master volume to destination
      this.masterVolume.toDestination();

      // Get quad outputs from spatial director
      const quadOutputs = this.spatialDirector.getOutputs();

      // Connect quad outputs to master volume
      Object.values(quadOutputs).forEach((output) => {
        output.connect(this.masterVolume);
      });

      // Connect oscillators to matrix mixer inputs
      const matrixInputs = this.matrixMixer.getInputs();
      this.oscillators.connect(matrixInputs.slice(0, 2));

      // Connect noise path
      this.noise.start();
      this.noise
        .connect(this.noiseFilter)
        .connect(this.noiseVCA)
        .connect(matrixInputs[2]);

      // Connect matrix outputs to spatial director inputs
      const matrixOutputs = this.matrixMixer.getOutputs();
      const spatialInputs = this.spatialDirector.getInputs();

      // Ensure we have matching number of connections
      const connectionCount = Math.min(
        matrixOutputs.length,
        spatialInputs.length
      );

      for (let i = 0; i < connectionCount; i++) {
        if (matrixOutputs[i] && spatialInputs[i]) {
          matrixOutputs[i].connect(spatialInputs[i]);
        }
      }

      // Connect envelopes to filters
      for (let i = 0; i < 2; i++) {
        const envOutput = this.envelopes.getOutput(i);
        if (envOutput) {
          this.filters.connectEnvelope(i, envOutput);
        }
      }

      // Set initial spatial positions
      for (let i = 0; i < 4; i++) {
        this.spatialDirector.setPosition(i, 0, 0); // Center all channels initially
      }

      this.initialized = true;
      console.log("Audio engine initialized with modular Buchla configuration");
      return this;
    } catch (error) {
      console.error("Failed to initialize audio engine:", error);
      throw error;
    }
  }

  // Proxy methods to respective modules
  setOscillatorParams(oscNumber, params) {
    this.oscillators.setParams(oscNumber, params);
  }

  setMixerPoint(inputIdx, outputIdx, level) {
    this.matrixMixer.setCrosspoint(inputIdx, outputIdx, level);
  }

  setSpatialPosition(channel, x, y) {
    if (!this.initialized || !this.spatialDirector) {
      console.warn("Cannot set spatial position before initialization");
      return;
    }

    try {
      // Ensure values are numbers and within range
      const safeX = Math.max(-1, Math.min(1, Number(x) || 0));
      const safeY = Math.max(-1, Math.min(1, Number(y) || 0));

      this.spatialDirector.setPosition(channel, safeX, safeY);
    } catch (error) {
      console.warn(
        `Error setting spatial position for channel ${channel}:`,
        error
      );
    }
  }

  // Get current spatial position
  getSpatialPosition(channel) {
    if (!this.initialized || !this.spatialDirector) {
      return { x: 0, y: 0 };
    }
    return this.spatialDirector.getPosition(channel);
  }

  setEnvelope(channel, params) {
    this.envelopes.setEnvelope(channel, params);
  }

  triggerEnvelope(channel, time, params) {
    this.envelopes.triggerEnvelope(channel, time, params);
  }

  setFilter(index, params) {
    this.filters.setFilter(index, params);
  }

  setFrequencyShift(amount) {
    if (this.freqShifter) {
      this.freqShifter.frequency.value = amount;
    }
  }

  setNoiseParams(params) {
    if (!this.initialized) return;

    try {
      if (params.volume !== undefined && this.noiseVCA) {
        this.noiseVCA.gain.value = Math.max(0, Math.min(1, params.volume));
      }
      if (params.filterFreq !== undefined && this.noiseFilter) {
        this.noiseFilter.frequency.value = Math.max(
          20,
          Math.min(20000, params.filterFreq)
        );
      }
      if (params.filterQ !== undefined && this.noiseFilter) {
        this.noiseFilter.Q.value = Math.max(0.1, Math.min(10, params.filterQ));
      }
    } catch (error) {
      console.warn("Error setting noise parameters:", error);
    }
  }

  // Master volume control
  setMasterVolume(value, rampTime = 0.1) {
    const safeValue = Math.max(0, Math.min(1, Number(value) || 0));
    const db =
      safeValue === 0 ? -60 : Math.max(-60, 20 * Math.log10(safeValue));
    const safeRampTime = Math.max(0, Number(rampTime) || 0.1);

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

  setEnvelopeLFO(channel, enabled, rate = 1) {
    if (!this.initialized) return;
    const env = this.envelopes.getOutput(channel);
    if (!env) return;

    if (enabled) {
      // Calculate LFO rate based on envelope times
      const totalTime = env.attack + env.decay;
      const loopTime = totalTime / rate;

      // Schedule the loop
      Tone.Transport.scheduleRepeat((time) => {
        if (enabled) {
          this.envelopes.triggerEnvelope(channel, time);
        }
      }, loopTime);
    }
  }

  // Clean up
  dispose() {
    this.oscillators.dispose();
    this.matrixMixer.dispose();
    this.spatialDirector.dispose();
    this.envelopes.dispose();
    this.filters.dispose();

    if (this.freqShifter) this.freqShifter.dispose();
    if (this.noise) this.noise.dispose();
    if (this.noiseVCA) this.noiseVCA.dispose();
    if (this.noiseFilter) this.noiseFilter.dispose();
    if (this.masterVolume) this.masterVolume.dispose();
  }
}

// Create and export a single instance
const audioEngine = new AudioEngine();
export default audioEngine;
