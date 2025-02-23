import { reactive } from "vue";
import { generateSequence } from "./services/Sequencer.js";

export const store = reactive({
  inputText: "",
  sequence: [],
  playing: false,
  tempo: 120,
  updateInput(newInput) {
    this.inputText = newInput;
    // Generate sequence based on new input
    this.sequence = newInput ? generateSequence(newInput) : [];
  },
  togglePlaying() {
    this.playing = !this.playing;
  },
});
