import * as Tone from "tone";

export class SourceOfUncertainty {
  constructor() {
    // Noise source
    this.noise = new Tone.Noise({
      type: "white",
      volume: -24,
    }).start();

    // Noise processing
    this.noiseVCA = new Tone.Gain(0.3);
    this.noiseFilter = new Tone.Filter({
      type: "bandpass",
      frequency: 2000,
      Q: 3,
    });

    // Random voltage generators
    this.randomGate = new Tone.Signal(0);
    this.randomCV = new Tone.Signal(0);
    this.smoothCV = new Tone.Signal(0);

    // Slew limiter for smooth CV
    this.slewLimiter = new Tone.Filter({
      type: "lowpass",
      frequency: 10,
      Q: 0.7,
    });

    // Sample and hold for stepped CV
    this.sampleAndHold = {
      trigger: new Tone.Gain(0),
      value: new Tone.Signal(0),
    };

    // Output stage
    this.output = new Tone.Gain(1);

    // Initialize connections
    this.initializeConnections();

    // Start random generation
    this.startRandomGeneration();
  }

  initializeConnections() {
    // Noise path
    this.noise
      .connect(this.noiseFilter)
      .connect(this.noiseVCA)
      .connect(this.output);

    // Random CV path
    this.randomCV.connect(this.slewLimiter).connect(this.smoothCV);

    // Sample and hold path
    this.randomCV.connect(this.sampleAndHold.value);
  }

  startRandomGeneration() {
    // Generate random gates
    this.gateLoop = new Tone.Loop((time) => {
      const shouldTrigger = Math.random() < this.gatesProbability;
      this.randomGate.setValueAtTime(shouldTrigger ? 1 : 0, time);
      if (shouldTrigger) {
        this.randomGate.setValueAtTime(0, time + 0.01);
      }
    }, "8n").start(0);

    // Generate random CV
    this.cvLoop = new Tone.Loop((time) => {
      const newValue = (Math.random() * 2 - 1) * this.voltageRange;
      this.randomCV.setValueAtTime(newValue, time);
    }, "16n").start(0);
  }

  setNoiseParams(params) {
    try {
      if (params.volume !== undefined) {
        this.noiseVCA.gain.value = Math.max(0, Math.min(1, params.volume));
      }
      if (params.filterFreq !== undefined) {
        this.noiseFilter.frequency.value = Math.max(
          20,
          Math.min(20000, params.filterFreq)
        );
      }
      if (params.filterQ !== undefined) {
        this.noiseFilter.Q.value = Math.max(0.1, Math.min(10, params.filterQ));
      }
    } catch (error) {
      console.warn("Error setting noise parameters:", error);
    }
  }

  setRandomGates(rate, probability) {
    this.gatesProbability = Math.max(0, Math.min(1, probability));
    if (this.gateLoop) {
      this.gateLoop.interval = 60 / rate;
    }
  }

  setRandomVoltages(range, slew) {
    this.voltageRange = Math.max(0, Math.min(1, range));
    if (this.slewLimiter) {
      this.slewLimiter.frequency.value = Math.max(0.1, Math.min(100, 1 / slew));
    }
  }

  triggerSampleAndHold() {
    const currentValue = this.randomCV.value;
    this.sampleAndHold.value.setValueAtTime(currentValue, Tone.now());
  }

  dispose() {
    // Stop loops
    if (this.gateLoop) this.gateLoop.dispose();
    if (this.cvLoop) this.cvLoop.dispose();

    // Dispose all Tone.js nodes
    [
      this.noise,
      this.noiseVCA,
      this.noiseFilter,
      this.randomGate,
      this.randomCV,
      this.smoothCV,
      this.slewLimiter,
      this.sampleAndHold.trigger,
      this.sampleAndHold.value,
      this.output,
    ].forEach((node) => {
      if (node && typeof node.dispose === "function") {
        node.dispose();
      }
    });
  }
}
