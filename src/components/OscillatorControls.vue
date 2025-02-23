<template>
  <div class="module-panel">
    <div class="flex items-center justify-between mb-2">
      <div class="module-title text-sm">
        Complex Oscillator 258-{{ number }}
      </div>
      <button
        @click="randomize"
        class="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center group"
      >
        <!-- Dice icon (simplified) -->
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          class="text-zinc-400 group-hover:text-emerald-400"
        >
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="2"
            stroke="currentColor"
            stroke-width="2"
          />
          <circle cx="9" cy="9" r="1.5" fill="currentColor" />
          <circle cx="15" cy="9" r="1.5" fill="currentColor" />
          <circle cx="9" cy="15" r="1.5" fill="currentColor" />
          <circle cx="15" cy="15" r="1.5" fill="currentColor" />
        </svg>
      </button>
    </div>

    <div class="flex flex-col gap-3">
      <!-- Frequency Control -->
      <div class="control-group">
        <Knob
          v-model="octave"
          :min="-2"
          :max="2"
          :step="1"
          class="w-full aspect-square max-w-[32px]"
        />
        <div class="module-value text-sm">{{ formatOctave(octave) }}</div>
        <label class="module-label text-xs">Octave</label>
      </div>

      <!-- Harmonic Control -->
      <div class="control-group">
        <Knob
          v-model="finePitch"
          :min="-12"
          :max="12"
          :step="0.1"
          class="w-full aspect-square max-w-[32px]"
        />
        <div class="module-value text-sm">{{ formatPitch(finePitch) }}</div>
        <label class="module-label text-xs">Fine</label>
      </div>

      <!-- Timbre Control -->
      <div class="control-group">
        <Knob
          v-model="shape"
          :min="0"
          :max="10"
          :step="0.1"
          class="w-full aspect-square max-w-[32px]"
        />
        <div class="module-value text-sm">{{ shape.toFixed(1) }}</div>
        <label class="module-label text-xs">Timbre</label>
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
    shape: 5,
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
      waveShape: shape.value / 10,
    });
  };

  const randomize = () => {
    octave.value = Math.floor(Math.random() * 5) - 2;
    finePitch.value = Math.round((Math.random() * 24 - 12) * 10) / 10;
    shape.value = Math.round(Math.random() * 100) / 10;
  };

  const formatOctave = (oct) => {
    return oct > 0 ? `+${oct}` : oct;
  };

  const formatPitch = (p) => {
    return p > 0 ? `+${p.toFixed(1)}` : p.toFixed(1);
  };

  watch([octave, finePitch, shape], updateOscillator);
</script>

<style scoped>
  .control-group {
    @apply flex flex-col items-center gap-1;
  }

  .module-value {
    @apply font-medium text-zinc-300;
  }

  .module-label {
    @apply font-medium text-zinc-500;
  }

  .module-panel {
    @apply bg-zinc-900/30 rounded-lg p-3 flex flex-col;
  }
</style>
