import { reactive } from "vue";
import { generateSequence } from "./services/Sequencer.js";
import audioEngine from "./services/AudioEngine.js";
import * as Tone from "tone";

export const store = reactive({
  inputText: "",
  sequence: [],
  playing: false,
  tempo: 120,
  currentStep: 0,
  audioInitialized: false,

  async initializeAudio() {
    if (!this.audioInitialized) {
      try {
        await Tone.start();
        console.log("Tone.js started");
        await audioEngine.initialize();
        console.log("Audio engine initialized");
        this.audioInitialized = true;
        Tone.Transport.bpm.value = this.tempo;
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
});
