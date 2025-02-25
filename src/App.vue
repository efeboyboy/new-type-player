<script setup>
  import { computed, ref, onMounted, onUnmounted } from "vue";
  import TextInput from "./components/TextInput.vue";
  import Sequencer from "./components/Sequencer.vue";
  import OscillatorControls from "./components/OscillatorControls.vue";
  import NoiseControls from "./components/NoiseControls.vue";
  import MatrixMixer from "./components/MatrixMixer.vue";
  import EnvelopeControls from "./components/EnvelopeControls.vue";
  import LPGControls from "./components/LPGControls.vue";
  import FilterControls from "./components/FilterControls.vue";
  import SpatialControls from "./components/SpatialControls.vue";
  import Knob from "./components/Knob.vue";
  import { store } from "./store.js";
  import audioEngine from "./services/AudioEngine.js";
  import {
    RotateCcw,
    Shuffle,
    AudioWaveform,
    ActivityIcon,
    NetworkIcon,
    SwitchCameraIcon,
    SlidersIcon,
    CompassIcon,
    HelpCircle,
  } from "lucide-vue-next";
  import AIControls from "./components/AIControls.vue";
  import IconHolder from "./components/IconHolder.vue";
  import HelpModal from "./components/HelpModal.vue";
  import InitModal from "./components/InitModal.vue";
  import { Teleport } from "vue";
  import TestOscillator from "./components/TestOscillator.vue";

  const tempo = computed({
    get: () => store.tempo,
    set: (val) => {
      store.tempo = val;
      audioEngine.setTempo(val);
    },
  });

  // Add volume state management
  const previousVolume = ref(0.6); // Default volume
  const volume = computed({
    get: () => store.volume ?? 0.6, // Default to 0.6 if undefined
    set: (val) => {
      // Ensure val is a number and clamp between 0 and 1
      const numVal = Number(val);
      const clampedValue = isNaN(numVal) ? 0 : Math.max(0, Math.min(1, numVal));
      store.volume = clampedValue;
      audioEngine.setMasterVolume(clampedValue);
    },
  });

  // Update handleUpdateText to manage volume based on text content
  const handleUpdateText = (newText) => {
    store.updateInput(newText);

    // If text is empty, store current volume and mute with longer fade
    if (!newText.trim()) {
      if (store.volume > 0) {
        previousVolume.value = store.volume;
      }
      store.volume = 0;
      audioEngine.setMasterVolume(0, 0.5); // 500ms fade out
      isPlaying.value = false;
    } else if (volume.value === 0) {
      // If adding text and currently muted, restore previous volume with quick fade
      store.volume = previousVolume.value;
      audioEngine.setMasterVolume(previousVolume.value, 0.1); // 100ms fade in
    }
  };

  const osc1 = ref(null);
  const osc2 = ref(null);
  const osc3 = ref(null);
  const noiseControls = ref(null);
  const matrixMixer = ref(null);
  const envelopeShapeControls = ref(null);
  const envelopeBehaviorControls = ref(null);
  const lpgControls = ref(null);
  const filterControls = ref(null);
  const spatialControls = ref(null);

  const resetAllOscillators = () => {
    [osc1.value, osc2.value, osc3.value, noiseControls.value].forEach(
      (control) => {
        if (control?.reset) {
          control.reset();
        }
      }
    );
  };

  const randomizeAllOscillators = () => {
    [osc1.value, osc2.value, osc3.value, noiseControls.value].forEach(
      (control) => {
        if (control?.randomize) {
          control.randomize();
        }
      }
    );
  };

  const isPlaying = ref(false);
  const currentSequence = ref(null);

  const showHelp = ref(false);
  const showInitModal = ref(true);

  // Handle text changes
  const handleTextChange = (text) => {
    currentSequence.value = audioEngine.generateSequence(text);
  };

  // Handle AI-generated sequences
  const handleAISequence = (sequence) => {
    // Convert Magenta sequence to our format
    currentSequence.value = audioEngine.convertFromMagentaSequence(sequence);
  };

  // Playback controls
  const togglePlay = () => {
    if (!store.audioInitialized) return;

    if (isPlaying.value) {
      audioEngine.stopPlayback();
      isPlaying.value = false;
    } else {
      audioEngine.startPlayback(currentSequence.value);
      isPlaying.value = true;
    }
  };

  const resetSequence = () => {
    audioEngine.stopPlayback();
    isPlaying.value = false;
    currentSequence.value = null;
  };

  // Lifecycle
  onMounted(() => {
    // Register component refs with store
    store.osc1 = osc1.value;
    store.osc2 = osc2.value;
    store.osc3 = osc3.value;
    store.noiseControls = noiseControls.value;
    store.envelopeShapeControls = envelopeShapeControls.value;
    store.envelopeBehaviorControls = envelopeBehaviorControls.value;
    store.lpgControls = lpgControls.value;
    store.matrixMixer = matrixMixer.value;
    store.filterControls = filterControls.value;
    store.spatialControls = spatialControls.value;

    // Initialize audio engine
    audioEngine.initialize();
  });

  onUnmounted(() => {
    // Clear component refs
    store.osc1 = null;
    store.osc2 = null;
    store.osc3 = null;
    store.noiseControls = null;
    store.envelopeShapeControls = null;
    store.envelopeBehaviorControls = null;
    store.lpgControls = null;
    store.matrixMixer = null;
    store.filterControls = null;
    store.spatialControls = null;

    audioEngine.dispose();
  });
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-white p-8">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold mb-8">Buchla Web Synthesizer</h1>

      <!-- Test Component -->
      <div class="mb-8">
        <TestOscillator />
      </div>
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
    @apply bg-zinc-950 text-zinc-100 antialiased;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .bento-box {
    @apply bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 h-full;
    backdrop-filter: blur(12px);
    position: relative;
    overflow: visible !important;
  }

  .bento-title {
    @apply text-sm font-medium text-zinc-300 mb-3 pb-2 border-b border-zinc-800/50 flex items-center justify-between;
    overflow: visible;
  }

  .bento-title span {
    @apply whitespace-nowrap;
  }

  /* Reset and Random buttons */
  .bento-title button {
    @apply w-6 h-6 rounded bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center border border-zinc-700/50 transition-colors;
  }

  .bento-title button:hover {
    @apply border-emerald-500/50;
  }

  .bento-title .icon-holder {
    @apply w-3.5 h-3.5 text-zinc-400;
  }

  .bento-title button:hover .icon-holder {
    @apply text-emerald-400;
  }

  .module-content {
    @apply h-full;
    overflow: visible;
  }

  /* Module text hierarchy */
  .module-title {
    @apply text-sm font-medium text-zinc-300;
  }

  .module-label {
    @apply text-xs font-medium text-zinc-400;
  }

  .module-value {
    @apply text-[11px] font-mono text-zinc-500;
  }

  /* Ensure parent containers don't clip */
  .grid {
    overflow: visible;
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

  /* Hide scrollbar but keep functionality */
  .hide-scrollbar {
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none; /* Chrome, Safari and Opera */
  }
</style>
