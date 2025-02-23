import * as Tone from "tone";

export class LowPassGate {
  constructor() {
    this.channels = 4;

    // Create LPG components for each channel
    this.lpgs = Array(this.channels)
      .fill()
      .map(() => ({
        vca: new Tone.Gain(0),
        filter: new Tone.Filter({
          type: "lowpass",
          frequency: 20000,
          Q: 1,
        }),
        envelope: new Tone.Gain(0),
        response: 0.01, // Rise time in seconds
        level: 1,
      }));

    // Create inputs and outputs
    this.inputs = Array(this.channels)
      .fill()
      .map(() => new Tone.Gain(1));
    this.outputs = Array(this.channels)
      .fill()
      .map(() => new Tone.Gain(1));

    // Initialize connections
    this.initializeConnections();
  }

  initializeConnections() {
    this.lpgs.forEach((lpg, i) => {
      // Audio path
      this.inputs[i]
        .connect(lpg.filter)
        .connect(lpg.vca)
        .connect(this.outputs[i]);

      // Envelope control path
      lpg.envelope.connect(lpg.vca.gain);
      lpg.envelope.connect(lpg.filter.frequency);
    });
  }

  connectEnvelope(channel, envelopeNode) {
    if (channel < 0 || channel >= this.channels) return;

    const lpg = this.lpgs[channel];
    if (lpg && envelopeNode) {
      try {
        // Scale envelope to control both VCA and filter
        const scaler = new Tone.Multiply(20000); // Scale for filter frequency
        envelopeNode.connect(scaler);
        scaler.connect(lpg.filter.frequency);

        // Direct connection for VCA
        envelopeNode.connect(lpg.vca.gain);
      } catch (error) {
        console.warn(`Error connecting envelope to LPG ${channel}:`, error);
      }
    }
  }

  setParams(channel, params) {
    if (channel < 0 || channel >= this.channels) return;

    const lpg = this.lpgs[channel];
    if (!lpg) return;

    try {
      // Set response (rise) time
      if (params.response !== undefined) {
        lpg.response = Math.max(0.001, params.response);
        lpg.filter.Q.value = 1 / lpg.response; // Q inversely proportional to response
      }

      // Set level
      if (params.level !== undefined) {
        lpg.level = Math.max(0, Math.min(1, params.level));
        lpg.vca.gain.value = lpg.level;
      }
    } catch (error) {
      console.warn(
        `Error setting LPG parameters for channel ${channel}:`,
        error
      );
    }
  }

  dispose() {
    // Dispose all Tone.js nodes
    this.lpgs.forEach((lpg) => {
      lpg.vca.dispose();
      lpg.filter.dispose();
      lpg.envelope.dispose();
    });

    this.inputs.forEach((input) => input.dispose());
    this.outputs.forEach((output) => output.dispose());
  }
}
