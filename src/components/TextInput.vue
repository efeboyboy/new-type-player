<template>
  <div class="text-input flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <input
        type="text"
        v-model="text"
        @input="handleInput"
        class="flex-1 h-10 bg-zinc-900/50 rounded-lg px-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
        placeholder="Beats Per Plant"
      />

      <div class="flex items-center gap-2">
        <div class="text-[10px] text-zinc-500">{{ text.length }} chars</div>
        <button
          @click="togglePlay"
          class="px-3 py-2 text-[10px] bg-emerald-500/20 text-emerald-500 rounded-lg hover:bg-emerald-500/30 transition-colors flex items-center gap-2 whitespace-nowrap"
          :class="{ 'bg-emerald-500/30': store.playing }"
        >
          <IconHolder class="w-3 h-3">
            <Pause
              v-if="store.playing"
              class="text-current"
              stroke-width="1.5"
            />
            <Play v-else class="text-current" stroke-width="1.5" />
          </IconHolder>
          <span>{{ store.playing ? "Stop" : "Play" }}</span>
        </button>
      </div>
    </div>

    <!-- Status indicators -->
    <div
      v-if="isProcessing || error"
      class="flex items-center gap-2 text-[10px]"
    >
      <div v-if="isProcessing" class="text-emerald-500">
        Generating music pattern...
      </div>
      <div v-if="error" class="text-red-500">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch, onMounted } from "vue";
  import { store } from "../store.js";
  import * as Tone from "tone";
  import MagentaService from "../services/MagentaService.js";
  import audioEngine from "../services/AudioEngine.js";
  import { debounce } from "lodash-es";
  import { Play, Pause } from "lucide-vue-next";
  import IconHolder from "./IconHolder.vue";

  const magentaService = new MagentaService();
  const text = ref("");
  const isProcessing = ref(false);
  const error = ref(null);
  const emit = defineEmits(["update:text"]);

  // Initialize with default text
  onMounted(async () => {
    try {
      // Start audio context
      await Tone.start();
      await audioEngine.initialize();

      // Set default text and generate initial pattern
      text.value = "Beats Per Plant";
      await handleInput({ target: { value: text.value } });

      // Initialize Magenta
      await magentaService.initialize();
    } catch (err) {
      console.error("Failed to initialize:", err);
      error.value = "Failed to initialize audio system";
    }
  });

  const togglePlay = async () => {
    try {
      // Ensure audio context is running
      if (Tone.context.state !== "running") {
        await Tone.start();
        await Tone.context.resume();
      }

      if (store.playing) {
        audioEngine.stopPlayback();
        store.playing = false;
      } else {
        if (text.value.trim()) {
          generatePattern(text.value);
        }
      }
    } catch (error) {
      console.error("Playback error:", error);
    }
  };

  // Debounced function for generating patterns
  const generatePattern = debounce(async (inputText) => {
    if (!inputText) return;

    isProcessing.value = true;
    error.value = null;

    try {
      const result = await magentaService.generateFromText(inputText);

      // Update the audio engine with the new sequence
      if (result && result.notes && result.notes.length > 0) {
        audioEngine.startPlayback(result);
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
</style>
