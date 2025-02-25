import * as Tone from "tone";

/**
 * Enhanced oscillator class designed for Buchla-style synthesis
 * Supports the four main musical approaches:
 * - Keyboard Rotations
 * - Melodic-Rhythmic Reliefs
 * - Vertical Sequencer
 * - String Patch
 */
export class Oscillator {
  constructor(context) {
    // Core oscillator
    this.oscillator = new Tone.OmniOscillator({
      frequency: 440,
      type: "sine",
    }).start();

    // Gain stage for amplitude control
    this.output = new Tone.Gain(0);

    // Frequency modulation
    this.fmGain = new Tone.Gain(0);
    this.oscillator.connect(this.output);

    // State
    this.currentNote = null;
    this.isPlaying = false;

    // Parameters
    this.params = {
      frequency: 440,
      waveform: "sine",
      detune: 0,
      fmAmount: 0,
      amplitude: 0,
    };
  }

  /**
   * Set oscillator frequency with optional glide
   */
  setFrequency(freq, time = 0) {
    this.params.frequency = freq;
    this.oscillator.frequency.rampTo(freq, time);
  }

  /**
   * Set note with optional quantization
   */
  setNote(note, quantize = false) {
    this.currentNote = note;
    let freq = Tone.Frequency(note).toFrequency();

    if (quantize) {
      // Quantize to nearest semitone
      freq = Math.round(12 * Math.log2(freq / 440)) / 12;
      freq = 440 * Math.pow(2, freq);
    }

    this.setFrequency(freq);
  }

  /**
   * Set waveform type and shape
   */
  setWaveform(type, shape = 0) {
    this.params.waveform = type;

    // Handle complex waveform types
    if (type === "custom") {
      this.oscillator.type = "sine";
      // Add waveshaping for more complex timbres
      // This will be important for the String Patch
    } else {
      this.oscillator.type = type;
    }
  }

  /**
   * Set FM amount for complex modulation
   */
  setFMAmount(amount, modulator) {
    this.params.fmAmount = amount;
    this.fmGain.gain.value = amount;

    if (modulator) {
      modulator.connect(this.fmGain);
      this.fmGain.connect(this.oscillator.frequency);
    }
  }

  /**
   * Set amplitude with optional envelope
   */
  setAmplitude(value, time = 0) {
    this.params.amplitude = value;
    this.output.gain.rampTo(value, time);
  }

  /**
   * Quick start/stop for rhythmic patterns
   */
  trigger(velocity = 1, time = 0) {
    this.setAmplitude(velocity, time);
    this.isPlaying = true;
  }

  release(time = 0.1) {
    this.setAmplitude(0, time);
    this.isPlaying = false;
  }

  /**
   * Connect to another audio node
   */
  connect(node) {
    this.output.connect(node);
    return this;
  }

  /**
   * Disconnect from another audio node
   */
  disconnect() {
    this.output.disconnect();
    return this;
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.oscillator.dispose();
    this.output.dispose();
    this.fmGain.dispose();
  }

  /**
   * Get current parameters
   */
  getParams() {
    return { ...this.params };
  }
}
