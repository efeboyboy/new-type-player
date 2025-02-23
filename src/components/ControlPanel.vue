<template>
  <div
    class="flex flex-col items-center justify-center space-y-6 p-4 bg-gray-50 rounded shadow"
  >
    <!-- Start/Stop Button -->
    <button
      @click="togglePlay"
      class="w-full max-w-xs px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded"
    >
      {{ playing ? "Stop" : "Start" }}
    </button>

    <!-- Tempo Knob Section using custom Knob component -->
    <div class="flex flex-col items-center">
      <div class="text-lg font-medium mb-2">Tempo</div>
      <Knob v-model="tempo" :min="40" :max="200" :step="1" />
      <div class="mt-2 text-sm">{{ tempo }} BPM</div>
    </div>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { store } from "../store.js";
  import Knob from "./Knob.vue";

  const playing = computed(() => store.playing);

  const togglePlay = () => {
    store.togglePlaying();
  };

  const tempo = computed({
    get: () => store.tempo,
    set: (val) => {
      store.tempo = val;
    },
  });
</script>

<style scoped>
  /* Additional styling if needed */
</style>
