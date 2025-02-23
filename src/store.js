import { reactive } from "vue";
import { generateSequence } from "./services/Sequencer.js";
import audioEngine from "./services/AudioEngine.js";

export const store = reactive({
  inputText: "",
  sequence: [],
  playing: false,
  tempo: 120,
  currentStep: 0,

  updateInput(newInput) {
    this.inputText = newInput;
    // Generate sequence based on new input
    this.sequence = newInput ? generateSequence(newInput) : [];
  },

  togglePlaying() {
    this.playing = !this.playing;
    if (this.playing) {
      audioEngine.startPlayback(this.sequence);
      this.startStepSequence();
    } else {
      audioEngine.stopPlayback();
      this.stopStepSequence();
    }
  },

  startStepSequence() {
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
    if (this.playing) {
      this.stopStepSequence();
      this.startStepSequence();
    }
  },
});
