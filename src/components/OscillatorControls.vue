<template>
  <div class="module-panel">
    <div class="module-title text-center">Sound {{ number }}</div>
    <div class="grid grid-cols-1 gap-1.5">
      <!-- Pitch Control -->
      <div class="control-group">
        <Knob
          v-model="pitch"
          :min="-24"
          :max="24"
          :step="1"
          class="w-full aspect-square max-w-[28px]"
          @update:modelValue="updateOscillator"
        />
        <div class="module-value">{{ formatPitch(pitch) }}</div>
        <label class="module-label">Pitch</label>
      </div>

      <!-- Wave Shape Control -->
      <div class="control-group">
        <Knob
          v-model="shape"
          :min="0"
          :max="10"
          :step="0.1"
          class="w-full aspect-square max-w-[28px]"
          @update:modelValue="updateOscillator"
        />
        <div class="module-value">{{ shape.toFixed(1) }}</div>
        <label class="module-label">Shape</label>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

  const props = defineProps({
    number: {
      type: Number,
      required: true,
    },
  });

  const pitch = ref(0);
  const shape = ref(0);

  const updateOscillator = () => {
    const frequency = 440 * Math.pow(2, pitch.value / 12);
    audioEngine.setOscillatorParams(props.number, {
      frequency: frequency,
      waveShape: shape.value / 10,
    });
  };

  const formatPitch = (p) => {
    return p > 0 ? `+${p}` : p;
  };

  watch([pitch, shape], updateOscillator);
</script>

<style scoped>
  .control-group {
    @apply flex flex-col items-center gap-0.5;
  }
</style>
