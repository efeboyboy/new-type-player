<template>
  <div class="matrix-mixer">
    <div class="grid grid-cols-5 gap-1">
      <!-- Headers -->
      <div></div>
      <div v-for="n in 4" :key="`out-${n}`" class="text-center">
        <div class="text-[8px] text-zinc-500">{{ n }}</div>
      </div>

      <!-- Matrix rows -->
      <template v-for="i in 4" :key="`row-${i}`">
        <div class="flex items-center justify-center">
          <div class="text-[8px] text-zinc-500">{{ i }}</div>
        </div>
        <div v-for="j in 4" :key="`cell-${i}-${j}`" class="p-0.5">
          <Knob
            v-model="mixerLevels[i - 1][j - 1]"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-5 h-5"
            @update:modelValue="updateMixerPoint(i - 1, j - 1, $event)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

  // Initialize 4x4 matrix with zeros
  const mixerLevels = ref(
    Array(4)
      .fill()
      .map(() => Array(4).fill(0))
  );

  // Update mixer point in the audio engine
  const updateMixerPoint = (input, output, value) => {
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
  .matrix-mixer {
    @apply flex justify-center items-center h-full;
  }
</style>
