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
  import { Teleport } from "vue";

  const tempo = computed({
    get: () => store.tempo,
    set: (val) => {
      store.tempo = val;
      audioEngine.setTempo(val);
    },
  });

  // Add volume state management
  const previousVolume = ref(0.75); // Default volume
  const volume = computed({
    get: () => store.volume,
    set: (val) => {
      // Clamp value between 0 and 1
      const clampedValue = Math.max(0, Math.min(1, val));
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

  const resetAllOscillators = () => {
    [osc1.value, osc2.value, osc3.value, noiseControls.value].forEach(
      (control) => control?.reset()
    );
  };

  const randomizeAllOscillators = () => {
    [osc1.value, osc2.value, osc3.value, noiseControls.value].forEach(
      (control) => control?.randomize()
    );
  };

  const matrixMixer = ref(null);
  const envelopeControls = ref(null);
  const lpgControls = ref(null);
  const filterControls = ref(null);
  const spatialControls = ref(null);

  const isPlaying = ref(false);
  const currentSequence = ref(null);

  const showHelp = ref(false);

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
    audioEngine.initialize();
  });

  onUnmounted(() => {
    audioEngine.dispose();
  });
</script>

<template>
  <div
    class="h-screen w-screen bg-zinc-950 font-instrument flex flex-col overflow-hidden"
  >
    <!-- Fixed Header -->
    <div
      class="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 px-4 py-3"
    >
      <div
        class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
      >
        <!-- Title and Controls -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <h1 class="text-xl font-semibold text-zinc-100 whitespace-nowrap">
            Type Player
          </h1>

          <div class="grid grid-cols-2 sm:flex items-center gap-2">
            <div
              class="flex items-center gap-2 bg-zinc-900/50 rounded-lg px-3 py-2 whitespace-nowrap"
            >
              <span class="text-[10px] font-medium text-zinc-400">Speed</span>
              <div class="w-8 h-8 flex items-center justify-center">
                <Knob v-model="tempo" :min="40" :max="200" :step="1" />
              </div>
              <span class="text-[10px] font-mono text-zinc-300">{{
                tempo
              }}</span>
            </div>

            <!-- Volume Control -->
            <div
              class="flex items-center gap-2 bg-zinc-900/50 rounded-lg px-3 py-2 whitespace-nowrap"
            >
              <span class="text-[10px] font-medium text-zinc-400">Volume</span>
              <div class="w-8 h-8 flex items-center justify-center">
                <Knob v-model="volume" :min="0" :max="1" :step="0.01" />
              </div>
              <span class="text-[10px] font-mono text-zinc-300"
                >{{ Math.round(volume * 100) }}%</span
              >
            </div>

            <button
              @click="showHelp = true"
              class="col-span-2 sm:col-span-1 h-10 sm:w-8 sm:h-8 rounded-lg sm:rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center group border border-zinc-700/50"
              title="How to use"
            >
              <IconHolder
                class="w-4 h-4 text-zinc-400 group-hover:text-emerald-400"
              >
                <HelpCircle />
              </IconHolder>
              <span class="ml-2 text-[10px] text-zinc-400 sm:hidden"
                >How to use</span
              >
            </button>
          </div>
        </div>

        <!-- Text Input -->
        <div class="flex-1 min-w-0">
          <TextInput @update:text="handleUpdateText" />
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-y-auto mt-[200px] sm:mt-[120px] lg:mt-[72px]">
      <div class="p-4">
        <!-- Main Grid -->
        <div class="grid grid-cols-1 lg:grid-rows-[auto_auto] gap-4">
          <!-- Top Row: Sound Sources, Envelopes, and Matrix -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <!-- Sound Sources -->
            <div class="bento-box">
              <div class="bento-title flex items-center justify-between">
                <div class="flex items-center gap-2 shrink-0">
                  <IconHolder class="w-3.5 h-3.5 text-emerald-500/70">
                    <ActivityIcon />
                  </IconHolder>
                  <span class="whitespace-nowrap">Sound Sources</span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    @click="resetAllOscillators"
                    class="w-6 h-6 rounded bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center group border border-zinc-700/50"
                  >
                    <IconHolder
                      class="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400"
                    >
                      <RotateCcw width="14" height="14" stroke-width="1.5" />
                    </IconHolder>
                  </button>
                  <button
                    @click="randomizeAllOscillators"
                    class="w-6 h-6 rounded bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center group border border-zinc-700/50"
                  >
                    <IconHolder
                      class="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400"
                    >
                      <Shuffle width="14" height="14" stroke-width="1.5" />
                    </IconHolder>
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-4 gap-4">
                <OscillatorControls ref="osc1" :number="1" />
                <OscillatorControls ref="osc2" :number="2" />
                <OscillatorControls ref="osc3" :number="3" />
                <NoiseControls ref="noiseControls" />
              </div>
            </div>

            <!-- Shape Controls -->
            <div class="bento-box">
              <div class="bento-title flex items-center justify-between">
                <div class="flex items-center gap-2 shrink-0">
                  <IconHolder class="w-3.5 h-3.5 text-emerald-500/70">
                    <AudioWaveform />
                  </IconHolder>
                  <span class="whitespace-nowrap">Shape Controls</span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    @click="envelopeControls?.reset()"
                    class="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center group"
                  >
                    <IconHolder class="w-3.5 h-3.5">
                      <RotateCcw
                        class="text-zinc-400 group-hover:text-emerald-400"
                        stroke-width="1.5"
                      />
                    </IconHolder>
                  </button>
                  <button
                    @click="envelopeControls?.randomize()"
                    class="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center group"
                  >
                    <IconHolder class="w-3.5 h-3.5">
                      <Shuffle
                        class="text-zinc-400 group-hover:text-emerald-400"
                        stroke-width="1.5"
                      />
                    </IconHolder>
                  </button>
                </div>
              </div>
              <div class="module-content">
                <EnvelopeControls ref="envelopeControls" />
              </div>
            </div>

            <!-- Routing -->
            <div class="bento-box">
              <div class="bento-title flex items-center justify-between">
                <div class="flex items-center gap-2 shrink-0">
                  <IconHolder class="w-3.5 h-3.5 text-emerald-500/70">
                    <NetworkIcon />
                  </IconHolder>
                  <span class="whitespace-nowrap">Routing</span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    @click="matrixMixer?.reset()"
                    class="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center group"
                  >
                    <IconHolder class="w-3.5 h-3.5">
                      <RotateCcw
                        class="text-zinc-400 group-hover:text-emerald-400"
                        stroke-width="1.5"
                      />
                    </IconHolder>
                  </button>
                  <button
                    @click="matrixMixer?.randomize()"
                    class="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center group"
                  >
                    <IconHolder class="w-3.5 h-3.5">
                      <Shuffle
                        class="text-zinc-400 group-hover:text-emerald-400"
                        stroke-width="1.5"
                      />
                    </IconHolder>
                  </button>
                </div>
              </div>
              <div class="module-content">
                <MatrixMixer ref="matrixMixer" />
              </div>
            </div>
          </div>

          <!-- Bottom Row: Gate, Tone, Space -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <!-- Gate Controls -->
            <div class="bento-box">
              <div class="bento-title flex items-center justify-between">
                <div class="flex items-center gap-2 shrink-0">
                  <IconHolder class="w-3.5 h-3.5 text-emerald-500/70">
                    <SwitchCameraIcon />
                  </IconHolder>
                  <span class="whitespace-nowrap">Gate Controls</span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    @click="lpgControls?.reset()"
                    class="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center group"
                  >
                    <IconHolder class="w-3.5 h-3.5">
                      <RotateCcw
                        class="text-zinc-400 group-hover:text-emerald-400"
                        stroke-width="1.5"
                      />
                    </IconHolder>
                  </button>
                  <button
                    @click="lpgControls?.randomize()"
                    class="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center group"
                  >
                    <IconHolder class="w-3.5 h-3.5">
                      <Shuffle
                        class="text-zinc-400 group-hover:text-emerald-400"
                        stroke-width="1.5"
                      />
                    </IconHolder>
                  </button>
                </div>
              </div>
              <div class="module-content">
                <LPGControls ref="lpgControls" />
              </div>
            </div>

            <!-- Tone Controls -->
            <div class="bento-box">
              <div class="bento-title flex items-center justify-between">
                <div class="flex items-center gap-2 shrink-0">
                  <IconHolder class="w-3.5 h-3.5 text-emerald-500/70">
                    <SlidersIcon />
                  </IconHolder>
                  <span class="whitespace-nowrap">Tone Controls</span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    @click="filterControls?.reset()"
                    class="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center group"
                  >
                    <IconHolder class="w-3.5 h-3.5">
                      <RotateCcw
                        class="text-zinc-400 group-hover:text-emerald-400"
                        stroke-width="1.5"
                      />
                    </IconHolder>
                  </button>
                  <button
                    @click="filterControls?.randomize()"
                    class="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center group"
                  >
                    <IconHolder class="w-3.5 h-3.5">
                      <Shuffle
                        class="text-zinc-400 group-hover:text-emerald-400"
                        stroke-width="1.5"
                      />
                    </IconHolder>
                  </button>
                </div>
              </div>
              <div class="module-content">
                <FilterControls ref="filterControls" />
              </div>
            </div>

            <!-- Space Controls -->
            <div class="bento-box">
              <div class="bento-title flex items-center justify-between">
                <div class="flex items-center gap-2 shrink-0">
                  <IconHolder class="w-3.5 h-3.5 text-emerald-500/70">
                    <CompassIcon />
                  </IconHolder>
                  <span class="whitespace-nowrap">Space Controls</span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    @click="spatialControls?.reset()"
                    class="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center group"
                  >
                    <IconHolder class="w-3.5 h-3.5">
                      <RotateCcw
                        class="text-zinc-400 group-hover:text-emerald-400"
                        stroke-width="1.5"
                      />
                    </IconHolder>
                  </button>
                  <button
                    @click="spatialControls?.randomize()"
                    class="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center group"
                  >
                    <IconHolder class="w-3.5 h-3.5">
                      <Shuffle
                        class="text-zinc-400 group-hover:text-emerald-400"
                        stroke-width="1.5"
                      />
                    </IconHolder>
                  </button>
                </div>
              </div>
              <div class="module-content">
                <SpatialControls ref="spatialControls" />
              </div>
            </div>
          </div>
        </div>

        <!-- Debug Sequencer (hidden but active) -->
        <div class="hidden">
          <Sequencer />
        </div>
      </div>
    </div>

    <!-- Help Modal (moved to root level) -->
    <Teleport to="body">
      <HelpModal v-if="showHelp" @close="showHelp = false" />
    </Teleport>
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
    @apply bg-zinc-900/50 rounded-xl p-4 border border-zinc-800;
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
    @apply mt-2;
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

  /* Tooltip */
  [title] {
    position: relative;
    z-index: 20;
  }

  [title]:hover::after {
    content: attr(title);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 8px;
    padding: 6px 8px;
    white-space: nowrap;
    @apply bg-zinc-800 text-zinc-200 text-[10px] rounded;
    z-index: 100;
    pointer-events: none;
  }

  /* Add a small arrow to the tooltip */
  [title]:hover::before {
    content: "";
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 4px;
    border-style: solid;
    border-color: theme("colors.zinc.800") transparent transparent transparent;
    z-index: 100;
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
