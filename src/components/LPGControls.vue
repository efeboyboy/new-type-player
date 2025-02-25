<template>
  <div class="module-panel">
    <div class="grid grid-cols-4 gap-4">
      <div v-for="n in 4" :key="n" class="flex flex-col items-center gap-4">
        <div class="text-center">
          <div class="module-label">{{ n }}</div>
        </div>

        <!-- Response -->
        <div class="control-group">
          <Knob
            v-model="lpgs[n - 1].rise"
            :min="0.001"
            :max="0.1"
            :step="0.001"
            class="w-10 h-10"
          />
          <div class="module-value">{{ formatTime(lpgs[n - 1].rise) }}</div>
          <label class="module-label">Speed</label>
        </div>

        <!-- Sustain -->
        <div class="control-group">
          <Knob
            v-model="lpgs[n - 1].fall"
            :min="0.05"
            :max="0.5"
            :step="0.01"
            class="w-10 h-10"
          />
          <div class="module-value">{{ formatTime(lpgs[n - 1].fall) }}</div>
          <label class="module-label">Hold</label>
        </div>

        <!-- Level -->
        <div class="control-group">
          <Knob
            v-model="lpgs[n - 1].level"
            :min="0.5"
            :max="1"
            :step="0.01"
            class="w-10 h-10"
          />
          <div class="module-value">{{ formatPercent(lpgs[n - 1].level) }}</div>
          <label class="module-label">Amount</label>
        </div>

        <!-- Mode Toggle -->
        <button
          @click="toggleMode(n - 1)"
          :class="[
            lpgs[n - 1].loopMode
              ? 'bg-emerald-500/20 text-emerald-500'
              : 'bg-zinc-800/50 text-zinc-400',
            'px-2 py-1 text-[10px] rounded transition-colors flex items-center justify-center w-8 h-8',
          ]"
        >
          <span>{{ lpgs[n - 1].loopMode ? "↻" : "→" }}</span>
        </button>
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

  // Refined default values based on Buchla Cookbook
  const defaultLPG = {
    rise: 0.005, // 5ms rise time - snappy attack
    fall: 0.15, // 150ms fall time - natural decay
    level: 0.85, // 85% level for good presence
    loopMode: false,
  };

  const lpgs = ref(
    Array(4)
      .fill()
      .map((_, index) => ({
        rise: index === 3 ? 0.01 : 0.005, // Slightly slower attack for noise
        fall: index === 3 ? 0.2 : 0.15, // Longer decay for noise
        level: index === 3 ? 0.7 : 0.85, // Lower level for noise
        loopMode: false,
      }))
  );

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  const formatTime = (value) => {
    if (value < 0.01) {
      return `${(value * 1000).toFixed(1)}ms`;
    }
    return `${(value * 1000).toFixed(0)}ms`;
  };

  const toggleMode = (index) => {
    lpgs.value[index].loopMode = !lpgs.value[index].loopMode;
    updateLPG(index);
  };

  const updateLPG = async (index) => {
    try {
      // Ensure audio context is running
      await ToneService.ensureStarted();

      // Wait for audio engine initialization
      if (!audioEngine.initialized) {
        await audioEngine.initialize();
        ToneService.setAudioEngineInitialized(true);
      }

      const lpg = lpgs.value[index];
      if (!lpg) return;

      // Set envelope parameters first
      audioEngine.setEnvelope(index, {
        attack: lpg.rise,
        release: lpg.fall,
        sustain: lpg.level,
        timeScale: 1,
      });

      // Set LPG mode (envelope or LFO)
      audioEngine.setEnvelopeLFO(
        index,
        lpg.loopMode,
        1 / (lpg.rise + lpg.fall)
      );

      // Set the LPG parameters
      audioEngine.setLPGParams(index, {
        response: lpg.rise,
        level: lpg.level,
      });
    } catch (error) {
      console.warn(`Error updating LPG ${index}:`, error);
    }
  };

  // Randomize values
  const randomize = async () => {
    // Create new values within the proper ranges for each parameter
    const newValues = lpgs.value.map(() => ({
      rise: Math.random() * 0.099 + 0.001, // 0.001 to 0.1 (min to max from knob props)
      fall: Math.random() * 0.45 + 0.05, // 0.05 to 0.5 (min to max from knob props)
      level: Math.random() * 0.5 + 0.5, // 0.5 to 1 (min to max from knob props)
      loopMode: Math.random() > 0.5, // Random mode
    }));

    // Update values
    lpgs.value = newValues;

    // Wait for Vue to update the DOM
    await nextTick();

    // Update audio engine with a small delay between each LPG to prevent audio glitches
    for (let i = 0; i < lpgs.value.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      await updateLPG(i);
    }
  };

  // Add debounce utility
  const debounce = (fn, delay) => {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  };

  // Initialize on mount with default values and proper sequencing
  onMounted(async () => {
    try {
      // Check if audio is already initialized
      if (ToneService.isAudioEngineInitialized()) {
        console.log("Audio already initialized in LPGControls");
        return;
      }

      // First ensure audio context is started
      await ToneService.ensureStarted();

      // Then initialize audio engine if not already initialized
      if (!audioEngine.initialized) {
        await audioEngine.initialize();
        ToneService.setAudioEngineInitialized(true);
      }

      // Wait a bit for everything to settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Initialize all LPGs at once
      await updateAllLPGs();
    } catch (error) {
      console.warn("Error during LPG initialization:", error);
    }
  });

  // New method to update all LPGs at once
  const updateAllLPGs = async () => {
    for (let i = 0; i < lpgs.value.length; i++) {
      await updateLPG(i);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  };

  // Increase debounce time to prevent rapid updates
  const debouncedUpdate = debounce(updateAllLPGs, 100);

  // Watch for changes and update audio engine
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
      // Create new values with defaults
      const newValues = Array(4)
        .fill()
        .map((_, index) => ({
          rise: index === 3 ? 0.01 : 0.005,
          fall: index === 3 ? 0.2 : 0.15,
          level: index === 3 ? 0.7 : 0.85,
          loopMode: false,
        }));

      // Update values
      lpgs.value = newValues;

      // Wait for Vue to update the DOM
      await nextTick();

      // Update audio engine with a small delay between each LPG to prevent audio glitches
      for (let i = 0; i < lpgs.value.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        await updateLPG(i);
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
</style>
