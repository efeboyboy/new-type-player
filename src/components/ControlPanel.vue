<template>
  <div class="module-panel">
    <div class="module-header">Control Panel</div>

    <div class="grid grid-cols-2 gap-4">
      <!-- Transport Controls -->
      <div class="control-group">
        <div class="flex flex-col items-center gap-2">
          <button
            @click="togglePlay"
            class="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 focus:ring-2 focus:ring-red-400 transition-all shadow-lg flex items-center justify-center"
          >
            <span class="sr-only">{{ playing ? "Stop" : "Start" }}</span>
            <div
              class="w-4 h-4"
              :class="playing ? 'bg-white' : 'border-l-8 border-white'"
            ></div>
          </button>
          <span class="text-xs font-medium">Transport</span>
        </div>
      </div>

      <!-- Tempo Control -->
      <div class="control-group">
        <div class="flex flex-col items-center gap-2">
          <div class="relative">
            <Knob
              v-model="tempo"
              :min="40"
              :max="200"
              :step="1"
              class="w-12 h-12"
            />
            <div
              class="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-2 bg-red-500"
            ></div>
          </div>
          <div class="text-center">
            <span class="text-xs font-medium">Tempo</span>
            <div class="text-sm font-bold text-red-500">{{ tempo }}</div>
          </div>
        </div>
      </div>

      <!-- Clock Divisions -->
      <div class="control-group col-span-2">
        <div class="grid grid-cols-4 gap-2">
          <div
            v-for="division in ['1/1', '1/2', '1/4', '1/8']"
            :key="division"
            class="flex flex-col items-center"
          >
            <div
              class="w-3 h-3 rounded-full bg-zinc-700 border-2 border-zinc-600"
            ></div>
            <span class="text-[10px] mt-1">{{ division }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import Knob from "./Knob.vue";
  import { store } from "../store.js";

  const playing = computed(() => store.playing);
  const togglePlay = () => store.togglePlaying();

  const tempo = computed({
    get: () => store.tempo,
    set: (val) => {
      store.tempo = val;
    },
  });
</script>

<style scoped>
  .control-group {
    @apply bg-zinc-800/50 rounded-lg p-3 flex items-center justify-center;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* Eurorack-style LED */
  .led {
    @apply w-2 h-2 rounded-full;
    box-shadow: 0 0 4px currentColor;
  }

  .led.active {
    @apply bg-red-500;
  }

  /* Knob indicator line */
  .knob-indicator {
    @apply absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-red-500;
    transform-origin: bottom center;
  }
</style>
