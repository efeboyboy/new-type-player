import { ref } from "vue";
import * as Tone from "tone";

/**
 * Manages the lifecycle and switching of Buchla patches
 */
class PatchManager {
  constructor() {
    this.patches = new Map();
    this.currentPatch = null;
    this.isInitialized = false;

    // Reactive state
    this.state = ref({
      currentPatchName: null,
      isPlaying: false,
      availablePatches: [],
    });
  }

  /**
   * Register a patch with the manager
   * @param {string} name - Unique patch name
   * @param {PatchTemplate} patchClass - Patch class constructor
   */
  registerPatch(name, patchClass) {
    if (this.patches.has(name)) {
      console.warn(`Patch "${name}" already registered`);
      return;
    }

    this.patches.set(name, patchClass);
    this.updateAvailablePatches();
  }

  /**
   * Initialize the audio context and patch system
   */
  async initialize() {
    if (this.isInitialized) return;

    await Tone.start();
    this.isInitialized = true;
  }

  /**
   * Switch to a different patch
   * @param {string} patchName - Name of patch to switch to
   */
  async switchToPatch(patchName) {
    if (!this.patches.has(patchName)) {
      throw new Error(`Patch "${patchName}" not found`);
    }

    // Clean up current patch if exists
    if (this.currentPatch) {
      this.currentPatch.stop();
      this.currentPatch.dispose();
    }

    // Initialize new patch
    const PatchClass = this.patches.get(patchName);
    this.currentPatch = new PatchClass();
    await this.currentPatch.initialize();

    // Update state
    this.state.value.currentPatchName = patchName;
    this.state.value.isPlaying = false;
  }

  /**
   * Start current patch playback
   */
  async start() {
    if (!this.currentPatch) return;

    await this.currentPatch.start();
    this.state.value.isPlaying = true;
  }

  /**
   * Stop current patch playback
   */
  stop() {
    if (!this.currentPatch) return;

    this.currentPatch.stop();
    this.state.value.isPlaying = false;
  }

  /**
   * Update patch parameters
   * @param {Object} params - Parameters to update
   */
  updateParams(params) {
    if (!this.currentPatch) return;
    this.currentPatch.updateParams(params);
  }

  /**
   * Get current patch state
   * @returns {Object} Current state
   */
  getPatchState() {
    if (!this.currentPatch) return null;
    return this.currentPatch.getState();
  }

  /**
   * Update the list of available patches
   * @private
   */
  updateAvailablePatches() {
    this.state.value.availablePatches = Array.from(this.patches.keys());
  }
}

// Export singleton instance
export const patchManager = new PatchManager();
