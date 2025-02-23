<template>
  <div class="grid grid-cols-2 gap-4">
    <div v-for="n in 4" :key="n" class="lpg-group">
      <div class="text-[10px] text-zinc-500 mb-2">{{ n }}</div>
      <div class="grid grid-cols-2 gap-2">
        <div class="control-group">
          <label class="text-[10px] text-zinc-400">Shape</label>
          <Knob
            v-model="lpgs[n - 1].response"
            :min="0.1"
            :max="2"
            :step="0.01"
            class="w-8 h-8"
            @update:modelValue="updateLPG(n - 1)"
          />
        </div>
        <div class="control-group">
          <label class="text-[10px] text-zinc-400">Level</label>
          <Knob
            v-model="lpgs[n - 1].level"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-8 h-8"
            @update:modelValue="updateLPG(n - 1)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

  const lpgs = ref(
    Array(4)
      .fill()
      .map(() => ({
        response: 0.5,
        level: 0.7,
      }))
  );

  const updateLPG = (index) => {
    const lpg = lpgs.value[index];
    audioEngine.setEnvelope(index, {
      timeScale: lpg.response,
      scale: lpg.level,
    });
  };
</script>

<style scoped>
  .control-group {
    @apply flex flex-col items-center gap-1;
  }

  .lpg-group {
    @apply bg-zinc-900/30 rounded-lg p-3;
  }
</style>
