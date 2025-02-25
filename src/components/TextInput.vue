<template>
  <div class="text-input flex flex-col gap-2">
    <div class="flex flex-col sm:flex-row gap-2">
      <input
        type="text"
        v-model="text"
        @input="handleInput"
        class="w-full h-10 bg-zinc-900/50 rounded-lg px-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-colors"
        :class="{ 'opacity-50 cursor-not-allowed': !isInitialized }"
        placeholder="Type something to generate music..."
        :disabled="!isInitialized"
      />

      <div class="flex items-center gap-2 justify-between sm:justify-start">
        <div class="text-[10px] text-zinc-500 whitespace-nowrap">
          {{ text.length }} chars
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="handleButtonClick"
            class="h-10 px-4 text-[10px] bg-emerald-500/20 text-emerald-500 rounded-lg hover:bg-emerald-500/30 transition-colors flex items-center gap-2 whitespace-nowrap flex-1 sm:flex-none justify-center"
            :class="{
              'bg-emerald-500/30': store.playing,
              'opacity-50 cursor-not-allowed': isInitialized && !text.trim(),
            }"
            :disabled="isInitialized && !text.trim()"
          >
            <IconHolder class="w-3 h-3">
              <span
                v-if="!isInitialized"
                class="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full"
                :class="{ 'animate-spin': isInitializing }"
              ></span>
              <Pause
                v-else-if="store.playing"
                class="text-current"
                stroke-width="1.5"
              />
              <Play v-else class="text-current" stroke-width="1.5" />
            </IconHolder>
            <span>{{ buttonText }}</span>
          </button>

          <!-- Randomize Button -->
          <button
            @click="handleRandomize"
            class="h-10 px-4 text-[10px] bg-indigo-500/20 text-indigo-500 rounded-lg hover:bg-indigo-500/30 transition-colors flex items-center gap-2 whitespace-nowrap flex-1 sm:flex-none justify-center group relative"
            :class="{
              'opacity-50 cursor-not-allowed': !isInitialized,
            }"
            :disabled="!isInitialized"
          >
            <IconHolder class="w-3 h-3">
              <Shuffle class="text-current" stroke-width="1.5" />
            </IconHolder>
            <span>Random</span>
            <!-- Tooltip -->
            <div
              class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-zinc-800 text-zinc-200 text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10"
            >
              {{
                currentSeed ? `Current Seed: ${currentSeed}` : "Randomize All"
              }}
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch, onMounted, computed } from "vue";
  import { store } from "../store.js";
  import * as Tone from "tone";
  import MagentaService from "../services/MagentaService.js";
  import audioEngine from "../services/AudioEngine.js";
  import { debounce } from "lodash-es";
  import { Play, Pause, Shuffle, Leaf } from "lucide-vue-next";
  import IconHolder from "./IconHolder.vue";
  import { PhraseGenerator } from "../services/PhraseGenerator";

  const magentaService = new MagentaService();
  const text = ref("");
  const isProcessing = ref(false);
  const error = ref(null);
  const isInitialized = ref(false);
  const isInitializing = ref(false);
  const currentSeed = ref("");
  const emit = defineEmits(["update:text"]);

  const buttonText = computed(() => {
    if (!isInitialized.value) return "Initialize";
    return store.playing ? "Stop" : "Play";
  });

  // Initialize audio system
  onMounted(async () => {
    try {
      isInitializing.value = true;
      error.value = null;

      // Initialize store first
      const success = await store.initializeAudio();
      if (!success) {
        throw new Error("Failed to initialize audio system");
      }

      // Initialize Magenta
      await magentaService.initialize();

      // Set initial seed but keep text input empty
      currentSeed.value = store.currentSeed || "a3Wnb2pn"; // Use store's seed or default

      // Mark as initialized
      isInitialized.value = true;
    } catch (err) {
      console.error("Failed to initialize:", err);
      error.value = "Failed to initialize audio system";
      isInitialized.value = false;
    } finally {
      isInitializing.value = false;
    }
  });

  const initializeAudio = async () => {
    if (isInitializing.value) return;

    try {
      isInitializing.value = true;
      error.value = null;

      const success = await store.initializeAudio();
      if (!success) {
        throw new Error("Failed to initialize audio system");
      }

      // Initialize Magenta
      await magentaService.initialize();

      // Mark as initialized
      isInitialized.value = true;
    } catch (err) {
      console.error("Failed to initialize:", err);
      error.value = "Failed to initialize audio system";
      isInitialized.value = false;
    } finally {
      isInitializing.value = false;
    }
  };

  const handleButtonClick = async () => {
    if (!isInitialized.value) {
      await initializeAudio();
      return;
    }

    if (!text.value.trim()) return;

    try {
      // Ensure audio context is running
      if (Tone.context.state !== "running") {
        await Tone.context.resume();
      }

      if (store.playing) {
        audioEngine.stopPlayback();
        store.playing = false;
      } else {
        generatePattern(text.value);
      }
    } catch (error) {
      console.error("Playback error:", error);
    }
  };

  // Debounced function for generating patterns
  const generatePattern = debounce(async (inputText) => {
    if (!inputText || !isInitialized.value) return;

    isProcessing.value = true;
    error.value = null;

    try {
      const result = await magentaService.generateFromText(inputText);

      // Format the sequence properly for the audio engine
      const formattedSequence = {
        notes: [],
        tempos: [{ time: 0, qpm: 120 }], // Default tempo
        totalTime: 4, // 4 beats
      };

      // Handle different sequence formats
      if (Array.isArray(result)) {
        // If result is an array of channels
        result.forEach((channel, channelIndex) => {
          if (Array.isArray(channel)) {
            channel.forEach((step, stepIndex) => {
              if (step && step !== null) {
                formattedSequence.notes.push({
                  pitch: step.frequency
                    ? Tone.Frequency(step.frequency).toMidi()
                    : 60 + channelIndex * 12,
                  velocity: Math.round((step.velocity || 0.8) * 127),
                  startTime: stepIndex * 0.25, // Each step is a 16th note
                  endTime: (stepIndex + 1) * 0.25,
                  program: 0,
                  isDrum: channelIndex === 3, // Last channel is drums
                });
              }
            });
          }
        });
      } else if (result && typeof result === "object" && result.notes) {
        // If result is already in the correct format
        formattedSequence.notes = result.notes.map((note) => ({
          pitch: note.pitch,
          velocity: note.velocity,
          startTime: note.startTime,
          endTime: note.endTime,
          program: 0,
          isDrum: false,
        }));
      }

      // Update the audio engine with the formatted sequence
      if (formattedSequence.notes.length > 0) {
        audioEngine.startPlayback(formattedSequence);
        store.playing = true;
      }
    } catch (err) {
      console.error("Failed to generate pattern:", err);
      error.value = "Failed to generate music pattern";
    } finally {
      isProcessing.value = false;
    }
  }, 500); // 500ms debounce

  const handleInput = async (event) => {
    if (!isInitialized.value) return;

    const newText = event.target.value;
    text.value = newText;
    emit("update:text", newText);

    // Generate new pattern if text is not empty
    if (newText.trim()) {
      generatePattern(newText);
    } else {
      audioEngine.stopPlayback();
      store.playing = false;
    }
  };

  // Generate a random seed string
  const generateSeed = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array(8)
      .fill(0)
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join("");
  };

  const generateRandomPhrase = () => {
    // Use the new PhraseGenerator instead of the hardcoded phrases
    return PhraseGenerator.generatePhrase();
  };

  // Handle randomization of all parameters
  const handleRandomize = async () => {
    if (!isInitialized.value || isProcessing.value) return;

    try {
      isProcessing.value = true;
      error.value = null;

      // Generate new seed
      const newSeed = generateSeed();

      // Apply new seed
      const success = await store.applySeed(newSeed, true);
      if (!success) {
        throw new Error("Failed to apply seed");
      }

      // Update local state
      currentSeed.value = newSeed;
      text.value = generateRandomPhrase();

      // Generate new pattern
      await generatePattern(text.value);
    } catch (err) {
      console.error("Failed to randomize parameters:", err);
      error.value = "Failed to randomize parameters";
    } finally {
      isProcessing.value = false;
    }
  };

  const generatePlantPhrase = () => {
    if (!store.audioInitialized) return;
    text.value = PhraseGenerator.generatePhrase();
    handleInput({ target: { value: text.value } });
  };
</script>

<style scoped>
  .text-input input {
    font-family: theme("fontFamily.mono");
    letter-spacing: -0.5px;
    line-height: 1;
  }

  .text-input input::placeholder {
    color: theme("colors.zinc.600");
    opacity: 1;
  }

  .text-input input:disabled {
    @apply cursor-not-allowed;
  }

  .text-input button:disabled {
    @apply cursor-not-allowed;
  }

  .text-input button.randomize {
    @apply bg-indigo-500/20 text-indigo-500 hover:bg-indigo-500/30;
  }

  .text-input button.randomize:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
</style>
