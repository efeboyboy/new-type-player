<script setup>
  import { computed } from "vue";
  import TextInput from "./components/TextInput.vue";
  import Sequencer from "./components/Sequencer.vue";
  import OscillatorControls from "./components/OscillatorControls.vue";
  import MatrixMixer from "./components/MatrixMixer.vue";
  import EnvelopeControls from "./components/EnvelopeControls.vue";
  import LPGControls from "./components/LPGControls.vue";
  import SpatialControls from "./components/SpatialControls.vue";
  import Knob from "./components/Knob.vue";
  import { store } from "./store.js";
  import audioEngine from "./services/AudioEngine.js";

  const handleUpdateText = (newText) => {
    store.updateInput(newText);
  };

  const playing = computed(() => store.playing);
  const togglePlay = () => store.togglePlaying();

  const tempo = computed({
    get: () => store.tempo,
    set: (val) => {
      store.tempo = val;
      audioEngine.setTempo(val);
    },
  });
</script>

<template>
  <div class="min-h-screen w-screen bg-zinc-950 p-6 font-instrument">
    <!-- Header with transport -->
    <div
      class="flex items-center justify-between mb-6 bg-zinc-900/50 rounded-xl p-4 border border-zinc-800"
    >
      <h1 class="text-xl text-zinc-100">Buchla Type Player</h1>
      <div class="flex items-center gap-6">
        <button
          @click="togglePlay"
          class="w-10 h-10 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-500 flex items-center justify-center transition-all"
        >
          <div
            class="w-4 h-4"
            :class="playing ? 'bg-current' : 'border-l-[10px] border-current'"
          ></div>
        </button>
        <div class="flex items-center gap-3 bg-zinc-900 rounded-lg px-4 py-2">
          <span class="text-sm text-zinc-400">Tempo</span>
          <Knob
            v-model="tempo"
            :min="40"
            :max="200"
            :step="1"
            class="w-8 h-8"
          />
          <span class="text-sm font-mono text-zinc-300">{{ tempo }}</span>
        </div>
      </div>
    </div>

    <!-- Main grid -->
    <div class="grid grid-cols-12 gap-4">
      <!-- Text Input -->
      <div
        class="col-span-3 bg-zinc-900/50 rounded-xl p-4 border border-zinc-800"
      >
        <div class="text-sm text-zinc-400 mb-2">Text Input</div>
        <TextInput @update:text="handleUpdateText" />
      </div>

      <!-- Sequencer -->
      <div
        class="col-span-9 bg-zinc-900/50 rounded-xl p-4 border border-zinc-800"
      >
        <div class="text-sm text-zinc-400 mb-2">Sequencer</div>
        <Sequencer />
      </div>

      <!-- Oscillators -->
      <div class="col-span-12 grid grid-cols-3 gap-4">
        <div
          v-for="n in 3"
          :key="n"
          class="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800"
        >
          <div class="text-sm text-zinc-400 mb-2">Oscillator {{ n }}</div>
          <OscillatorControls :number="n" />
        </div>
      </div>

      <!-- Matrix Mixer -->
      <div
        class="col-span-6 bg-zinc-900/50 rounded-xl p-4 border border-zinc-800"
      >
        <div class="text-sm text-zinc-400 mb-2">Matrix Mixer</div>
        <MatrixMixer />
      </div>

      <!-- Envelopes -->
      <div
        class="col-span-6 bg-zinc-900/50 rounded-xl p-4 border border-zinc-800"
      >
        <div class="text-sm text-zinc-400 mb-2">Envelopes</div>
        <EnvelopeControls />
      </div>

      <!-- LPGs and Spatial -->
      <div class="col-span-12 grid grid-cols-2 gap-4">
        <div class="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
          <div class="text-sm text-zinc-400 mb-2">Low Pass Gates</div>
          <LPGControls />
        </div>
        <div class="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
          <div class="text-sm text-zinc-400 mb-2">Spatial Controls</div>
          <SpatialControls />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
  :root {
    --primary: theme("colors.zinc.950");
    --secondary: theme("colors.zinc.900");
    --accent: theme("colors.red.500");
    --text: theme("colors.zinc.100");
    --text-secondary: theme("colors.zinc.400");
  }

  body {
    @apply bg-zinc-950 text-zinc-100 antialiased;
  }

  .bento-box {
    @apply bg-zinc-900/50 rounded-xl p-4 border border-zinc-800;
    backdrop-filter: blur(12px);
  }

  .bento-title {
    @apply text-sm text-zinc-400 mb-2;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: var(--primary-bg);
  }

  ::-webkit-scrollbar-thumb {
    background: var(--accent-color);
    border-radius: 3px;
  }
</style>
