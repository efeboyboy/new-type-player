<template>
  <div class="flex flex-col gap-2">
    <!-- Matrix Grid -->
    <div class="grid grid-cols-4 gap-1.5">
      <template v-for="i in 4" :key="i">
        <div class="flex flex-col items-center gap-1">
          <Knob
            v-model="mixerLevels[i - 1][i - 1]"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-7 h-7"
            @update:modelValue="(v) => updateMixerPoint(i - 1, i - 1, v)"
          />
          <div class="text-[10px] font-medium text-zinc-500">
            {{ mixerLevels[i - 1][i - 1].toFixed(2) }}
          </div>
          <label class="text-[8px] text-zinc-400">{{ i }}</label>
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
  .control-group {
    @apply flex flex-col items-center gap-0.5;
  }
</style>
