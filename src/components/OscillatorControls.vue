<template>
  <div class="flex flex-col gap-1.5">
    <div class="text-[10px] font-medium text-zinc-400 text-center">
      Sound {{ number }}
    </div>
    <div class="flex gap-1.5">
      <!-- Pitch Control -->
      <div class="control-group">
        <Knob
          v-model="pitch"
          :min="-24"
          :max="24"
          :step="1"
          class="w-7 h-7"
          @update:modelValue="updateOscillator"
        />
        <div class="text-[10px] font-medium text-zinc-500">
          {{ formatPitch(pitch) }}
        </div>
        <label class="text-[8px] text-zinc-400">Pitch</label>
      </div>

      <!-- Wave Shape Control -->
      <div class="control-group">
        <Knob
          v-model="shape"
          :min="0"
          :max="10"
          :step="0.1"
          class="w-7 h-7"
          @update:modelValue="updateOscillator"
        />
        <div class="text-[10px] font-medium text-zinc-500">
          {{ shape.toFixed(1) }}
        </div>
        <label class="text-[8px] text-zinc-400">Shape</label>
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
    const frequency = 440 * Math.pow(2, pitch.value / 12); // Convert semitones to frequency
    audioEngine.setOscillatorParams(props.number, {
      frequency: frequency,
      waveShape: shape.value / 10, // Normalize to 0-1 range
    });
    console.log(`OSC${props.number}:`, { frequency, shape: shape.value / 10 });
  };

  // Format pitch in semitones
  const formatPitch = (p) => {
    return p > 0 ? `+${p}` : p;
  };

  // Watch for changes
  watch([pitch, shape], updateOscillator);
</script>

<style scoped>
  .control-group {
    @apply flex flex-col items-center gap-0.5;
  }
</style>
