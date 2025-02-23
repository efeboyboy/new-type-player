<template>
  <div class="flex flex-col space-y-4">
    <!-- Start/Stop button to control playback -->
    <button
      @click="togglePlay"
      class="px-4 py-2 border rounded bg-blue-500 text-white"
    >
      {{ playing ? "Stop" : "Start" }}
    </button>

    <!-- Placeholder for knob components -->
    <div class="flex space-x-4">
      <div class="bg-gray-200 p-4 rounded">Knob 1</div>
      <div class="bg-gray-200 p-4 rounded">Knob 2</div>
      <div class="bg-gray-200 p-4 rounded">Knob 3</div>
    </div>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { store } from "../store.js";

  // Computed property for playback state
  const playing = computed(() => store.playing);

  // Method to toggle playback state
  const togglePlay = () => {
    store.togglePlaying();
  };
</script>

<style scoped>
  /* Additional styles can be added here */
</style>
