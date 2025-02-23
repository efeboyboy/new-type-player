import { reactive } from "vue";
import { generateSequence } from "./services/Sequencer.js";
import audioEngine from "./services/audio-engine/AudioEngine.js";
import * as Tone from "tone";

// Default patch seed
const DEFAULT_PATCH_SEED = "a3Wnb2pn";

export const store = reactive({
  inputText: "",
  sequence: [],
  playing: false,
  tempo: 120,
  currentStep: 0,
  audioInitialized: false,
  volume: 0.6,
  currentSeed: DEFAULT_PATCH_SEED,

  // Component refs (set by parent App.vue)
  osc1: null,
  osc2: null,
  osc3: null,
  noiseControls: null,
  envelopeControls: null,
  lpgControls: null,
  matrixMixer: null,
  filterControls: null,
  spatialControls: null,

  async initializeAudio() {
    if (!this.audioInitialized) {
      try {
        await Tone.start();
        console.log("Tone.js started");
        await audioEngine.initialize();
        console.log("Audio engine initialized");
        this.audioInitialized = true;
        Tone.Transport.bpm.value = this.tempo;

        // Always apply the default patch on initialization
        await this.applySeed(DEFAULT_PATCH_SEED);

        return true;
      } catch (error) {
        console.error("Failed to initialize audio:", error);
        this.audioInitialized = false;
        return false;
      }
    }
    return true;
  },

  updateInput(newInput) {
    this.inputText = newInput;
    // Generate sequence based on new input
    if (newInput) {
      this.sequence = generateSequence(newInput);
      console.log("Generated sequence:", this.sequence);
      // If we're playing, restart with new sequence
      if (this.playing) {
        audioEngine.stopPlayback();
        audioEngine.startPlayback(this.sequence);
      }
    } else {
      this.sequence = [];
      if (this.playing) {
        this.togglePlaying(); // Stop if no input
      }
    }
  },

  async togglePlaying() {
    if (!this.audioInitialized) {
      await this.initializeAudio();
    }

    // Ensure Tone.js context is running
    if (Tone.context.state !== "running") {
      await Tone.context.resume();
    }

    this.playing = !this.playing;
    if (this.playing && this.sequence.length > 0) {
      // Start Tone.js transport if needed
      if (Tone.Transport.state !== "started") {
        Tone.Transport.start();
      }
      audioEngine.startPlayback(this.sequence);
      this.startStepSequence();
      console.log("Starting playback with sequence:", this.sequence);
    } else {
      audioEngine.stopPlayback();
      this.stopStepSequence();
      console.log("Stopping playback");
    }
  },

  startStepSequence() {
    this.stopStepSequence(); // Clear any existing interval
    this.stepInterval = setInterval(() => {
      this.currentStep = (this.currentStep + 1) % 16;
    }, ((60 / this.tempo) * 1000) / 4); // 16th notes
  },

  stopStepSequence() {
    if (this.stepInterval) {
      clearInterval(this.stepInterval);
      this.stepInterval = null;
    }
    this.currentStep = 0;
  },

  setTempo(newTempo) {
    this.tempo = newTempo;
    Tone.Transport.bpm.value = newTempo;
    if (this.playing) {
      this.stopStepSequence();
      this.startStepSequence();
    }
  },

  // Modified applySeed to respect the default patch
  async applySeed(seed, updateText = false) {
    if (!seed) return;

    // If no seed is provided, use the default patch
    const seedToUse = seed || DEFAULT_PATCH_SEED;
    this.currentSeed = seedToUse;

    try {
      // Wait for audio engine to be ready
      if (!audioEngine.initialized) {
        await audioEngine.initialize();
      }

      const seedRandom = new Math.seedrandom(seedToUse);

      // Apply randomization to all components using the seeded random
      await Promise.all([
        this.osc1?.randomize(seedRandom),
        this.osc2?.randomize(seedRandom),
        this.osc3?.randomize(seedRandom),
        this.noiseControls?.randomize(seedRandom),
        this.envelopeControls?.randomize(seedRandom),
        this.lpgControls?.randomize(seedRandom),
        this.matrixMixer?.randomize(seedRandom),
        this.filterControls?.randomize(seedRandom),
        this.spatialControls?.randomize(seedRandom),
      ]);

      // Only update text if specified (for randomize button)
      if (updateText) {
        this.inputText = `Patch ${seedToUse}`;
      }

      // Store seed in localStorage
      localStorage.setItem("defaultSeed", seedToUse);

      return true;
    } catch (error) {
      console.error("Failed to apply seed:", error);
      return false;
    }
  },

  // Modified loadDefault to always use the default patch if no saved state
  async loadDefault() {
    try {
      const savedPatch = localStorage.getItem("defaultPatch");
      if (!savedPatch) {
        // If no saved patch, use the default
        return await this.applySeed(DEFAULT_PATCH_SEED);
      }

      const state = JSON.parse(savedPatch);

      // Apply saved state or default if no seed
      await this.applySeed(state.seed || DEFAULT_PATCH_SEED);

      this.tempo = state.tempo || 120;
      this.volume = state.volume || 0.75;

      return true;
    } catch (error) {
      console.error("Failed to load default patch:", error);
      // On error, fall back to default patch
      return await this.applySeed(DEFAULT_PATCH_SEED);
    }
  },

  // Save current state as default
  saveAsDefault() {
    if (!this.currentSeed) return false;

    try {
      // Save current parameters
      const state = {
        seed: this.currentSeed,
        tempo: this.tempo,
        volume: this.volume,
        // Add other parameters as needed
      };

      localStorage.setItem("defaultPatch", JSON.stringify(state));
      return true;
    } catch (error) {
      console.error("Failed to save default patch:", error);
      return false;
    }
  },
});
