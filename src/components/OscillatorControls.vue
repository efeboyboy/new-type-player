<template>
  <div class="module-panel">
    <div class="flex items-center justify-between mb-3">
      <div class="module-title text-sm">OSC {{ number }}</div>
      <div class="flex items-center gap-2">
        <!-- Reset Button -->
        <button
          @click="resetOscillator"
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
          @click="randomize"
          class="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center group"
          title="Randomize Parameters"
        >
          <Shuffle
            :size="14"
            class="text-zinc-400 group-hover:text-emerald-400"
            stroke-width="1.5"
          />
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <!-- Frequency Control -->
      <div class="control-group">
        <Knob v-model="octave" :min="-2" :max="2" :step="1" class="w-12 h-12" />
        <div class="module-value">{{ formatOctave(octave) }}</div>
        <label class="module-label">Oct</label>
      </div>

      <!-- Fine Pitch Control -->
      <div class="control-group">
        <Knob
          v-model="finePitch"
          :min="-12"
          :max="12"
          :step="0.1"
          class="w-12 h-12"
        />
        <div class="module-value">{{ formatPitch(finePitch) }}</div>
        <label class="module-label">Fine</label>
      </div>

      <!-- Timbre Control -->
      <div class="control-group">
        <Knob
          v-model="shape"
          :min="0"
          :max="10"
          :step="0.1"
          class="w-12 h-12"
        />
        <div class="module-value">{{ shape.toFixed(1) }}</div>
        <label class="module-label">Timbre</label>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import { RotateCcw, Shuffle } from "lucide-vue-next";
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

  const resetOscillator = () => {
    octave.value = defaultValues.octave;
    finePitch.value = defaultValues.finePitch;
    shape.value = defaultValues.shape;
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
    @apply text-[10px] font-medium text-zinc-500;
  }

  .module-label {
    @apply text-[10px] font-medium text-zinc-400;
  }

  .module-panel {
    @apply bg-zinc-900/30 rounded-lg p-3 flex flex-col;
  }

  .module-title {
    @apply font-medium text-zinc-400;
  }
</style>
