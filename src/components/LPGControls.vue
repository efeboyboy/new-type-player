<template>
  <div class="flex gap-6 flex-col">
    <!-- Mode Selector -->
    <div class="control-group">
      <select
        v-model="mode"
        class="bg-zinc-800/50 text-zinc-300 text-[10px] rounded px-2 py-1 border border-zinc-700/50"
        @change="handleModeChange"
      >
        <option value="vcf">VCF</option>
        <option value="vca">VCA</option>
        <option value="both">VCF+VCA</option>
      </select>
      <label class="module-label">Mode</label>
    </div>

    <!-- Level Control -->
    <div class="control-group">
      <Knob
        v-model="level"
        :min="0"
        :max="1.0"
        :step="0.01"
        class="w-10 h-10"
        @update:model-value="handleParameterChange('level')"
      />
      <div class="module-value">{{ formatPercent(level) }}</div>
      <label class="module-label">Level</label>
    </div>

    <!-- Mod Amount -->
    <div class="control-group">
      <Knob
        v-model="modAmount"
        :min="0"
        :max="1.0"
        :step="0.01"
        class="w-10 h-10"
        @update:model-value="handleParameterChange('modAmount')"
      />
      <div class="module-value">{{ formatPercent(modAmount) }}</div>
      <label class="module-label">Mod</label>
    </div>

    <!-- Rate Control (Only for LPG 3 & 4) -->
    <div v-if="number > 2" class="control-group">
      <Knob
        v-model="rate"
        :min="0.1"
        :max="10"
        :step="0.1"
        class="w-10 h-10"
        @update:model-value="handleRateChange"
      />
      <div class="module-value">{{ rate.toFixed(1) }}Hz</div>
      <label class="module-label">Rate</label>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch, onMounted, nextTick, onBeforeUnmount } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";
  import ToneService from "../services/ToneService";
  const Tone = ToneService.getTone();

  const props = defineProps({
    number: {
      type: Number,
      required: true,
      validator: (value) => value >= 1 && value <= 4,
    },
  });

  // Refined default values based on signal path documentation
  const getDefaultValues = (number) => ({
    mode: number <= 2 ? "vcf" : "both", // VCF for 1&2, VCF+VCA for 3&4
    level: number <= 2 ? 0.7 : 0.8, // Higher level for LPG 3&4
    modAmount: number <= 2 ? 0.5 : 0.6, // Higher modulation for LPG 3&4
    rate: number === 3 ? 0.8 : 1.2, // Different rates for LPG 3 (0.8Hz) and 4 (1.2Hz)
  });

  const defaults = getDefaultValues(props.number);
  const mode = ref(defaults.mode);
  const level = ref(defaults.level);
  const modAmount = ref(defaults.modAmount);
  const rate = ref(defaults.rate);

  // Track last update times to prevent parameter conflicts
  const lastUpdateTimes = ref({
    mode: Array(4).fill(0),
    level: Array(4).fill(0),
    modAmount: Array(4).fill(0),
    rate: Array(4).fill(0),
  });

  // Track pending updates to batch them efficiently
  const pendingUpdates = ref({
    0: false,
    1: false,
    2: false,
    3: false,
  });

  // Store timeouts for cleanup
  const timeoutIds = ref([]);

  // Helper to safely add timeouts that will be cleaned up
  const safeTimeout = (callback, delay) => {
    const id = setTimeout(callback, delay);
    timeoutIds.value.push(id);
    return id;
  };

  // Clean up all timeouts on component unmount
  onBeforeUnmount(() => {
    timeoutIds.value.forEach((id) => clearTimeout(id));
    timeoutIds.value = [];

    // Cancel any pending debounced updates
    Object.values(debouncedUpdates).forEach((debounced) => {
      debounced.cancel?.();
    });
  });

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  // Specialized handlers for different parameter types
  const handleModeChange = async () => {
    // Mode changes need special handling to avoid audio glitches
    lastUpdateTimes.value.mode[props.number - 1] = Date.now();

    // Cancel any pending updates for this LPG
    debouncedUpdates[props.number - 1].cancel?.();

    // Mode changes should be processed immediately with proper transitions
    try {
      await updateLPG(true);
    } catch (error) {
      console.warn(
        `Error handling mode change for LPG ${props.number}:`,
        error
      );
    }
  };

  const handleParameterChange = (paramType) => {
    lastUpdateTimes.value[paramType][props.number - 1] = Date.now();

    // Mark this LPG as having pending updates
    pendingUpdates.value[props.number - 1] = true;

    // Use the appropriate debounce time based on parameter type
    // Level and modAmount changes can use standard debouncing
    debouncedUpdates[props.number - 1]();
  };

  const handleRateChange = () => {
    // Rate changes need special handling for LPG C & D
    if (props.number < 2) return;

    lastUpdateTimes.value.rate[props.number - 1] = Date.now();

    // Use longer debounce for rate changes to avoid rapid LFO reconnections
    debouncedRateUpdates[props.number - 1]();
  };

  const updateLPG = async (isModeChange = false) => {
    try {
      await ToneService.ensureStarted();

      if (!audioEngine.initialized) {
        await audioEngine.initialize();
        ToneService.setAudioEngineInitialized(true);
      }

      const lpg = {
        mode: mode.value,
        level: Math.max(0, Math.min(1.0, level.value)),
        modAmount: Math.max(0.1, Math.min(1.0, modAmount.value)),
        rate: Math.max(0.1, Math.min(10, rate.value)),
      };

      // For mode changes, use a longer delay before updating other parameters
      if (isModeChange) {
        // Update LPG parameters with smoothed values
        const success = await audioEngine.setLPGParams(props.number - 1, lpg);

        if (!success) {
          console.warn(`Failed to update LPG ${props.number} parameters`);
          return;
        }

        // Clear the pending update flag
        pendingUpdates.value[props.number - 1] = false;

        // Add a longer delay before updating LFO after mode changes
        if (props.number >= 2) {
          safeTimeout(async () => {
            try {
              await updateLPGLFO(true);
            } catch (error) {
              console.warn(
                `Error updating LPG ${props.number} LFO after mode change:`,
                error
              );
            }
          }, 150);
        }
      } else {
        // For regular parameter updates, proceed normally
        const success = await audioEngine.setLPGParams(props.number - 1, lpg);

        if (!success) {
          console.warn(`Failed to update LPG ${props.number} parameters`);
          return;
        }

        // Clear the pending update flag
        pendingUpdates.value[props.number - 1] = false;

        // For LPG C & D, update LFO with a slight delay
        if (props.number >= 2) {
          safeTimeout(async () => {
            try {
              await updateLPGLFO(false);
            } catch (error) {
              console.warn(`Error updating LPG ${props.number} LFO:`, error);
            }
          }, 80);
        }
      }
    } catch (error) {
      console.warn(`Error updating LPG ${props.number}:`, error);
      // Clear the pending flag even on error to prevent stuck states
      pendingUpdates.value[props.number - 1] = false;
    }
  };

  // Separate function for updating LFO to avoid parameter conflicts
  const updateLPGLFO = async (isModeChange) => {
    if (props.number < 2) return;

    try {
      const lpg = {
        mode: mode.value,
        level: Math.max(0, Math.min(1.0, level.value)),
        modAmount: Math.max(0.1, Math.min(1.0, modAmount.value)),
        rate: Math.max(0.1, Math.min(10, rate.value)),
      };

      if (!lpg || !lpg.loopMode) return;

      // Ensure rate is within safe bounds
      const safeRate = Math.max(0.1, Math.min(10, lpg.rate));

      // Only update LFO if rate has changed significantly
      const previousRate =
        audioEngine.getLPGLFORate?.(props.number - 1) || safeRate;

      // Use a larger threshold for significant changes to reduce unnecessary updates
      if (Math.abs(previousRate - safeRate) > 0.08) {
        const success = audioEngine.setLPGLFO(
          props.number - 1,
          isModeChange,
          safeRate
        );
        if (!success) {
          console.warn(`Failed to update LPG ${props.number} LFO rate`);
        }
      }
    } catch (error) {
      console.warn(`Error updating LPG ${props.number} LFO:`, error);
    }
  };

  // Improved debounce utility with a cancel method
  const createDebounce = (fn, delay) => {
    let timeoutId;

    const debounced = function (...args) {
      clearTimeout(timeoutId);
      timeoutId = safeTimeout(() => fn.apply(this, args), delay);
    };

    debounced.cancel = () => {
      clearTimeout(timeoutId);
    };

    return debounced;
  };

  // Create separate debounced update functions for each LPG
  // This prevents updates to one LPG from affecting others
  const debouncedUpdates = {
    0: createDebounce(() => updateLPG(0), 100),
    1: createDebounce(() => updateLPG(1), 100),
    2: createDebounce(() => updateLPG(2), 120),
    3: createDebounce(() => updateLPG(3), 120),
  };

  // Create separate debounced update functions for LFO rate changes
  // Use longer debounce times for rate changes to prevent rapid reconnections
  const debouncedRateUpdates = {
    2: createDebounce(() => updateLPGLFO(2), 180),
    3: createDebounce(() => updateLPGLFO(3), 180),
  };

  // Initialize on mount
  onMounted(async () => {
    try {
      if (ToneService.isAudioEngineInitialized()) {
        console.log("Audio already initialized in LPGControls");
        // Even if audio is initialized, we should still apply our current LPG settings
        await updateLPG();
        return;
      }

      await ToneService.ensureStarted();

      if (!audioEngine.initialized) {
        await audioEngine.initialize();
        ToneService.setAudioEngineInitialized(true);
      }

      // Apply all LPG settings immediately to ensure proper initial state
      await updateLPG();

      // Initialize LPG C & D with their independent looping mechanism
      for (let i = 2; i < 4; i++) {
        // Always enable LFO for LPG C & D
        audioEngine.setLPGLFO(i, true, rate.value);
      }
    } catch (error) {
      console.warn("Error during LPG initialization:", error);
    }
  });

  const updateAllLPGs = async () => {
    // Cancel any pending updates
    Object.values(debouncedUpdates).forEach((debounced) => {
      debounced.cancel?.();
    });
    Object.values(debouncedRateUpdates).forEach((debounced) => {
      debounced.cancel?.();
    });

    // First update all non-LFO parameters
    for (let i = 0; i < 4; i++) {
      try {
        await updateLPG(true);
        // Add a longer delay between LPG updates
        await new Promise((resolve) => {
          const id = safeTimeout(resolve, 80);
          timeoutIds.value.push(id);
        });
      } catch (error) {
        console.warn(`Error updating LPG ${i + 1} parameters:`, error);
      }
    }

    // Then update LFO states for LPG C & D with additional delay
    // This separation helps prevent audio glitches from simultaneous parameter changes
    await new Promise((resolve) => {
      const id = safeTimeout(resolve, 150);
      timeoutIds.value.push(id);
    });

    for (let i = 2; i < 4; i++) {
      try {
        // Ensure rate is within safe bounds
        const safeRate = Math.max(0.1, Math.min(10, rate.value));

        // Only update if the LFO state needs to change
        const currentRate = audioEngine.getLPGLFORate?.(i) || 0;
        if (Math.abs(currentRate - safeRate) > 0.08) {
          audioEngine.setLPGLFO(i, true, safeRate);
        }

        // Add delay between LFO updates
        await new Promise((resolve) => {
          const id = safeTimeout(resolve, 100);
          timeoutIds.value.push(id);
        });
      } catch (error) {
        console.warn(`Error updating LPG ${i + 1} LFO state:`, error);
      }
    }
  };

  // Enhanced reset function with smoother transitions
  const reset = async () => {
    // Cancel any pending updates
    Object.values(debouncedUpdates).forEach((debounced) => {
      debounced.cancel?.();
    });
    Object.values(debouncedRateUpdates).forEach((debounced) => {
      debounced.cancel?.();
    });

    const defaultValues = getDefaultValues(props.number);
    const previousValues = {
      mode: mode.value,
      level: level.value,
      modAmount: modAmount.value,
      rate: rate.value,
    };

    try {
      // First update non-mode parameters
      const tempLpg = {
        ...defaultValues,
        mode: mode.value, // Keep current mode temporarily
      };

      // For LPG 3 & 4, gradually transition the rate
      if (props.number > 2) {
        const oldRate = previousValues.rate;
        const newRate = defaultValues.rate;

        // If rate change is significant, do a gradual transition
        if (Math.abs(oldRate - newRate) > 0.5) {
          // First move halfway to the target
          tempLpg.rate = oldRate + (newRate - oldRate) * 0.5;
          rate.value = tempLpg.rate;
          await nextTick();

          if (Math.abs(oldRate - newRate) > 0.08) {
            audioEngine.setLPGLFO(props.number - 1, true, tempLpg.rate);
          }
        }
      }

      // Apply the level and modAmount changes
      level.value = tempLpg.level;
      modAmount.value = tempLpg.modAmount;
      rate.value = tempLpg.rate;
      await nextTick();

      // Update parameters but not mode
      await audioEngine.setLPGParams(props.number - 1, {
        level: tempLpg.level,
        modAmount: tempLpg.modAmount,
        mode: mode.value,
      });

      // Add delay before mode change
      await new Promise((resolve) => {
        const id = safeTimeout(resolve, 100);
        timeoutIds.value.push(id);
      });

      // Finally, update the mode
      mode.value = defaultValues.mode;
      await nextTick();
      await updateLPG(true);
    } catch (error) {
      console.warn(`Error resetting LPG ${props.number}:`, error);
    }
  };

  // Enhanced randomize with smoother transitions
  const randomize = async () => {
    // Cancel any pending updates
    Object.values(debouncedUpdates).forEach((debounced) => {
      debounced.cancel?.();
    });
    Object.values(debouncedRateUpdates).forEach((debounced) => {
      debounced.cancel?.();
    });

    const previousValues = {
      mode: mode.value,
      level: level.value,
      modAmount: modAmount.value,
      rate: rate.value,
    };

    try {
      // Generate new random values based on LPG number
      const newValues = {
        // For LPG 1 & 2, bias toward VCF mode (60% chance)
        // For LPG 3 & 4, bias toward VCF+VCA mode (60% chance)
        mode:
          props.number <= 2
            ? Math.random() < 0.6
              ? "vcf"
              : Math.random() < 0.5
              ? "vca"
              : "both"
            : Math.random() < 0.6
            ? "both"
            : Math.random() < 0.5
            ? "vcf"
            : "vca",

        // Level ranges
        level:
          props.number <= 2
            ? Math.random() * 0.4 + 0.5 // 0.5 to 0.9 for LPG 1&2
            : Math.random() * 0.3 + 0.6, // 0.6 to 0.9 for LPG 3&4

        // Modulation ranges
        modAmount:
          props.number <= 2
            ? Math.random() * 0.5 + 0.3 // 0.3 to 0.8 for LPG 1&2
            : Math.random() * 0.4 + 0.4, // 0.4 to 0.8 for LPG 3&4

        // Rate (only for LPG 3&4)
        rate:
          props.number > 2
            ? Math.random() < 0.7
              ? Math.random() * 2.8 + 0.2 // 70% chance: 0.2 to 3.0 Hz
              : Math.random() * 5 + 3 // 30% chance: 3.0 to 8.0 Hz
            : 1.0,
      };

      // First update non-mode parameters
      const tempLpg = {
        ...newValues,
        mode: mode.value, // Keep current mode temporarily
      };

      // For LPG 3 & 4, gradually transition the rate
      if (props.number > 2) {
        const oldRate = previousValues.rate;
        const newRate = newValues.rate;

        // If rate change is significant, do a gradual transition
        if (Math.abs(oldRate - newRate) > 0.5) {
          // First move halfway to the target
          tempLpg.rate = oldRate + (newRate - oldRate) * 0.5;
          rate.value = tempLpg.rate;
          await nextTick();

          if (Math.abs(oldRate - newRate) > 0.08) {
            audioEngine.setLPGLFO(props.number - 1, true, tempLpg.rate);
          }
        }
      }

      // Apply the level and modAmount changes
      level.value = tempLpg.level;
      modAmount.value = tempLpg.modAmount;
      rate.value = tempLpg.rate;
      await nextTick();

      // Update parameters but not mode
      await audioEngine.setLPGParams(props.number - 1, {
        level: tempLpg.level,
        modAmount: tempLpg.modAmount,
        mode: mode.value,
      });

      // Add delay before mode change
      await new Promise((resolve) => {
        const id = safeTimeout(resolve, 100);
        timeoutIds.value.push(id);
      });

      // Finally, update the mode
      mode.value = newValues.mode;
      await nextTick();
      await updateLPG(true);
    } catch (error) {
      console.warn(`Error randomizing LPG ${props.number}:`, error);
    }
  };

  // Expose methods for parent component
  defineExpose({
    reset,
    randomize,
    updateLPG,
  });
</script>

<style scoped>
  .module-panel {
    @apply bg-zinc-900/30 rounded-lg p-6;
  }

  .control-group {
    @apply flex flex-col items-center gap-1;
  }

  .module-value {
    @apply text-[10px] font-medium text-zinc-500 text-center mt-0.5;
  }

  .module-label {
    @apply text-[10px] font-medium text-zinc-400 text-center;
  }

  select {
    @apply appearance-none w-16 text-center cursor-pointer hover:bg-zinc-700/50 transition-colors;
  }

  select:focus {
    @apply outline-none ring-1 ring-emerald-500/50;
  }
</style>
