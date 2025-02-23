<script setup>
  import { computed } from "vue";
  import TextInput from "./components/TextInput.vue";
  import Sequencer from "./components/Sequencer.vue";
  import OscillatorControls from "./components/OscillatorControls.vue";
  import MatrixMixer from "./components/MatrixMixer.vue";
  import EnvelopeControls from "./components/EnvelopeControls.vue";
  import LPGControls from "./components/LPGControls.vue";
  import FilterControls from "./components/FilterControls.vue";
  import SpatialControls from "./components/SpatialControls.vue";
  import Knob from "./components/Knob.vue";
  import { store } from "./store.js";
  import audioEngine from "./services/AudioEngine.js";

  const handleUpdateText = (newText) => {
    store.updateInput(newText);
  };

  const tempo = computed({
    get: () => store.tempo,
    set: (val) => {
      store.tempo = val;
      audioEngine.setTempo(val);
    },
  });
</script>

<template>
  <div class="min-h-screen w-screen bg-zinc-950 p-4 font-instrument">
    <!-- Main Control Panel -->
    <div class="flex flex-row items-center justify-between gap-4 mb-4">
      <h1 class="text-xl font-semibold text-zinc-100 whitespace-nowrap">
        Type Player
      </h1>

      <div
        class="flex items-center gap-3 bg-zinc-900/50 rounded-lg px-4 py-2 whitespace-nowrap"
      >
        <span class="text-sm font-medium text-zinc-400">Speed</span>
        <Knob v-model="tempo" :min="40" :max="200" :step="1" class="w-8 h-8" />
        <span class="text-sm font-mono text-zinc-300">{{ tempo }}</span>
      </div>

      <div class="flex-1">
        <TextInput @update:text="handleUpdateText" />
      </div>
    </div>

    <!-- Main Grid -->
    <div class="grid grid-rows-[1.2fr_1fr] gap-4 h-[calc(100vh-8rem)]">
      <!-- Top Row: Sound Sources and Matrix -->
      <div class="grid grid-cols-2 gap-4">
        <!-- Sound Sources (Sun Path) -->
        <div class="bento-box">
          <div class="bento-title flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-emerald-500/40"></div>
            Complex Oscillators 258
          </div>
          <div class="grid grid-cols-3 gap-4 h-full">
            <OscillatorControls v-for="n in 3" :key="n" :number="n" />
          </div>
        </div>

        <!-- Matrix Mixer -->
        <div class="bento-box">
          <div class="bento-title">Matrix Mixer</div>
          <div class="module-content">
            <MatrixMixer />
          </div>
        </div>
      </div>

      <!-- Bottom Row: Shape, Gate, Tone, Space -->
      <div class="grid grid-cols-4 gap-4">
        <!-- Shape (Envelope Generators) -->
        <div class="bento-box">
          <div class="bento-title">Shape</div>
          <div class="module-content">
            <EnvelopeControls />
          </div>
        </div>

        <!-- Gate (Low Pass Gates) -->
        <div class="bento-box">
          <div class="bento-title">Gate</div>
          <div class="module-content">
            <LPGControls />
          </div>
        </div>

        <!-- Tone (Filters) -->
        <div class="bento-box">
          <div class="bento-title">Tone</div>
          <div class="module-content">
            <FilterControls />
          </div>
        </div>

        <!-- Space (Spatial Director) -->
        <div class="bento-box">
          <div class="bento-title">Space</div>
          <div class="module-content">
            <SpatialControls />
          </div>
        </div>
      </div>
    </div>

    <!-- Debug Sequencer (hidden but active) -->
    <div class="hidden">
      <Sequencer />
    </div>
  </div>
</template>

<style>
  :root {
    --primary: theme("colors.zinc.950");
    --secondary: theme("colors.zinc.900");
    --accent: theme("colors.emerald.500");
    --text: theme("colors.zinc.100");
    --text-secondary: theme("colors.zinc.400");
  }

  body {
    @apply bg-zinc-950 text-zinc-100 antialiased overflow-hidden;
  }

  .bento-box {
    @apply bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 overflow-hidden;
    backdrop-filter: blur(12px);
  }

  .bento-title {
    @apply text-sm font-medium text-zinc-400 mb-2 pb-2 border-b border-zinc-800/50;
  }

  /* Tooltip */
  [title] {
    position: relative;
  }

  [title]:hover::after {
    content: attr(title);
    @apply absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-zinc-800 rounded;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }

  ::-webkit-scrollbar-track {
    @apply bg-zinc-900;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-emerald-500/30 rounded-full hover:bg-emerald-500/50;
  }
</style>
