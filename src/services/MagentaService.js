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

// We'll initialize Buffer in the constructor
import * as mm from "@magenta/music";
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
        "https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn",
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
      const [musicRNN, musicVAE, grooveVAE] = await Promise.all([
        new mm.MusicRNN(this.modelUrls.musicRNN),
        new mm.MusicVAE(this.modelUrls.musicVAE),
        new mm.MusicVAE(this.modelUrls.grooveVAE),
      ]);

      await Promise.all([
        musicRNN.initialize(),
        musicVAE.initialize(),
        grooveVAE.initialize(),
      ]);

      this.musicRNN = musicRNN;
      this.musicVAE = musicVAE;
      this.grooveVAE = grooveVAE;
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

    // Analyze text characteristics
    const complexity = textToTemplateMapping.getComplexityFromText(text);
    const emotionalChars =
      textToTemplateMapping.getEmotionalCharacteristics(text);
    const musicalParams = textToTemplateMapping.getMusicalParameters(text);

    // Select and combine templates based on text characteristics
    const selectedTemplates = [];
    const weights = [];

    // Add basic template
    selectedTemplates.push(buchlaTemplates.basic.melodic[0]);
    weights.push(0.4);

    // Add emotional template based on text
    const emotionalType = musicalParams.scaleType;
    if (buchlaTemplates.emotional[emotionalType]) {
      selectedTemplates.push(buchlaTemplates.emotional[emotionalType]);
      weights.push(0.3);
    }

    // Add complex template if text is complex
    if (complexity > 0.6) {
      selectedTemplates.push(buchlaTemplates.complex.melodic[0]);
      weights.push(0.3);
    }

    // Combine templates and modify based on characteristics
    let baseTemplate = templateUtils.combineTemplates(
      selectedTemplates,
      weights
    );
    baseTemplate = templateUtils.modifyTemplate(baseTemplate, emotionalChars);

    // Convert to Magenta format
    const sequence = templateUtils.toMagentaFormat(baseTemplate);

    // Enhance with MusicRNN
    const rnnSteps = 32;
    const rnnTemp = 1.0;
    const enhancedSequence = await this.musicRNN.continueSequence(
      sequence,
      rnnSteps,
      rnnTemp
    );

    // Generate variations with MusicVAE
    const vaeTemp = 0.5;
    const z = await this.musicVAE.encode([enhancedSequence]);
    const variations = await this.musicVAE.decode(z, vaeTemp);

    // Add groove variations
    const grooveTemp = 0.7;
    const grooveZ = await this.grooveVAE.encode([enhancedSequence]);
    const grooveVariations = await this.grooveVAE.decode(grooveZ, grooveTemp);

    return {
      original: sequence,
      enhanced: enhancedSequence,
      variations: variations,
      grooveVariations: grooveVariations,
    };
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
