import * as Tone from "tone";

/**
 * Base template for all Buchla patches
 * Defines common functionality and interface that all patches must implement
 */
export class PatchTemplate {
  constructor() {
    this.name = "Base Patch";
    this.description = "Base patch template";

    // Common audio nodes
    this.oscillators = [];
    this.envelopes = [];
    this.filters = [];
    this.spatialOutput = null;

    // State management
    this.isInitialized = false;
    this.isPlaying = false;

    // Default parameters
    this.defaultParams = {
      tempo: 120,
      volume: 0.6,
    };

    // Patch-specific parameters
    this.params = { ...this.defaultParams };
  }

  /**
   * Initialize the patch audio components
   * Must be called before any audio processing
   */
  async initialize() {
    if (this.isInitialized) return;

    await Tone.start();
    this.setupAudioNodes();
    this.setupRouting();
    this.isInitialized = true;
  }

  /**
   * Set up the basic audio nodes for this patch
   * Override in specific patch implementations
   */
  setupAudioNodes() {
    // Base setup - override in specific patches
    this.spatialOutput = new Tone.Panner2D();
    this.spatialOutput.connect(Tone.Destination);
  }

  /**
   * Set up audio routing between nodes
   * Override in specific patch implementations
   */
  setupRouting() {
    // Base routing - override in specific patches
  }

  /**
   * Start audio processing
   */
  async start() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    this.isPlaying = true;
  }

  /**
   * Stop audio processing
   */
  stop() {
    this.isPlaying = false;
  }

  /**
   * Update patch parameters
   * @param {Object} params - Parameters to update
   */
  updateParams(params) {
    this.params = { ...this.params, ...params };
    this.onParamsUpdate();
  }

  /**
   * Handle parameter updates
   * Override in specific patch implementations
   */
  onParamsUpdate() {
    // Handle parameter changes - override in specific patches
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.stop();
    this.oscillators.forEach((osc) => osc.dispose());
    this.envelopes.forEach((env) => env.dispose());
    this.filters.forEach((filter) => filter.dispose());
    if (this.spatialOutput) this.spatialOutput.dispose();
  }

  /**
   * Get current patch state
   * @returns {Object} Current state
   */
  getState() {
    return {
      name: this.name,
      isPlaying: this.isPlaying,
      params: this.params,
    };
  }

  /**
   * Restore patch state
   * @param {Object} state - State to restore
   */
  setState(state) {
    if (state.params) {
      this.updateParams(state.params);
    }
  }
}
