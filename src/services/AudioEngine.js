import * as Tone from "tone";

class AudioEngine {
  constructor() {
    // Primary oscillators (first dual setup)
    this.osc1 = new Tone.Oscillator({
      type: "sine",
      frequency: 440,
    }).toDestination();

    this.osc2 = new Tone.Oscillator({
      type: "sine",
      frequency: 440,
    }).toDestination();

    // Additional oscillator (for frequency shifting)
    this.osc3 = new Tone.Oscillator({
      type: "sine",
      frequency: 440,
    }).toDestination();

    // Noise generator
    this.noise = new Tone.Noise({
      type: "white",
      volume: -10,
    }).toDestination();

    // Initialize sequences array
    this.activeSequences = [];
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
          // For now, just use the oscillators directly
          // Later we'll route through the matrix mixer
          switch (i) {
            case 0:
              this.osc1.frequency.setValueAtTime(
                Tone.Frequency(note, "midi"),
                time
              );
              break;
            case 1:
              this.osc2.frequency.setValueAtTime(
                Tone.Frequency(note, "midi"),
                time
              );
              break;
            case 2:
              this.osc3.frequency.setValueAtTime(
                Tone.Frequency(note, "midi"),
                time
              );
              break;
            case 3:
              // For noise channel, we'll just modulate the volume based on the note value
              const volume = (note / 127) * 10 - 20; // Convert MIDI to dB range -20 to -10
              this.noise.volume.setValueAtTime(volume, time);
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
}

// Create and export a single instance
const audioEngine = new AudioEngine();
export default audioEngine;
