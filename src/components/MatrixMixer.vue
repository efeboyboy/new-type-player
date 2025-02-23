<!-- Full 4x4 Matrix Mixer -->
<template>
  <div class="module-panel">
    <div class="flex items-center justify-between mb-3">
      <div class="module-title">Matrix Mixer 292</div>
      <div class="flex items-center gap-2">
        <!-- Reset Button -->
        <button
          @click="resetMixer"
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
          @click="randomizeMixer"
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

    <!-- Matrix Grid -->
    <div class="grid grid-cols-5 gap-2">
      <!-- Empty top-left corner -->
      <div></div>
      <!-- Output Labels -->
      <div v-for="n in 4" :key="`out-${n}`" class="text-center">
        <div class="module-label">Out {{ n }}</div>
      </div>

      <!-- Matrix rows -->
      <template v-for="i in 4" :key="`row-${i}`">
        <!-- Input label -->
        <div class="flex items-center justify-end pr-2">
          <div class="module-label">In {{ i }}</div>
        </div>
        <!-- Matrix cells -->
        <div
          v-for="j in 4"
          :key="`cell-${i}-${j}`"
          class="flex flex-col items-center gap-1"
        >
          <Knob
            v-model="mixerLevels[i - 1][j - 1]"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-8 h-8"
            @update:modelValue="(v) => updateMixerPoint(i - 1, j - 1, v)"
          />
          <div class="module-value">
            {{ formatLevel(mixerLevels[i - 1][j - 1]) }}
          </div>
        </div>
      </template>
    </div>

    <!-- Source Labels -->
    <div class="grid grid-cols-4 gap-2 mt-3">
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
  const resetMixer = () => {
    mixerLevels.value = mixerLevels.value.map((row, i) =>
      row.map((_, j) => (i === j ? 0.7 : 0))
    );
    // Update all points in audio engine
    mixerLevels.value.forEach((row, i) => {
      row.forEach((value, j) => {
        audioEngine.setMixerPoint(i, j, value);
      });
    });
  };

  // Randomize mixer values
  const randomizeMixer = () => {
    mixerLevels.value = mixerLevels.value.map(
      (row) => row.map(() => Math.random() * 0.8) // Random values between 0 and 0.8
    );
    // Update all points in audio engine
    mixerLevels.value.forEach((row, i) => {
      row.forEach((value, j) => {
        audioEngine.setMixerPoint(i, j, value);
      });
    });
  };

  onMounted(() => {
    // Set initial diagonal connections (1:1 routing)
    resetMixer();
  });
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
</style>
