import * as Tone from "tone";

export class EnvelopeGenerator {
  constructor() {
    this.channels = 4;

    // Create envelope generators for each channel
    this.envelopes = Array(this.channels)
      .fill()
      .map(() => ({
        envelope: new Tone.Envelope({
          attack: 0.1,
          decay: 0.2,
          sustain: 0.5,
          release: 0.5,
        }),
        output: new Tone.Gain(0),
        loopMode: false,
        loopInterval: 1,
        loopId: null,
      }));

    // Create outputs array for easy access
    this.outputs = this.envelopes.map((env) => env.output);

    // Initialize connections
    this.initializeConnections();
  }

  initializeConnections() {
    this.envelopes.forEach((env) => {
      env.envelope.connect(env.output.gain);
    });
  }

  setEnvelope(channel, params) {
    if (channel < 0 || channel >= this.channels) return;

    const env = this.envelopes[channel];
    if (!env) return;

    try {
      // Update envelope parameters
      if (params.attack !== undefined) {
        env.envelope.attack = Math.max(0.001, params.attack);
      }
      if (params.decay !== undefined) {
        env.envelope.decay = Math.max(0.001, params.decay);
      }
      if (params.sustain !== undefined) {
        env.envelope.sustain = Math.max(0, Math.min(1, params.sustain));
      }
      if (params.release !== undefined) {
        env.envelope.release = Math.max(0.001, params.release);
      }

      // Handle looping
      if (params.loop !== undefined) {
        this.setLoopMode(channel, params.loop, params.loopInterval);
      }
    } catch (error) {
      console.warn(
        `Error setting envelope parameters for channel ${channel}:`,
        error
      );
    }
  }

  triggerEnvelope(channel, time = Tone.now(), options = {}) {
    if (channel < 0 || channel >= this.channels) return;

    const env = this.envelopes[channel];
    if (!env) return;

    try {
      const velocity = options.velocity || 1;
      const duration =
        options.duration || env.envelope.attack + env.envelope.decay;

      // Scale output based on velocity
      env.output.gain.value = velocity;

      // Trigger envelope
      env.envelope.triggerAttackRelease(duration, time);
    } catch (error) {
      console.warn(`Error triggering envelope for channel ${channel}:`, error);
    }
  }

  setLoopMode(channel, enabled, interval = 1) {
    if (channel < 0 || channel >= this.channels) return;

    const env = this.envelopes[channel];
    if (!env) return;

    try {
      // Clear existing loop if any
      if (env.loopId) {
        Tone.Transport.clear(env.loopId);
        env.loopId = null;
      }

      env.loopMode = enabled;
      env.loopInterval = Math.max(0.01, interval);

      if (enabled) {
        // Calculate total envelope time
        const totalTime = env.envelope.attack + env.envelope.decay;
        const loopTime = totalTime * env.loopInterval;

        // Schedule loop
        env.loopId = Tone.Transport.scheduleRepeat((time) => {
          this.triggerEnvelope(channel, time);
        }, loopTime);
      }
    } catch (error) {
      console.warn(`Error setting loop mode for channel ${channel}:`, error);
    }
  }

  getOutput(channel) {
    if (channel < 0 || channel >= this.channels) return null;
    return this.envelopes[channel].output;
  }

  dispose() {
    this.envelopes.forEach((env) => {
      // Clear any active loops
      if (env.loopId) {
        Tone.Transport.clear(env.loopId);
      }

      // Dispose Tone.js nodes
      env.envelope.dispose();
      env.output.dispose();
    });
  }
}
