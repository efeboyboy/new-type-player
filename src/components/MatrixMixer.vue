<!-- Full 4x4 Matrix Mixer -->
<template>
  <div class="w-full h-full flex flex-col gap-2">
    <!-- Matrix Grid -->
    <div class="grid grid-cols-5 gap-1 flex-1">
      <!-- Headers -->
      <div></div>
      <div v-for="n in 4" :key="`out-${n}`" class="text-center">
        <div class="module-label">Out {{ n }}</div>
      </div>

      <!-- Matrix rows -->
      <template v-for="i in 4" :key="`row-${i}`">
        <!-- Input label -->
        <div class="flex items-center justify-center">
          <div class="module-label">In {{ i }}</div>
        </div>
        <!-- Matrix cells -->
        <div v-for="j in 4" :key="`cell-${i}-${j}`" class="p-0.5">
          <Knob
            v-model="mixerLevels[i - 1][j - 1]"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="(v) => updateMixerPoint(i - 1, j - 1, v)"
          />
          <div class="module-value text-center mt-0.5">
            {{ formatLevel(mixerLevels[i - 1][j - 1]) }}
          </div>
        </div>
      </template>
    </div>

    <!-- Source Labels -->
    <div class="grid grid-cols-4 gap-1">
      <div v-for="(source, i) in sources" :key="source" class="text-center">
        <div class="module-label">{{ source }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
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
  const formatLevel = (value) => (value * 100).toFixed(0);

  // Update mixer point in the audio engine
  const updateMixerPoint = (input, output, value) => {
    mixerLevels.value[input][output] = value;
    audioEngine.setMixerPoint(input, output, value);
  };

  onMounted(() => {
    // Set initial diagonal connections (1:1 routing)
    for (let i = 0; i < 4; i++) {
      mixerLevels.value[i][i] = 1;
      updateMixerPoint(i, i, 1);
    }
  });
</script>

<style scoped>
  .matrix-cell {
    @apply flex flex-col items-center gap-0.5;
  }
</style>
