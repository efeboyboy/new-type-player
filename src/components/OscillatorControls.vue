<template>
  <div class="module-panel">
    <div class="flex flex-col gap-2">
      <!-- Title -->
      <div class="text-center">
        <div class="module-title">Sound {{ number }}</div>
      </div>

      <!-- Controls in a row -->
      <div class="flex gap-3 justify-center">
        <!-- Fine Tune Control -->
        <div class="control-group">
          <Knob
            v-model="finePitch"
            :min="-12"
            :max="12"
            :step="1"
            class="w-10 h-10"
          />
          <div class="module-value">{{ formatPitch(finePitch) }}</div>
          <label class="module-label">Tune</label>
        </div>

        <!-- Color Control -->
        <div class="control-group">
          <Knob
            v-model="shape"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-10 h-10"
          />
          <div class="module-value">{{ formatPercent(shape) }}</div>
          <label class="module-label">Color</label>
        </div>
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

  // Default values
  const defaultValues = {
    finePitch: 0,
    shape: 0.33, // Start with gentle folding
  };

  const finePitch = ref(defaultValues.finePitch);
  const shape = ref(defaultValues.shape);

  const updateOscillator = () => {
    const baseFreq = 440; // A4
    const semitoneFactor = Math.pow(2, finePitch.value / 12);
    const frequency = baseFreq * semitoneFactor;

    audioEngine.setOscillatorParams(props.number, {
      frequency: frequency,
      waveShape: shape.value,
    });
  };

  const formatPitch = (p) => {
    return p > 0 ? `+${p.toFixed(1)}` : p.toFixed(1);
  };

  const formatPercent = (value) => {
    // Simplified descriptions
    const percent = Math.round(value * 100);
    return `${percent}%`;
  };

  // Expose methods for parent component
  defineExpose({
    reset: () => {
      finePitch.value = defaultValues.finePitch;
      shape.value = defaultValues.shape;
    },
    randomize: () => {
      finePitch.value = Math.random() * 24 - 12;
      // Favor the middle range for more musical results
      shape.value = 0.33 + Math.random() * 0.34;
    },
  });

  watch([finePitch, shape], updateOscillator);
</script>

<style scoped>
  .module-panel {
    @apply bg-zinc-900/30 rounded-lg p-3 h-full;
  }

  .control-group {
    @apply flex flex-col items-center gap-1;
  }

  .module-value {
    @apply text-[10px] font-mono text-zinc-500 text-center mt-0.5;
  }

  .module-label {
    @apply text-[11px] font-medium text-zinc-400 text-center;
  }

  .module-title {
    @apply text-sm font-medium text-zinc-300;
  }
</style>
