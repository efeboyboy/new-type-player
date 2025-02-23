<template>
  <div class="matrix-mixer bg-gray-800 p-4 rounded-lg">
    <h3 class="text-lg font-semibold mb-4">Matrix Mixer</h3>

    <div class="grid grid-cols-5 gap-2">
      <!-- Headers -->
      <div class="empty-cell"></div>
      <div v-for="n in 4" :key="`out-${n}`" class="output-label">
        Out {{ n }}
      </div>

      <!-- Matrix rows -->
      <template v-for="i in 4" :key="`row-${i}`">
        <div class="input-label">In {{ i }}</div>
        <div v-for="j in 4" :key="`cell-${i}-${j}`" class="matrix-cell">
          <Knob
            v-model="mixerLevels[i - 1][j - 1]"
            :min="0"
            :max="1"
            :step="0.01"
            class="matrix-knob"
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
    color: white;
    width: fit-content;
  }

  .matrix-cell {
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .input-label,
  .output-label {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
  }

  .matrix-knob {
    width: 40px;
    height: 40px;
  }

  .empty-cell {
    width: 60px;
  }
</style>
