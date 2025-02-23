<template>
  <div class="module-panel">
    <div class="text-center">
      <div class="module-label">Texture</div>
    </div>

    <div class="flex flex-col items-center gap-4">
      <!-- Amount Control -->
      <div class="control-group">
        <Knob
          v-model="volume"
          :min="0"
          :max="1"
          :step="0.1"
          class="w-10 h-10"
        />
        <div class="module-value">{{ formatPercent(volume) }}</div>
        <label class="module-label">Amount</label>
      </div>

      <!-- Brightness Control -->
      <div class="control-group">
        <Knob
          v-model="filterFreq"
          :min="20"
          :max="20000"
          :step="100"
          class="w-10 h-10"
        />
        <div class="module-value">{{ formatFreq(filterFreq) }}</div>
        <label class="module-label">Brightness</label>
      </div>

      <!-- Focus Control -->
      <div class="control-group">
        <Knob
          v-model="filterQ"
          :min="0.1"
          :max="10"
          :step="0.5"
          class="w-10 h-10"
        />
        <div class="module-value">{{ filterQ.toFixed(1) }}</div>
        <label class="module-label">Focus</label>
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
    filterFreq: 1000,
    filterQ: 1,
  };

  // State
  const volume = ref(defaultValues.volume);
  const filterFreq = ref(defaultValues.filterFreq);
  const filterQ = ref(defaultValues.filterQ);

  // Formatters
  const formatPercent = (value) => `${(value * 100).toFixed(0)}%`;
  const formatFreq = (freq) =>
    freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : `${Math.round(freq)}`;

  // Update function
  const updateNoise = () => {
    audioEngine.setNoiseParams({
      volume: volume.value,
      filterFreq: filterFreq.value,
      filterQ: filterQ.value,
    });
  };

  // Reset function
  const reset = () => {
    volume.value = defaultValues.volume;
    filterFreq.value = defaultValues.filterFreq;
    filterQ.value = defaultValues.filterQ;
    updateNoise();
  };

  // Randomize function
  const randomize = () => {
    volume.value = Math.random();
    filterFreq.value = Math.exp(Math.random() * Math.log(20000 / 20)) * 20;
    filterQ.value = Math.random() * 9.9 + 0.1;
    updateNoise();
  };

  // Watch for changes
  watch([volume, filterFreq, filterQ], updateNoise);

  // Expose methods
  defineExpose({
    reset,
    randomize,
  });
</script>

<style scoped>
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
