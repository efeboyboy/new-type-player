<template>
  <div class="text-input flex items-center gap-2">
    <textarea
      v-model="text"
      @input="handleInput"
      class="flex-1 h-10 bg-zinc-900/50 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
      placeholder="Enter text to generate sounds..."
      :disabled="!store.audioInitialized"
    ></textarea>

    <div class="flex items-center gap-2">
      <div class="text-[10px] text-zinc-500">{{ text.length }} chars</div>
      <button
        v-if="!store.audioInitialized"
        @click="initializeAudio"
        class="px-3 py-2 text-[10px] bg-emerald-500/20 text-emerald-500 rounded-lg hover:bg-emerald-500/30 transition-colors whitespace-nowrap"
      >
        Initialize Audio
      </button>
      <button
        v-else
        @click="togglePlay"
        class="px-3 py-2 text-[10px] bg-emerald-500/20 text-emerald-500 rounded-lg hover:bg-emerald-500/30 transition-colors flex items-center gap-1 whitespace-nowrap"
        :class="{ 'bg-emerald-500/30': store.playing }"
      >
        <div
          class="w-2 h-2"
          :class="
            store.playing ? 'bg-current' : 'border-l-[6px] border-current'
          "
        ></div>
        {{ store.playing ? "Stop" : "Play" }}
      </button>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import { store } from "../store.js";
  import * as Tone from "tone";

  const text = ref("");
  const emit = defineEmits(["update:text"]);

  const initializeAudio = async () => {
    try {
      await store.initializeAudio();
      console.log("Audio initialized successfully");
    } catch (error) {
      console.error("Failed to initialize audio:", error);
    }
  };

  const togglePlay = async () => {
    if (!store.audioInitialized) {
      await initializeAudio();
    }

    // Ensure Tone.js context is running
    if (Tone.context.state !== "running") {
      await Tone.context.resume();
    }

    store.togglePlaying();
  };

  const handleInput = () => {
    if (!store.audioInitialized) {
      return;
    }
    emit("update:text", text.value);
  };

  // Watch for changes
  watch(text, (newValue) => {
    if (store.audioInitialized) {
      handleInput();
    }
  });
</script>

<style scoped>
  .text-input textarea {
    font-family: theme("fontFamily.mono");
    letter-spacing: -0.5px;
  }

  .text-input textarea::-webkit-scrollbar {
    width: 4px;
  }

  .text-input textarea::-webkit-scrollbar-track {
    @apply bg-zinc-900;
  }

  .text-input textarea::-webkit-scrollbar-thumb {
    @apply bg-emerald-500/30 rounded-full hover:bg-emerald-500/50;
  }
</style>
