<template>
  <div class="grid grid-cols-2 gap-4">
    <!-- Pitch Control -->
    <div class="control-group">
      <label class="text-[10px] text-zinc-400">Pitch</label>
      <Knob
        v-model="pitch"
        :min="-24"
        :max="24"
        :step="1"
        class="w-8 h-8"
        @update:modelValue="updateOscillator"
      />
      <div class="text-[10px] text-zinc-500">{{ formatPitch(pitch) }}</div>
    </div>

    <!-- Wave Shape Control -->
    <div class="control-group">
      <label class="text-[10px] text-zinc-400">Shape</label>
      <Knob
        v-model="shape"
        :min="0"
        :max="10"
        :step="0.1"
        class="w-8 h-8"
        @update:modelValue="updateOscillator"
      />
      <div class="text-[10px] text-zinc-500">{{ shape.toFixed(1) }}</div>
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
    audioEngine.setOscillatorParams(props.number, {
      pitch: pitch.value,
      shape: shape.value,
    });
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
    @apply flex flex-col items-center gap-1;
  }
</style>
