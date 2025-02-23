<!-- Full 4x4 Matrix Mixer -->
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
            <div class="module-label">In {{ i }}</div>
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
                :step="0.01"
                class="w-10 h-10"
                @update:modelValue="(v) => updateMixerPoint(i - 1, j - 1, v)"
              />
              <div class="module-value text-[10px]">
                {{ formatLevel(mixerLevels[i - 1][j - 1]) }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Source Labels -->
    <div class="grid grid-cols-4 gap-4 pl-12 mt-2">
      <div v-for="(source, i) in sources" :key="source" class="text-center">
        <div class="module-label">{{ source }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import { RotateCcw, Shuffle } from "lucide-vue-next";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

  // Source labels
  const sources = ["Osc 1", "Osc 2", "Osc 3", "Noise"];

  // Initialize 4x4 matrix with zeros
  const mixerLevels = ref(
    Array(4)
      .fill()
      .map(() => Array(4).fill(0))
  );

  // Format level value
  const formatLevel = (value) => `${(value * 100).toFixed(0)}`;

  // Update mixer point in the audio engine
  const updateMixerPoint = (input, output, value) => {
    mixerLevels.value[input][output] = value;
    audioEngine.setMixerPoint(input, output, value);
  };

  // Reset mixer to default state (diagonal connections)
  const reset = () => {
    mixerLevels.value = mixerLevels.value.map((row, i) =>
      row.map((_, j) => (i === j ? 0.7 : 0))
    );
    mixerLevels.value.forEach((row, i) => {
      row.forEach((value, j) => {
        audioEngine.setMixerPoint(i, j, value);
      });
    });
  };

  // Randomize mixer values
  const randomize = () => {
    mixerLevels.value = mixerLevels.value.map((row) =>
      row.map(() => Math.random() * 0.8)
    );
    mixerLevels.value.forEach((row, i) => {
      row.forEach((value, j) => {
        audioEngine.setMixerPoint(i, j, value);
      });
    });
  };

  // Expose methods for parent component
  defineExpose({
    reset,
    randomize,
  });

  onMounted(() => {
    // Set initial diagonal connections (1:1 routing)
    reset();
  });
</script>

<style scoped>
  .module-panel {
    @apply bg-zinc-900/30 rounded-lg p-6;
  }

  .module-title {
    @apply text-sm font-medium text-zinc-400;
  }

  .module-value {
    @apply font-medium text-zinc-500 text-center mt-0.5;
  }

  .module-label {
    @apply text-[10px] font-medium text-zinc-400;
  }
</style>
