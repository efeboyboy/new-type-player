<template>
  <div class="module-panel">
    <div class="text-center mb-3">
      <div class="module-title text-sm">Sound {{ number }}</div>
    </div>

    <div class="flex flex-col items-center gap-4">
      <!-- Pitch Control -->
      <div class="control-group">
        <Knob v-model="octave" :min="-3" :max="3" :step="1" class="w-12 h-12" />
        <div class="module-value">{{ formatOctave(octave) }}</div>
        <label class="module-label">Pitch</label>
      </div>

      <!-- Fine Tune Control -->
      <div class="control-group">
        <Knob
          v-model="finePitch"
          :min="-12"
          :max="12"
          :step="1"
          class="w-12 h-12"
        />
        <div class="module-value">{{ formatPitch(finePitch) }}</div>
        <label class="module-label">Fine Tune</label>
      </div>

      <!-- Color Control -->
      <div class="control-group">
        <Knob
          v-model="shape"
          :min="0"
          :max="1"
          :step="0.01"
          class="w-12 h-12"
        />
        <div class="module-value">{{ formatPercent(shape) }}</div>
        <label class="module-label">Color</label>
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
    octave: 0,
    finePitch: 0,
    shape: 0.5,
  };

  const octave = ref(defaultValues.octave);
  const finePitch = ref(defaultValues.finePitch);
  const shape = ref(defaultValues.shape);

  const updateOscillator = () => {
    const baseFreq = 440; // A4
    const octaveMultiplier = Math.pow(2, octave.value);
    const semitoneFactor = Math.pow(2, finePitch.value / 12);
    const frequency = baseFreq * octaveMultiplier * semitoneFactor;

    audioEngine.setOscillatorParams(props.number, {
      frequency: frequency,
      waveShape: shape.value,
    });
  };

  const formatOctave = (oct) => {
    return oct > 0 ? `+${oct}` : oct;
  };

  const formatPitch = (p) => {
    return p > 0 ? `+${p.toFixed(1)}` : p.toFixed(1);
  };

  const formatPercent = (value) => {
    return `${Math.round(value * 100)}%`;
  };

  // Expose methods for parent component
  defineExpose({
    reset: () => {
      octave.value = defaultValues.octave;
      finePitch.value = defaultValues.finePitch;
      shape.value = defaultValues.shape;
    },
    randomize: () => {
      octave.value = Math.floor(Math.random() * 7) - 3;
      finePitch.value = Math.random() * 24 - 12;
      shape.value = Math.random();
    },
  });

  watch([octave, finePitch, shape], updateOscillator);
</script>

<style scoped>
  .control-group {
    @apply flex flex-col items-center gap-2;
  }

  .module-panel {
    @apply bg-zinc-900/30 rounded-lg p-4 flex flex-col items-center;
  }

  .module-title {
    @apply text-sm font-medium text-zinc-300 mb-2;
  }

  .module-value {
    @apply text-[11px] font-mono text-zinc-500 text-center mt-1;
  }

  .module-label {
    @apply text-xs font-medium text-zinc-400 text-center;
  }
</style>
