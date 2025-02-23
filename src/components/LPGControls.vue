<template>
  <div class="module-panel">
    <div class="flex items-center justify-between mb-3">
      <div class="module-title">Low Pass Gate 292</div>
      <div class="flex items-center gap-2">
        <!-- Reset Button -->
        <button
          @click="resetLPGs"
          class="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center group"
          title="Reset to Default"
        >
          <RotateCcw
            :size="14"
            class="text-zinc-400 group-hover:text-emerald-400"
            stroke-width="1.5"
          />
        </button>
        <!-- Randomize Button -->
        <button
          @click="randomizeLPGs"
          class="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center group"
          title="Randomize Values"
        >
          <Shuffle
            :size="14"
            class="text-zinc-400 group-hover:text-emerald-400"
            stroke-width="1.5"
          />
        </button>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-2">
      <div v-for="n in 4" :key="n" class="flex flex-col gap-2">
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
            class="w-8 h-8"
            @update:modelValue="() => updateLPG(n - 1)"
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
            class="w-8 h-8"
            @update:modelValue="() => updateLPG(n - 1)"
          />
          <div class="module-value">{{ formatPercent(lpgs[n - 1].level) }}</div>
          <label class="module-label">Level</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref } from "vue";
  import { RotateCcw, Shuffle } from "lucide-vue-next";
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
  const resetLPGs = () => {
    lpgs.value = lpgs.value.map(() => ({ ...defaultLPG }));
    lpgs.value.forEach((_, index) => updateLPG(index));
  };

  // Randomize all LPG parameters
  const randomizeLPGs = () => {
    lpgs.value = lpgs.value.map(() => ({
      response: 0.1 + Math.random() * 1.9,
      level: Math.random(),
    }));
    lpgs.value.forEach((_, index) => updateLPG(index));
  };
</script>

<style scoped>
  .module-panel {
    @apply bg-zinc-900/30 rounded-lg p-3;
  }

  .module-title {
    @apply text-sm font-medium text-zinc-400;
  }

  .module-value {
    @apply text-[10px] font-medium text-zinc-500;
  }

  .module-label {
    @apply text-[10px] font-medium text-zinc-400;
  }

  .control-group {
    @apply flex flex-col items-center gap-1;
  }
</style>
