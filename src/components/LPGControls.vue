<template>
  <div class="module-panel">
    <div class="grid grid-cols-4 gap-4">
      <div v-for="n in 4" :key="n" class="flex flex-col items-center gap-4">
        <div class="text-center">
          <div class="module-label">LPG {{ n }}</div>
        </div>

        <!-- Response -->
        <div class="control-group">
          <Knob
            v-model="lpgs[n - 1].response"
            :min="0.1"
            :max="2"
            :step="0.01"
            class="w-10 h-10"
          />
          <div class="module-value">{{ lpgs[n - 1].response.toFixed(2) }}</div>
          <label class="module-label">Resp</label>
        </div>

        <!-- Level -->
        <div class="control-group">
          <Knob
            v-model="lpgs[n - 1].level"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-10 h-10"
          />
          <div class="module-value">{{ formatPercent(lpgs[n - 1].level) }}</div>
          <label class="module-label">Level</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

  // Default values for each LPG
  const defaultLPG = {
    response: 0.5,
    level: 0.7,
  };

  const lpgs = ref(
    Array(4)
      .fill()
      .map(() => ({ ...defaultLPG }))
  );

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  const updateLPG = (index) => {
    const lpg = lpgs.value[index];
    audioEngine.setEnvelope(index, {
      timeScale: lpg.response,
      scale: lpg.level,
    });
  };

  // Reset all LPGs to default values
  const reset = () => {
    lpgs.value = lpgs.value.map(() => ({ ...defaultLPG }));
    lpgs.value.forEach((_, index) => updateLPG(index));
  };

  // Randomize all LPG parameters
  const randomize = () => {
    lpgs.value = lpgs.value.map(() => ({
      response: 0.1 + Math.random() * 1.9,
      level: Math.random(),
    }));
    lpgs.value.forEach((_, index) => updateLPG(index));
  };

  // Expose methods for parent component
  defineExpose({
    reset,
    randomize,
  });

  // Watch for changes and update audio engine
  watch(
    lpgs.value,
    () => {
      lpgs.value.forEach((_, index) => updateLPG(index));
    },
    { deep: true }
  );
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
