import * as Tone from "tone";
import {
  OscillatorBank,
  MatrixMixer,
  SpatialDirector,
  EnvelopeGenerator,
  FilterBank,
  AFG248,
  LowPassGate,
  SourceOfUncertainty,
} from "./modules";

// Utility function for sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class AudioEngine {
  constructor() {
    this.initialized = false;
    this.modules = new Map();

    // Initialize core modules
    this.initializeModules();

    // Master output
    this.masterVolume = new Tone.Volume(0);
  }

  initializeModules() {
    // Sound Sources
    this.modules.set("osc1", new OscillatorBank(1));
    this.modules.set("osc2", new OscillatorBank(2));
    this.modules.set("osc3", new OscillatorBank(3));
    this.modules.set("noise", new SourceOfUncertainty());

    // Signal Processing
    this.modules.set("matrix", new MatrixMixer());
    this.modules.set("filter1", new FilterBank(291)); // Bandpass filter 1
    this.modules.set("filter2", new FilterBank(295)); // Bandpass filter 2

    // Modulation
    this.modules.set("envelopes", new EnvelopeGenerator());
    this.modules.set("lpg", new LowPassGate());

    // Control
    this.modules.set("afg", new AFG248());

    // Spatial
    this.modules.set("spatial", new SpatialDirector());
  }

  async initialize() {
    if (this.initialized) return this;

    try {
      await Tone.start();
      await Tone.context.resume();
      await sleep(100);

      // Connect master volume to destination
      this.masterVolume.toDestination();

      // Initialize signal flow
      this.setupSignalFlow();

      this.initialized = true;
      console.log("Buchla-style modular system initialized");
      return this;
    } catch (error) {
      console.error("Failed to initialize modular system:", error);
      throw error;
    }
  }

  setupSignalFlow() {
    // 1. Connect oscillators to matrix mixer
    const matrix = this.modules.get("matrix");
    ["osc1", "osc2", "osc3"].forEach((oscName, i) => {
      const osc = this.modules.get(oscName);
      matrix.connectInput(i, osc.output);
    });

    // 2. Connect noise to matrix
    matrix.connectInput(3, this.modules.get("noise").output);

    // 3. Matrix outputs to filters and LPGs
    const lpg = this.modules.get("lpg");
    const matrixOutputs = matrix.getOutputs();
    matrixOutputs.forEach((output, i) => {
      if (i < 2) {
        // First two outputs go through filters
        const filter = this.modules.get(`filter${i + 1}`);
        output.connect(filter.input);
        filter.output.connect(lpg.inputs[i]);
      } else {
        // Direct matrix to LPG connections
        output.connect(lpg.inputs[i]);
      }
    });

    // 4. Connect envelopes to LPGs
    const envelopes = this.modules.get("envelopes");
    envelopes.outputs.forEach((env, i) => {
      lpg.connectEnvelope(i, env);
    });

    // 5. LPGs to spatial director
    const spatial = this.modules.get("spatial");
    lpg.outputs.forEach((output, i) => {
      output.connect(spatial.inputs[i]);
    });

    // 6. Spatial director to master output
    Object.values(spatial.getOutputs()).forEach((output) => {
      output.connect(this.masterVolume);
    });
  }

  // Control methods
  setSequence(sequence) {
    if (!this.initialized) return;
    this.modules.get("afg").setSequence(sequence);
  }

  startPlayback(sequence) {
    if (!this.initialized || !sequence) return;

    this.stopPlayback();
    this.setToneShape(0.5, 0.5, 0.5);

    this.modules.get("afg").start(sequence);
  }

  stopPlayback() {
    if (!this.initialized) return;
    this.modules.get("afg").stop();
  }

  // Module control methods
  setOscillatorParams(oscNumber, params) {
    const osc = this.modules.get(`osc${oscNumber}`);
    if (osc) osc.setParams(params);
  }

  setMixerPoint(input, output, level) {
    this.modules.get("matrix").setCrosspoint(input, output, level);
  }

  setSpatialPosition(channel, x, y) {
    this.modules.get("spatial").setPosition(channel, x, y);
  }

  setEnvelope(channel, params) {
    this.modules.get("envelopes").setEnvelope(channel, params);
  }

  setToneShape(low, mid, high) {
    if (!this.initialized) return;
    this.modules.get("spatial").setToneShape(low, mid, high);
  }

  setMasterVolume(value, rampTime = 0.1) {
    if (!this.initialized) return;

    const safeValue = Math.max(0, Math.min(1, Number(value) || 0));
    const db =
      safeValue === 0 ? -60 : Math.max(-60, 20 * Math.log10(safeValue));

    if (db <= -55) {
      this.masterVolume.volume.linearRampToValueAtTime(
        -60,
        Tone.now() + rampTime
      );
    } else {
      this.masterVolume.volume.exponentialRampToValueAtTime(
        db,
        Tone.now() + rampTime
      );
    }
  }

  dispose() {
    this.modules.forEach((module) => module.dispose());
    this.masterVolume.dispose();
    this.initialized = false;
  }
}

// Create and export a single instance
const audioEngine = new AudioEngine();
export default audioEngine;
