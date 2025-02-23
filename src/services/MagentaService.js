// Import polyfills first
import "./polyfills.js";

// Polyfills for Magenta.js
if (typeof global === "undefined") {
  window.global = window;
}

// Process polyfill with hrtime
if (typeof process === "undefined") {
  window.process = {
    env: {},
    hrtime: function (previousTimestamp) {
      const performanceNow =
        performance && performance.now ? performance.now() : Date.now();
      const clocktime = performanceNow * 1e-3;
      let seconds = Math.floor(clocktime);
      let nanoseconds = Math.floor((clocktime % 1) * 1e9);

      if (previousTimestamp) {
        seconds = seconds - previousTimestamp[0];
        nanoseconds = nanoseconds - previousTimestamp[1];
        if (nanoseconds < 0) {
          seconds--;
          nanoseconds += 1e9;
        }
      }
      return [seconds, nanoseconds];
    },
  };
}

// Performance polyfill
if (typeof performance === "undefined") {
  window.performance = {
    now: function () {
      return Date.now();
    },
  };
}

// Import Magenta modules separately
import * as core from "@magenta/music/es6/core";
import * as musicVAE from "@magenta/music/es6/music_vae";
import * as musicRNN from "@magenta/music/es6/music_rnn";

import {
  buchlaTemplates,
  textToTemplateMapping,
  templateUtils,
} from "./BuchlaTemplates";

class MagentaService {
  constructor() {
    // Model instances
    this.musicRNN = null;
    this.musicVAE = null;
    this.grooveVAE = null;

    // Loading states
    this.isInitialized = false;
    this.isLoading = false;
    this.error = null;

    // Model URLs
    this.modelUrls = {
      musicRNN:
        "https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/melody_rnn",
      musicVAE:
        "https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_small_q2",
      grooveVAE:
        "https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/groovae_4bar",
    };
  }

