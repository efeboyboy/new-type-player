<template>
  <div class="module-panel">
    <div class="flex flex-col gap-2">
      <!-- Title -->
      <div class="text-center">
        <div class="module-title">Noise</div>
      </div>

      <!-- Controls -->
      <div class="flex justify-center">
        <!-- Amount Control -->
        <div class="control-group">
          <Knob
            v-model="volume"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-10 h-10"
          />
          <div class="module-value">{{ formatPercent(volume) }}</div>
          <label class="module-label">Amount</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

  // Default values
  const defaultValues = {
    volume: 0.5,
  };

  // State
  const volume = ref(defaultValues.volume);

  // Formatters
  const formatPercent = (value) => `${(value * 100).toFixed(0)}%`;

  // Update function
  const updateNoise = () => {
    audioEngine.setNoiseParams({
      volume: volume.value,
      filterFreq: 2000, // Fixed mid-high frequency for brightness
      filterQ: 1, // Fixed moderate resonance
    });
  };

  // Reset function
  const reset = () => {
    volume.value = defaultValues.volume;
    updateNoise();
  };

  // Randomize function
  const randomize = () => {
    volume.value = Math.random();
    updateNoise();
  };

  // Watch for changes
  watch(volume, updateNoise);

  // Expose methods
  defineExpose({
    reset,
    randomize,
  });
</script>

<style scoped>
  .module-panel {
    @apply bg-zinc-900/30 rounded-lg p-3;
  }

  .control-group {
    @apply flex flex-col items-center gap-1;
  }

  .module-value {
    @apply text-[10px] font-mono text-zinc-500 text-center mt-0.5;
  }

  .module-label {
    @apply text-[11px] font-medium text-zinc-400 text-center;
  }

  .module-title {
    @apply text-sm font-medium text-zinc-300;
  }
</style>
