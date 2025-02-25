<!-- Sound Mixer -->
<template>
  <div class="h-full">
    <!-- Matrix Grid -->
    <div class="grid grid-cols-[auto_1fr] gap-x-6">
      <!-- Input Labels Column -->
      <div class="flex flex-col gap-3 pt-8">
        <div
          v-for="i in 4"
          :key="`label-${i}`"
          class="h-[73px] flex items-center justify-end"
        >
          <div class="module-label">{{ sources[i - 1] }}</div>
        </div>
      </div>

      <!-- Mixer Grid -->
      <div class="flex flex-col gap-3">
        <!-- Output Labels Row -->
        <div class="grid grid-cols-4 gap-3">
          <div v-for="n in 4" :key="`out-${n}`" class="text-center">
            <div class="module-label">Out {{ n }}</div>
          </div>
        </div>

        <!-- Knob Grid -->
        <div class="grid grid-rows-4 gap-3">
          <div v-for="i in 4" :key="`row-${i}`" class="grid grid-cols-4 gap-3">
            <div
              v-for="j in 4"
              :key="`cell-${i}-${j}`"
              class="bento-box flex flex-col items-center justify-center p-4"
            >
              <Knob
                v-model="mixerLevels[i - 1][j - 1]"
                :min="0"
                :max="1"
                :step="0.1"
                class="w-10 h-10"
                @update:modelValue="(v) => updateMixerPoint(i - 1, j - 1, v)"
              />
              <div class="module-value mt-2">
                {{ formatLevel(mixerLevels[i - 1][j - 1]) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

  // Source labels
  const sources = ["Sound 1", "Sound 2", "Sound 3", "Texture"];

  // Initialize 4x4 matrix with zeros
  const mixerLevels = ref(
    Array(4)
      .fill()
      .map(() => Array(4).fill(0))
  );

  // Format level value
  const formatLevel = (value) => `${(value * 100).toFixed(0)}%`;

  // Update mixer point
  const updateMixerPoint = (i, j, value) => {
    audioEngine.setMixerPoint(i, j, value);
  };

  // Reset to default values
  const reset = () => {
    mixerLevels.value = Array(4)
      .fill()
      .map(() => Array(4).fill(0));
    mixerLevels.value.forEach((_, i) => {
      mixerLevels.value[i][i] = 0.7; // Set diagonal to 0.7
      updateMixerPoint(i, i, 0.7);
    });
  };

  // Randomize all mixer points
  const randomize = () => {
    // First reset all values to 0
    mixerLevels.value = Array(4)
      .fill()
      .map(() => Array(4).fill(0));

    // Then only randomize the diagonal elements (direct routing)
    for (let i = 0; i < 4; i++) {
      // Random value between 0.4 and 0.9 for more musical results
      const randomLevel = Math.random() * 0.5 + 0.4;
      mixerLevels.value[i][i] = randomLevel;
      updateMixerPoint(i, i, randomLevel);
    }
  };

  // Expose methods for parent component
  defineExpose({
    reset,
    randomize,
  });

  // Initialize default values
  onMounted(() => {
    reset();
  });
</script>

<style scoped>
  .bento-box {
    @apply bg-zinc-900/50 rounded-lg border border-zinc-800/50;
    aspect-ratio: 1;
  }

  .module-value {
    @apply text-[10px] font-mono text-zinc-500;
  }

  .module-label {
    @apply text-[11px] font-medium text-zinc-400;
  }

  .module-title {
    @apply text-sm font-medium text-zinc-300;
  }
</style>
