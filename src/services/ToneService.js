import * as Tone from "tone";

// Prevent multiple version logging
window.TONE_SILENCE_VERSION_LOGGING = true;
window.TONE_SILENCE_LOGGING = true;

// Singleton instance to ensure we only have one Tone.js instance
class ToneService {
  static instance = null;
  static isInitialized = false;
  static isStarted = false;
  static audioEngineInitialized = false;

  static getInstance() {
    if (!ToneService.instance) {
      ToneService.instance = new ToneService();
    }
    return ToneService.instance;
  }

  constructor() {
    if (ToneService.instance) {
      return ToneService.instance;
    }
    ToneService.instance = this;
  }

  getTone() {
    return Tone;
  }

  async start() {
    if (ToneService.isStarted) {
      console.log("Tone.js already started");
      return;
    }

    if (Tone.context.state === "running") {
      console.log("Tone.js context already running");
      ToneService.isStarted = true;
      return;
    }

    await Tone.start();
    await Tone.context.resume();
    ToneService.isStarted = true;
    console.log("Tone.js started successfully");
  }

  getContext() {
    return Tone.context;
  }

  isStarted() {
    return ToneService.isStarted;
  }

  setAudioEngineInitialized(value) {
    ToneService.audioEngineInitialized = value;
  }

  isAudioEngineInitialized() {
    return ToneService.audioEngineInitialized;
  }

  async ensureStarted() {
    if (!ToneService.isStarted || Tone.context.state !== "running") {
      await this.start();
    }
  }

  // Add any other Tone.js related utility methods here
}

export default ToneService.getInstance();
