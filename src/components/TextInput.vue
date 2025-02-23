<template>
  <div class="text-input">
    <div class="flex items-center gap-2 mb-2">
      <div class="text-xs text-zinc-400">Type something to make sounds</div>
      <div class="text-[10px] text-zinc-500 ml-auto">
        {{ text.length }} chars
      </div>
    </div>
    <div class="relative">
      <textarea
        v-model="text"
        @input="handleInput"
        class="w-full h-24 bg-zinc-900/50 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
        placeholder="Enter text to generate sounds..."
        :disabled="!store.audioInitialized"
      ></textarea>
      <div class="absolute bottom-2 right-2 flex items-center gap-2">
        <button
          v-if="!store.audioInitialized"
          @click="initializeAudio"
          class="px-2 py-1 text-[10px] bg-emerald-500/20 text-emerald-500 rounded hover:bg-emerald-500/30 transition-colors"
        >
          Initialize Audio
        </button>
        <button
          v-if="store.audioInitialized && text.length > 0"
          @click="togglePlay"
          class="px-2 py-1 text-[10px] bg-emerald-500/20 text-emerald-500 rounded hover:bg-emerald-500/30 transition-colors flex items-center gap-1"
        >
          <div
            class="w-2 h-2"
            :class="
              store.playing ? 'bg-current' : 'border-l-[6px] border-current'
            "
          ></div>
          {{ store.playing ? "Stop" : "Play" }}
        </button>
        <div
          v-else-if="store.audioInitialized"
          class="text-[10px] text-zinc-600"
        >
          <div class="flex items-center gap-1">
            <div class="w-1 h-1 rounded-full bg-current"></div>
            Waiting for input...
          </div>
        </div>
      </div>
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
