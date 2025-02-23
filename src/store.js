import { reactive } from "vue";
import { generateSequence } from "./services/Sequencer.js";
import audioEngine from "./services/AudioEngine.js";
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
      const generatedSequence = generateSequence(newInput);
      // Convert to the format expected by AudioEngine
      const formattedSequence = {
        notes: [],
        totalTime: 4.0,
        tempos: [{ time: 0, qpm: this.tempo }],
      };

      // Convert the 2D array format to notes
      generatedSequence.forEach((channel, channelIndex) => {
        channel.forEach((value, stepIndex) => {
          if (value !== null && value !== undefined) {
            formattedSequence.notes.push({
              pitch: value,
              startTime: stepIndex * 0.25, // Each step is a 16th note
              endTime: (stepIndex + 1) * 0.25,
              velocity: 100, // Default velocity
              channel: channelIndex,
            });
          }
        });
      });

      this.sequence = formattedSequence;
      console.log("Generated sequence:", this.sequence);

      // If we're playing, restart with new sequence
      if (this.playing) {
        audioEngine.stopPlayback();
        audioEngine.startPlayback(this.sequence);
      }
    } else {
      this.sequence = {
        notes: [],
        totalTime: 4.0,
        tempos: [{ time: 0, qpm: this.tempo }],
      };
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

  async applySeed(seed, shouldUpdateText = false) {
    try {
      // Ensure audio is initialized first
      if (!this.audioInitialized) {
        await this.initializeAudio();
      }

      // Validate seed
      if (!seed || typeof seed !== "string" || seed.length !== 8) {
        throw new Error("Invalid seed format");
      }

      this.currentSeed = seed;

      // Wait for all component updates to complete
      const updatePromises = [];

      // Only update components that exist
      if (this.osc1) updatePromises.push(this.osc1.randomize());
      if (this.osc2) updatePromises.push(this.osc2.randomize());
      if (this.osc3) updatePromises.push(this.osc3.randomize());
      if (this.noiseControls)
        updatePromises.push(this.noiseControls.randomize());
      if (this.envelopeControls)
        updatePromises.push(this.envelopeControls.randomize());
      if (this.lpgControls) updatePromises.push(this.lpgControls.randomize());
      if (this.matrixMixer) updatePromises.push(this.matrixMixer.randomize());
      if (this.filterControls)
        updatePromises.push(this.filterControls.randomize());
      if (this.spatialControls)
        updatePromises.push(this.spatialControls.randomize());

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      return true;
    } catch (error) {
      console.error("Error applying seed:", error);
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
