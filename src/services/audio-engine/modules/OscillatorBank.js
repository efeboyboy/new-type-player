import * as Tone from "tone";

export class OscillatorBank {
  constructor(bankNumber) {
    this.bankNumber = bankNumber;
    this.oscillators = [];
    this.waveShaper = new Tone.WaveShaper();
    this.output = new Tone.Gain(1);

    // Create oscillators (3 per bank for rich sound)
    for (let i = 0; i < 3; i++) {
      const osc = new Tone.Oscillator({
        type: "sine",
        frequency: 440,
        detune: i === 0 ? 0 : i * 2 - 1, // Slight detuning for richness
      }).start();

      const gain = new Tone.Gain(1 / 3); // Equal mix of oscillators
      osc.connect(gain);
      gain.connect(this.waveShaper);

      this.oscillators.push({
        oscillator: osc,
        gain: gain,
      });
    }

    // Connect waveshaper to output
    this.waveShaper.connect(this.output);

    // Initialize wave shape
    this.setWaveShape(0); // Start with sine wave
  }

  setParams(params) {
    if (!params) return;

    try {
      // Set frequency for all oscillators
      if (params.frequency !== undefined) {
        this.oscillators.forEach(({ oscillator }) => {
          oscillator.frequency.setValueAtTime(params.frequency, Tone.now());
        });
      }

      // Set wave shape
      if (params.waveShape !== undefined) {
        this.setWaveShape(params.waveShape);
      }

      // Set modulation
      if (params.modulation !== undefined) {
        this.setModulation(params.modulation);
      }

      // Set detune spread
      if (params.detuneSpread !== undefined) {
        this.setDetuneSpread(params.detuneSpread);
      }
    } catch (error) {
      console.warn(
        `Error setting oscillator parameters for bank ${this.bankNumber}:`,
        error
      );
    }
  }

  setWaveShape(shape) {
    // Shape parameter from 0 to 1:
    // 0 = sine
    // 0.5 = triangle/ramp
    // 1 = square
    const curve = new Float32Array(1024);

    for (let i = 0; i < 1024; i++) {
      const x = (i / 1024) * 2 - 1;
      if (shape <= 0.5) {
        // Morph from sine to triangle
        const morphFactor = shape * 2;
        const sine = Math.sin(Math.PI * x);
        const tri = Math.asin(x) / (Math.PI / 2);
        curve[i] = sine * (1 - morphFactor) + tri * morphFactor;
      } else {
        // Morph from triangle to square
        const morphFactor = (shape - 0.5) * 2;
        const tri = Math.asin(x) / (Math.PI / 2);
        const square = Math.sign(x);
        curve[i] = tri * (1 - morphFactor) + square * morphFactor;
      }
    }

    this.waveShaper.curve = curve;
  }

  setModulation(amount) {
    // Implement FM or AM modulation
    this.oscillators.forEach(({ oscillator }, i) => {
      if (i > 0) {
        // Leave first oscillator unmodulated as carrier
        oscillator.modulationIndex = amount * 5;
      }
    });
  }

  setDetuneSpread(spread) {
    this.oscillators.forEach(({ oscillator }, i) => {
      if (i > 0) {
        // Leave first oscillator at center frequency
        const detune = (i * 2 - 1) * spread * 10; // Max ±10 cents
        oscillator.detune.setValueAtTime(detune, Tone.now());
      }
    });
  }

  dispose() {
    this.oscillators.forEach(({ oscillator, gain }) => {
      oscillator.dispose();
      gain.dispose();
    });
    this.waveShaper.dispose();
    this.output.dispose();
  }
}
