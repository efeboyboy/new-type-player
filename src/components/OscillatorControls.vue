<template>
  <div class="module-panel">
    <div class="module-title text-center">Sound {{ number }}</div>
    <div class="grid grid-cols-1 gap-1.5">
      <!-- Octave Control -->
      <div class="control-group">
        <Knob
          v-model="octave"
          :min="-2"
          :max="2"
          :step="1"
          class="w-full aspect-square max-w-[28px]"
          @update:modelValue="updateOscillator"
        />
        <div class="module-value">{{ formatOctave(octave) }}</div>
        <label class="module-label">Octave</label>
      </div>

      <!-- Fine Pitch Control -->
      <div class="control-group">
        <Knob
          v-model="finePitch"
          :min="-12"
          :max="12"
          :step="0.1"
          class="w-full aspect-square max-w-[28px]"
          @update:modelValue="updateOscillator"
        />
        <div class="module-value">{{ formatPitch(finePitch) }}</div>
        <label class="module-label">Fine</label>
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

  const octave = ref(0);
  const finePitch = ref(0);
  const shape = ref(0);

  const updateOscillator = () => {
    // Calculate frequency with both octave and fine pitch
    const baseFreq = 440; // A4
    const octaveMultiplier = Math.pow(2, octave.value);
    const semitoneFactor = Math.pow(2, finePitch.value / 12);
    const frequency = baseFreq * octaveMultiplier * semitoneFactor;

    audioEngine.setOscillatorParams(props.number, {
      frequency: frequency,
      waveShape: shape.value / 10,
    });
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
    @apply flex flex-col items-center gap-0.5;
  }
</style>
