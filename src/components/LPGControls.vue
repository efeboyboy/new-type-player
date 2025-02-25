<template>
  <div class="module-panel">
    <div class="grid grid-cols-4 gap-4">
      <div v-for="n in 4" :key="n" class="flex flex-col items-center gap-4">
        <div class="text-center">
          <div class="module-label">{{ n }}</div>
        </div>

        <!-- Mode Selector -->
        <div class="control-group">
          <select
            v-model="lpgs[n - 1].mode"
            class="bg-zinc-800/50 text-zinc-300 text-[10px] rounded px-2 py-1 border border-zinc-700/50"
            @change="updateLPG(n - 1)"
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
            v-model="lpgs[n - 1].level"
            :min="0"
            :max="1.0"
            :step="0.01"
            class="w-10 h-10"
          />
          <div class="module-value">{{ formatPercent(lpgs[n - 1].level) }}</div>
          <label class="module-label">Level</label>
        </div>

        <!-- Mod Amount -->
        <div class="control-group">
          <Knob
            v-model="lpgs[n - 1].modAmount"
            :min="0"
            :max="1.0"
            :step="0.01"
            class="w-10 h-10"
          />
          <div class="module-value">
            {{ formatPercent(lpgs[n - 1].modAmount) }}
          </div>
          <label class="module-label">Mod</label>
        </div>

        <!-- Loop Toggle (Only visible for LPG C & D) -->
        <!-- Removed as LPG C & D are always in loop mode -->

        <!-- Rate Control (Only for LPG C & D) -->
        <div v-if="n > 2" class="control-group">
          <Knob
            v-model="lpgs[n - 1].rate"
            :min="0.1"
            :max="10"
            :step="0.1"
            class="w-10 h-10"
          />
          <div class="module-value">{{ lpgs[n - 1].rate.toFixed(1) }}Hz</div>
          <label class="module-label">Rate</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch, onMounted, nextTick } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";
  import ToneService from "../services/ToneService";
  const Tone = ToneService.getTone();

  // Refined default values based on signal path documentation
  const defaultLPG = (index) => ({
    mode: index < 2 ? "vcf" : "both", // VCF for 1&2, VCF+VCA for 3&4
    level: index < 2 ? 0.7 : 0.8, // Higher level for LPG 3&4 for better audibility
    modAmount: index < 2 ? 0.5 : 0.6, // Higher modulation for LPG 3&4 for more expressive response
    loopMode: index >= 2, // Always true for LPG C & D (indices 2 & 3)
    rate: index === 2 ? 0.8 : 1.2, // Different default rates for LPG C (0.8Hz) and D (1.2Hz)
  });

  const lpgs = ref(
    Array(4)
      .fill()
      .map((_, index) => defaultLPG(index))
  );

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  const toggleMode = async (index) => {
    // Only allow toggling for LPG C & D (index 2 & 3)
    if (index < 2) return;

    // Toggle the loop mode
    lpgs.value[index].loopMode = !lpgs.value[index].loopMode;

    // First update the LPG parameters
    await updateLPG(index);

    // Then handle the LFO state with a small delay to ensure parameters are applied
    await new Promise((resolve) => setTimeout(resolve, 10));

    try {
      // Start/stop the LFO based on loop mode
      audioEngine.setLPGLFO(
        index,
        lpgs.value[index].loopMode,
        lpgs.value[index].rate
      );
    } catch (error) {
      console.warn(`Error toggling LPG ${index} LFO:`, error);
    }
  };

  const updateLPG = async (index) => {
    try {
      await ToneService.ensureStarted();

      if (!audioEngine.initialized) {
        await audioEngine.initialize();
        ToneService.setAudioEngineInitialized(true);
      }

      const lpg = lpgs.value[index];
      if (!lpg) return;

      // Add value smoothing and clamping
      const smoothedValues = {
        mode: lpg.mode,
        level: Math.max(0, Math.min(1.0, lpg.level)),
        modAmount: Math.max(0.1, Math.min(1.0, lpg.modAmount)),
      };

      // Update LPG parameters with smoothed values
      await audioEngine.setLPGParams(index, smoothedValues);

      // Add a slightly longer delay before updating LFO to ensure parameter changes are applied
      // This helps prevent audio glitches when multiple parameters change at once
      if (index >= 2 && lpg.loopMode) {
        try {
          // Increased delay from 10ms to 30ms for better stability
          await new Promise((resolve) => setTimeout(resolve, 30));

          // Ensure rate is within safe bounds
          const safeRate = Math.max(0.1, Math.min(10, lpg.rate));

          // Only update LFO if rate has changed significantly (to reduce unnecessary updates)
          // This helps prevent clicks when small changes occur
          const previousRate = audioEngine.getLPGLFORate?.(index) || safeRate;
          if (Math.abs(previousRate - safeRate) > 0.05) {
            audioEngine.setLPGLFO(index, true, safeRate);
          }
        } catch (error) {
          console.warn(`Error updating LPG ${index} LFO:`, error);
        }
      }
    } catch (error) {
      console.warn(`Error updating LPG ${index}:`, error);
    }
  };

  // Randomize with more musical values
  const randomize = async () => {
    // First, store current values to calculate gradual transitions
    const previousValues = JSON.parse(JSON.stringify(lpgs.value));

    const newValues = lpgs.value.map((lpg, index) => {
      // Different randomization for LPG A&B vs C&D
      if (index < 2) {
        // LPG A & B: No looping, just mode, level, and modAmount
        return {
          // For LPG 1 & 2, bias toward VCF mode (60% chance)
          mode:
            Math.random() < 0.6 ? "vcf" : Math.random() < 0.5 ? "vca" : "both",
          level: Math.random() * 0.4 + 0.5, // 0.5 to 0.9 range for stronger presence
          modAmount: Math.random() * 0.5 + 0.3, // 0.3 to 0.8 range for more expressive modulation
          loopMode: false, // Always false for LPG A & B
          rate: 1.0,
        };
      } else {
        // LPG C & D: Always looping, randomize rate
        return {
          // For LPG 3 & 4, bias toward VCF+VCA mode (60% chance)
          mode:
            Math.random() < 0.6 ? "both" : Math.random() < 0.5 ? "vcf" : "vca",
          level: Math.random() * 0.3 + 0.6, // 0.6 to 0.9 range for stronger presence
          modAmount: Math.random() * 0.4 + 0.4, // 0.4 to 0.8 range for more expressive modulation
          loopMode: true, // Always true for LPG C & D
          // More musical rate range: 0.2 to 8.0 Hz with emphasis on slower rates
          rate:
            Math.random() < 0.7
              ? Math.random() * 2.8 + 0.2 // 70% chance: 0.2 to 3.0 Hz (slower, more rhythmic)
              : Math.random() * 5 + 3, // 30% chance: 3.0 to 8.0 Hz (faster, more textural)
        };
      }
    });

    // Apply changes with proper error handling and delays
    // First, update only the non-mode parameters to avoid connection changes
    for (let i = 0; i < newValues.length; i++) {
      try {
        // Create a temporary object with just level and modAmount (no mode change yet)
        const tempLpg = {
          ...lpgs.value[i],
          level: newValues[i].level,
          modAmount: newValues[i].modAmount,
        };

        // For LPG C & D, gradually transition the rate
        if (i >= 2) {
          // Gradually transition rate to avoid clicks
          const oldRate = lpgs.value[i].rate;
          const newRate = newValues[i].rate;

          // If rate change is significant, do a gradual transition
          if (Math.abs(oldRate - newRate) > 0.5) {
            // First move halfway to the target
            tempLpg.rate = oldRate + (newRate - oldRate) * 0.5;
            lpgs.value[i] = tempLpg;
            await nextTick();
            await updateLPG(i);
            await new Promise((resolve) => setTimeout(resolve, 80));
          }
        }

        // Apply the level and modAmount changes
        lpgs.value[i] = tempLpg;
        await nextTick();
        await updateLPG(i);

        // Add longer delay between updates for smoother transitions
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(
          `Error during first phase of randomizing LPG ${i}:`,
          error
        );
      }
    }

    // Now apply the mode changes and final values
    for (let i = 0; i < newValues.length; i++) {
      try {
        // Apply the final values including mode changes
        lpgs.value[i] = newValues[i];
        await nextTick();

        // Add delay between updates for smoother transitions
        await new Promise((resolve) => setTimeout(resolve, 80));

        // Update LPG parameters
        await updateLPG(i);

        // For LPG C & D, update LFO rate with additional delay
        if (i >= 2) {
          try {
            // Add a longer delay before setting LFO state
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Only update if rate has changed significantly
            const previousRate = previousValues[i].rate;
            const newRate = newValues[i].rate;

            if (Math.abs(previousRate - newRate) > 0.05) {
              audioEngine.setLPGLFO(
                i,
                true, // Always enabled for LPG C & D
                newValues[i].rate
              );
            }
          } catch (lfoError) {
            console.warn(
              `Error setting LPG ${i} LFO during randomize:`,
              lfoError
            );
          }
        }
      } catch (error) {
        console.warn(`Error randomizing LPG ${i}:`, error);
      }
    }
  };

  // Initialize on mount
  onMounted(async () => {
    try {
      if (ToneService.isAudioEngineInitialized()) {
        console.log("Audio already initialized in LPGControls");
        // Even if audio is initialized, we should still apply our current LPG settings
        await updateAllLPGs();
        return;
      }

      await ToneService.ensureStarted();

      if (!audioEngine.initialized) {
        await audioEngine.initialize();
        ToneService.setAudioEngineInitialized(true);
      }

      // Apply all LPG settings immediately to ensure proper initial state
      await updateAllLPGs();

      // Initialize LPG C & D with their independent looping mechanism
      for (let i = 2; i < 4; i++) {
        // Always enable LFO for LPG C & D
        audioEngine.setLPGLFO(i, true, lpgs.value[i].rate);
      }
    } catch (error) {
      console.warn("Error during LPG initialization:", error);
    }
  });

  const updateAllLPGs = async () => {
    // First update all non-LFO parameters
    for (let i = 0; i < lpgs.value.length; i++) {
      try {
        await updateLPG(i);
        // Add a longer delay between LPG updates
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        console.warn(`Error updating LPG ${i} parameters:`, error);
      }
    }

    // Then update LFO states for LPG C & D with additional delay
    // This separation helps prevent audio glitches from simultaneous parameter changes
    await new Promise((resolve) => setTimeout(resolve, 100));

    for (let i = 2; i < 4; i++) {
      try {
        // Ensure rate is within safe bounds
        const safeRate = Math.max(0.1, Math.min(10, lpgs.value[i].rate));

        // Only update if the LFO state needs to change
        const currentRate = audioEngine.getLPGLFORate?.(i) || 0;
        if (Math.abs(currentRate - safeRate) > 0.05) {
          audioEngine.setLPGLFO(i, true, safeRate);
        }

        // Add delay between LFO updates
        await new Promise((resolve) => setTimeout(resolve, 80));
      } catch (error) {
        console.warn(`Error updating LPG ${i} LFO state:`, error);
      }
    }
  };

  // Improve debounce utility with a cancel method
  const createDebounce = (fn, delay) => {
    let timeoutId;

    const debounced = function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };

    debounced.cancel = () => {
      clearTimeout(timeoutId);
    };

    return debounced;
  };

  // Increase debounce delay for smoother response
  const debouncedUpdate = createDebounce(updateAllLPGs, 150);

  watch(
    lpgs,
    () => {
      debouncedUpdate();
    },
    { deep: true }
  );

  // Expose methods for parent component
  defineExpose({
    reset: async () => {
      // Store current values for smooth transitions
      const previousValues = JSON.parse(JSON.stringify(lpgs.value));
      const defaultValues = Array(4)
        .fill()
        .map((_, index) => defaultLPG(index));

      // Cancel any pending updates
      debouncedUpdate.cancel?.();

      // First update non-mode parameters
      for (let i = 0; i < lpgs.value.length; i++) {
        try {
          // Create a temporary object with just level and modAmount (no mode change yet)
          const tempLpg = {
            ...lpgs.value[i],
            level: defaultValues[i].level,
            modAmount: defaultValues[i].modAmount,
          };

          // For LPG C & D, gradually transition the rate
          if (i >= 2) {
            // Gradually transition rate to avoid clicks
            const oldRate = lpgs.value[i].rate;
            const newRate = defaultValues[i].rate;

            // If rate change is significant, do a gradual transition
            if (Math.abs(oldRate - newRate) > 0.5) {
              // First move halfway to the target
              tempLpg.rate = oldRate + (newRate - oldRate) * 0.5;
              lpgs.value[i] = tempLpg;
              await nextTick();
              await updateLPG(i);
              await new Promise((resolve) => setTimeout(resolve, 60));
            }
          }

          // Apply the level and modAmount changes
          lpgs.value[i] = tempLpg;
          await nextTick();
          await updateLPG(i);

          // Add delay between updates
          await new Promise((resolve) => setTimeout(resolve, 60));
        } catch (error) {
          console.warn(
            `Error during first phase of resetting LPG ${i}:`,
            error
          );
        }
      }

      // Now apply the final values including mode changes
      lpgs.value = defaultValues;
      await nextTick();

      // Update all LPGs with final values
      for (let i = 0; i < lpgs.value.length; i++) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 40));
          await updateLPG(i);

          // For LPG C & D, ensure looping is always on
          if (i >= 2) {
            try {
              await new Promise((resolve) => setTimeout(resolve, 40));

              // Only update if rate has changed significantly
              const previousRate = previousValues[i].rate;
              const newRate = defaultValues[i].rate;

              if (Math.abs(previousRate - newRate) > 0.05) {
                audioEngine.setLPGLFO(i, true, defaultValues[i].rate);
              }
            } catch (error) {
              console.warn(`Error resetting LPG ${i} LFO:`, error);
            }
          }
        } catch (error) {
          console.warn(
            `Error during final phase of resetting LPG ${i}:`,
            error
          );
        }
      }
    },
    randomize,
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
