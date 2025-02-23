<!-- Sound Mixer -->
<template>
  <div class="module-panel">
    <!-- Output Labels Row -->
    <div class="grid grid-cols-4 gap-x-4 mb-4 pl-12">
      <div v-for="n in 4" :key="`out-${n}`" class="text-center">
        <div class="module-label">Out {{ n }}</div>
      </div>
    </div>

    <!-- Matrix Grid -->
    <div class="grid gap-y-4">
      <template v-for="i in 4" :key="`row-${i}`">
        <div class="flex">
          <!-- Input Label -->
          <div class="w-12 flex items-center">
            <div class="module-label">{{ sources[i - 1] }}</div>
          </div>

          <!-- Knob Row -->
          <div class="grid grid-cols-4 gap-4 flex-1">
            <div
              v-for="j in 4"
              :key="`cell-${i}-${j}`"
              class="flex flex-col items-center"
            >
              <Knob
                v-model="mixerLevels[i - 1][j - 1]"
                :min="0"
                :max="1"
                :step="0.1"
                class="w-10 h-10"
                @update:modelValue="(v) => updateMixerPoint(i - 1, j - 1, v)"
              />
              <div class="module-value">
                {{ formatLevel(mixerLevels[i - 1][j - 1]) }}
              </div>
            </div>
          </div>
        </div>
      </template>
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
    mixerLevels.value = Array(4)
      .fill()
      .map(
        () =>
          Array(4)
            .fill()
            .map(() => Math.random()) // 0 to 1
      );
    mixerLevels.value.forEach((row, i) => {
      row.forEach((value, j) => {
        updateMixerPoint(i, j, value);
      });
    });
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
  .module-panel {
    @apply bg-zinc-900/30 rounded-lg p-6;
  }

  .module-value {
    @apply text-[11px] font-mono text-zinc-500 text-center mt-1;
  }

  .module-label {
    @apply text-xs font-medium text-zinc-400 text-center;
  }

  .module-title {
    @apply text-sm font-medium text-zinc-300 mb-2;
  }
</style>
