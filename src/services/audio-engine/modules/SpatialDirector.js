import * as Tone from "tone";

export class SpatialDirector {
  constructor() {
    this.channels = 4;

    // Create input and output stages
    this.inputs = Array(this.channels)
      .fill()
      .map(() => new Tone.Gain(1));
    this.outputs = {
      frontLeft: new Tone.Gain(1),
      frontRight: new Tone.Gain(1),
      rearLeft: new Tone.Gain(1),
      rearRight: new Tone.Gain(1),
    };

    // Create quad panner for each input
    this.panners = this.inputs.map(() => ({
      x: new Tone.Signal(0),
      y: new Tone.Signal(0),
      frontLeft: new Tone.Gain(0.25),
      frontRight: new Tone.Gain(0.25),
      rearLeft: new Tone.Gain(0.25),
      rearRight: new Tone.Gain(0.25),
    }));

    // Create reverb
    this.reverb = new Tone.Reverb({
      decay: 2,
      preDelay: 0.01,
      wet: 0.2,
    }).generate();

    // Create tone shaping filters
    this.toneShaping = {
      low: new Tone.Filter({ type: "lowshelf", frequency: 200, gain: 0 }),
      mid: new Tone.Filter({ type: "peaking", frequency: 1000, Q: 1, gain: 0 }),
      high: new Tone.Filter({ type: "highshelf", frequency: 4000, gain: 0 }),
    };

    // Initialize connections
    this.initializeConnections();
  }

  initializeConnections() {
    // Connect each input to its quad panner
    this.inputs.forEach((input, i) => {
      const panner = this.panners[i];

      // Connect input to all four panner outputs
      input.connect(panner.frontLeft);
      input.connect(panner.frontRight);
      input.connect(panner.rearLeft);
      input.connect(panner.rearRight);

      // Connect panner outputs to main outputs through tone shaping
      Object.entries(panner).forEach(([key, gain]) => {
        if (gain instanceof Tone.Gain) {
          gain.chain(
            this.toneShaping.low,
            this.toneShaping.mid,
            this.toneShaping.high,
            this.reverb,
            this.outputs[key]
          );
        }
      });
    });
  }

  setPosition(channel, x, y) {
    if (channel < 0 || channel >= this.channels) return;

    try {
      const panner = this.panners[channel];

      // Normalize coordinates to -1 to 1
      x = Math.max(-1, Math.min(1, x));
      y = Math.max(-1, Math.min(1, y));

      // Update position signals
      panner.x.value = x;
      panner.y.value = y;

      // Calculate gains for each speaker
      const frontLeftGain = ((1 - x) * (1 + y)) / 4;
      const frontRightGain = ((1 + x) * (1 + y)) / 4;
      const rearLeftGain = ((1 - x) * (1 - y)) / 4;
      const rearRightGain = ((1 + x) * (1 - y)) / 4;

      // Apply gains
      panner.frontLeft.gain.value = frontLeftGain;
      panner.frontRight.gain.value = frontRightGain;
      panner.rearLeft.gain.value = rearLeftGain;
      panner.rearRight.gain.value = rearRightGain;
    } catch (error) {
      console.warn(`Error setting position for channel ${channel}:`, error);
    }
  }

  setToneShape(low, mid, high) {
    try {
      // Set filter gains (convert 0-1 to dB)
      this.toneShaping.low.gain.value = (low - 0.5) * 24; // ±12dB
      this.toneShaping.mid.gain.value = (mid - 0.5) * 24;
      this.toneShaping.high.gain.value = (high - 0.5) * 24;
    } catch (error) {
      console.warn("Error setting tone shape:", error);
    }
  }

  setReverb(params) {
    try {
      if (params.decay !== undefined) {
        this.reverb.decay = Math.max(0.1, Math.min(10, params.decay));
      }
      if (params.preDelay !== undefined) {
        this.reverb.preDelay = Math.max(0, Math.min(0.1, params.preDelay));
      }
      if (params.wet !== undefined) {
        this.reverb.wet.value = Math.max(0, Math.min(1, params.wet));
      }
    } catch (error) {
      console.warn("Error setting reverb parameters:", error);
    }
  }

  getOutputs() {
    return this.outputs;
  }

  dispose() {
    // Dispose all Tone.js nodes
    [...this.inputs, ...Object.values(this.outputs)].forEach((node) => {
      node.dispose();
    });

    this.panners.forEach((panner) => {
      Object.values(panner).forEach((node) => {
        if (node && typeof node.dispose === "function") {
          node.dispose();
        }
      });
    });

    this.reverb.dispose();
    Object.values(this.toneShaping).forEach((filter) => filter.dispose());
  }
}
