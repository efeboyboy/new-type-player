import * as Tone from "tone";

/**
 * Basic oscillator for testing core functionality
 */
export class BasicOscillator {
  constructor() {
    // Core components
    this.oscillator = new Tone.Oscillator({
      frequency: 440,
      type: "sine",
    });

    this.output = new Tone.Gain(0);
    this.oscillator.connect(this.output);
    this.output.connect(Tone.Destination);

    // Basic state
    this.isPlaying = false;
  }

  /**
   * Start the oscillator
   */
  async start() {
    await Tone.start();
    if (!this.isPlaying) {
      this.oscillator.start();
      this.output.gain.value = 0.5;
      this.isPlaying = true;
    }
  }

  /**
   * Stop the oscillator
   */
  stop() {
    if (this.isPlaying) {
      this.output.gain.value = 0;
      this.isPlaying = false;
    }
  }

  /**
   * Set frequency
   */
  setFrequency(freq) {
    this.oscillator.frequency.value = freq;
  }

  /**
   * Set waveform type
   */
  setWaveform(type) {
    this.oscillator.type = type;
  }

  /**
   * Clean up
   */
  dispose() {
    this.stop();
    this.oscillator.dispose();
    this.output.dispose();
  }
}
