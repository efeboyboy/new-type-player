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
                >{{ Math.round((volume || 0) * 100) }}%</span
              >
            </div>

            <button
              @click="showHelp = true"
              class="col-span-2 sm:col-span-1 h-10 sm:w-8 sm:h-8 rounded-lg sm:rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center group border border-zinc-700/50 relative"
            >
              <IconHolder
                class="w-4 h-4 text-zinc-400 group-hover:text-emerald-400"
              >
                <HelpCircle />
              </IconHolder>
              <span class="ml-2 text-[10px] text-zinc-400 sm:hidden"
                >How to use</span
              >
              <!-- Tooltip -->
              <div
                class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-zinc-800 text-zinc-200 text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50"
              >
                How to use
              </div>
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
              <div class="grid grid-rows-2 gap-4 h-full">
                <div class="grid grid-cols-2 gap-4 h-full">
                  <div class="bento-box">
                    <div class="bento-title flex items-center justify-between">
                      <div class="module-title">Sound 1</div>
                    </div>
                    <div
                      class="module-content flex items-center justify-center"
                    >
                      <OscillatorControls ref="osc1" :number="1" />
                    </div>
                  </div>
                  <div class="bento-box">
                    <div class="bento-title flex items-center justify-between">
                      <div class="module-title">Sound 2</div>
                    </div>
                    <div
                      class="module-content flex items-center justify-center"
                    >
                      <OscillatorControls ref="osc2" :number="2" />
                    </div>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4 h-full">
                  <div class="bento-box">
                    <div class="bento-title flex items-center justify-between">
                      <div class="module-title">Sound 3</div>
                    </div>
                    <div
                      class="module-content flex items-center justify-center"
                    >
                      <OscillatorControls ref="osc3" :number="3" />
                    </div>
                  </div>
                  <div class="bento-box">
                    <div class="bento-title flex items-center justify-between">
                      <div class="module-title">Noise</div>
                    </div>
                    <div
                      class="module-content flex items-center justify-center"
                    >
                      <NoiseControls ref="noiseControls" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
                    @click="
                      () => {
                        envelopeShapeControls?.reset();
                        envelopeBehaviorControls?.reset();
                      }
                    "
                    class="w-6 h-6 rounded bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center group border border-zinc-700/50"
                  >
                    <IconHolder class="w-3.5 h-3.5">
                      <RotateCcw
                        class="text-zinc-400 group-hover:text-emerald-400"
                        stroke-width="1.5"
                      />
                    </IconHolder>
                  </button>
                  <button
                    @click="
                      () => {
                        envelopeShapeControls?.randomize();
                        envelopeBehaviorControls?.randomize();
                      }
                    "
                    class="w-6 h-6 rounded bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center group border border-zinc-700/50"
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
              <div class="grid grid-rows-2 gap-4 h-full">
                <div class="bento-box">
                  <div class="bento-title flex items-center justify-between">
                    <div class="module-title">Shape</div>
                  </div>
                  <div class="module-content flex items-center justify-center">
                    <EnvelopeControls
                      ref="envelopeShapeControls"
                      mode="shape"
                    />
                  </div>
                </div>
                <div class="bento-box">
                  <div class="bento-title flex items-center justify-between">
                    <div class="module-title">Behavior</div>
                  </div>
                  <div class="module-content flex items-center justify-center">
                    <EnvelopeControls
                      ref="envelopeBehaviorControls"
                      mode="behavior"
                    />
                  </div>
                </div>
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

    <!-- Init Modal (moved to root level) -->
    <Teleport to="body">
      <Transition name="modal">
        <InitModal v-if="showInitModal" @close="showInitModal = false" />
      </Transition>
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