  async initialize() {
    if (this.isInitialized) return;
    if (this.isLoading) return;

    try {
      this.isLoading = true;
      this.error = null;

      // Initialize models in parallel
      const [musicRNNModel, musicVAEModel, grooveVAEModel] = await Promise.all([
        new musicRNN.MusicRNN(this.modelUrls.musicRNN),
        new musicVAE.MusicVAE(this.modelUrls.musicVAE),
        new musicVAE.MusicVAE(this.modelUrls.grooveVAE),
      ]);

      await Promise.all([
        musicRNNModel.initialize(),
        musicVAEModel.initialize(),
        grooveVAEModel.initialize(),
      ]);

      this.musicRNN = musicRNNModel;
      this.musicVAE = musicVAEModel;
      this.grooveVAE = grooveVAEModel;
      this.isInitialized = true;
      console.log("Magenta models initialized successfully");
    } catch (err) {
      this.error = err;
      console.error("Failed to initialize Magenta models:", err);
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  // Convert our CV sequence format to Magenta's NoteSequence format
  convertToNoteSequence(cvSequence) {
    const sequence = {
      notes: [],
      totalTime: 4.0, // Default to 4 bars
      tempos: [{ time: 0, qpm: 120 }],
      timeSignatures: [{ time: 0, numerator: 4, denominator: 4 }],
    };

    // TODO: Implement conversion from CV to MIDI notes
    // This will be implemented in the next step

    return sequence;
  }

  // Convert Magenta's NoteSequence format back to our CV sequence format
  convertFromNoteSequence(noteSequence) {
    const cvSequence = [];

    // TODO: Implement conversion from MIDI notes to CV
    // This will be implemented in the next step

    return cvSequence;
  }

  // Generate a continuation of the given melody
  async continueMelody(inputSequence, steps = 16, temperature = 1.0) {
    if (!this.isInitialized) {
      throw new Error("MagentaService not initialized");
    }

    try {
      const magentaSequence = this.convertToNoteSequence(inputSequence);
      const continuation = await this.musicRNN.continueSequence(
        magentaSequence,
        steps,
        temperature
      );
      return this.convertFromNoteSequence(continuation);
    } catch (err) {
      console.error("Failed to continue melody:", err);
      throw err;
    }
  }

  // Create an interpolation between two sequences
  async interpolateSequences(sequenceA, sequenceB, numSteps = 4) {
    if (!this.isInitialized) {
      throw new Error("MagentaService not initialized");
    }

    try {
      const magentaSeqA = this.convertToNoteSequence(sequenceA);
      const magentaSeqB = this.convertToNoteSequence(sequenceB);

      const interpolations = await this.musicVAE.interpolate(
        [magentaSeqA, magentaSeqB],
        numSteps
      );

      return interpolations.map((seq) => this.convertFromNoteSequence(seq));
    } catch (err) {
      console.error("Failed to interpolate sequences:", err);
      throw err;
    }
  }

  // Generate a rhythmic pattern based on input parameters
  async generateGroove(density = 0.8, swing = 0.5) {
    if (!this.isInitialized) {
      throw new Error("MagentaService not initialized");
    }

    try {
      // Generate a random latent vector
      const z = await this.grooveVAE.sample(1);

      // Adjust the groove parameters
      z[0] = z[0].map((val) => val * density);

      // Decode the latent vector to a rhythm
      const groove = await this.grooveVAE.decode(z);

      return this.convertFromNoteSequence(groove[0]);
    } catch (err) {
      console.error("Failed to generate groove:", err);
      throw err;
    }
  }

  async generateFromText(text) {
    if (!this.isInitialized) {
      throw new Error("MagentaService not initialized");
    }

    try {
      // Analyze text characteristics
      const complexity = textToTemplateMapping.getComplexityFromText(text);
      const emotionalChars =
        textToTemplateMapping.getEmotionalCharacteristics(text);
      const musicalParams = textToTemplateMapping.getMusicalParameters(text);

      // Get scale and base note
      const baseNote = musicalParams.baseNote || 60;
      const scale =
        buchlaTemplates.emotional[musicalParams.scaleType || "bright"].scale;

      // Create sequence directly from text
      const notes = [];
      const chars = text.split("");

      // Calculate total sequence length (16 steps)
      const totalSteps = 16;
      const stepsPerChar = Math.max(1, Math.floor(totalSteps / chars.length));

      chars.forEach((char, i) => {
        if (i * stepsPerChar >= totalSteps) return; // Don't exceed total steps

        const charCode = char.charCodeAt(0);
        const scaleIndex = charCode % scale.length;
        const octave = Math.floor(charCode / scale.length) % 2;
        const pitch = baseNote + scale[scaleIndex] + octave * 12;

        // Create a note for this character
        notes.push({
          pitch: Math.min(108, Math.max(21, pitch)),
          startTime: i * stepsPerChar * 0.25,
          endTime: i * stepsPerChar * 0.25 + 0.25,
          velocity: Math.min(127, Math.max(40, 80 + (charCode % 47))),
        });
      });

      // Add some variation notes based on the original sequence
      const variationNotes = notes
        .map((note) => ({
          pitch: note.pitch + (Math.random() > 0.5 ? 12 : -12),
          startTime: note.startTime + 2,
          endTime: note.endTime + 2,
          velocity: Math.max(40, note.velocity - 20),
        }))
        .filter((note) => note.pitch >= 21 && note.pitch <= 108);

      // Combine original and variation notes
      const allNotes = [...notes, ...variationNotes].sort(
        (a, b) => a.startTime - b.startTime
      );

      return {
        notes: allNotes,
        totalTime: 4.0,
        tempos: [{ time: 0, qpm: 120 }],
        timeSignatures: [{ time: 0, numerator: 4, denominator: 4 }],
      };
    } catch (err) {
      console.error("Failed to generate sequence from text:", err);
      throw err;
    }
  }

  // Clean up resources
  dispose() {
    if (this.musicRNN) this.musicRNN.dispose();
    if (this.musicVAE) this.musicVAE.dispose();
    if (this.grooveVAE) this.grooveVAE.dispose();

    this.isInitialized = false;
    this.isLoading = false;
    this.error = null;
  }
}

// Export the class
export default MagentaService;
