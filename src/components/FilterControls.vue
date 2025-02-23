<template>
  <div class="grid grid-cols-2 gap-4">
    <!-- Tone Control -->
    <div class="control-group">
      <label class="text-[10px] text-zinc-400">Tone</label>
      <Knob
        v-model="tone"
        :min="20"
        :max="20000"
        :step="1"
        class="w-8 h-8"
        @update:modelValue="updateFilter"
      />
      <div class="text-[10px] text-zinc-500">{{ formatFreq(tone) }}</div>
    </div>

    <!-- Character Control -->
    <div class="control-group">
      <label class="text-[10px] text-zinc-400">Character</label>
      <Knob
        v-model="character"
        :min="0"
        :max="10"
        :step="0.1"
        class="w-8 h-8"
        @update:modelValue="updateFilter"
      />
      <div class="text-[10px] text-zinc-500">{{ character.toFixed(1) }}</div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

  const tone = ref(1000);
  const character = ref(1);

  const updateFilter = () => {
    // Update all oscillator filters with the same values for now
    for (let i = 1; i <= 3; i++) {
      audioEngine.setFilter(i, tone.value, character.value);
    }
    // Update tone shaper
    audioEngine.setToneShape(0, character.value * 2, 0);
  };

  // Format frequency in Hz or kHz
  const formatFreq = (freq) => {
    return freq >= 1000
      ? `${(freq / 1000).toFixed(1)}k`
      : `${Math.round(freq)}`;
  };

  // Watch for changes
  watch([tone, character], updateFilter);
</script>

<style scoped>
  .control-group {
    @apply flex flex-col items-center gap-1;
  }
</style>
