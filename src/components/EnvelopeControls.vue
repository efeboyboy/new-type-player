<template>
  <div class="module-panel">
    <div class="grid grid-cols-4 gap-4">
      <div v-for="n in 4" :key="n" class="flex flex-col items-center gap-4">
        <div class="text-center">
          <div class="module-label">{{ n }}</div>
        </div>

        <div v-if="mode === 'shape'">
          <!-- Attack -->
          <div class="control-group">
            <Knob
              v-model="envelopes[n - 1].attack"
              :min="10"
              :max="1000"
              :step="1"
              class="w-10 h-10"
            />
            <div class="module-value">
              {{ formatTime(envelopes[n - 1].attack) }}
            </div>
            <label class="module-label">Attack</label>
          </div>

          <!-- Release -->
          <div class="control-group">
            <Knob
              v-model="envelopes[n - 1].release"
              :min="10"
              :max="2000"
              :step="1"
              class="w-10 h-10"
            />
            <div class="module-value">
              {{ formatTime(envelopes[n - 1].release) }}
            </div>
            <label class="module-label">Release</label>
          </div>

          <!-- Amount -->
          <div class="control-group">
            <Knob
              v-model="envelopes[n - 1].amount"
              :min="0"
              :max="1"
              :step="0.01"
              class="w-10 h-10"
            />
            <div class="module-value">
              {{ formatPercent(envelopes[n - 1].amount) }}
            </div>
            <label class="module-label">Amount</label>
          </div>
        </div>

        <div v-else>
          <!-- Cycle Button -->
          <div class="control-group">
            <button
              class="w-10 h-10 rounded bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center border border-zinc-700/50"
              :class="{ 'border-emerald-500/50': envelopes[n - 1].cycleState }"
              @click="toggleCycle(n - 1)"
            >
              <IconHolder
                class="w-4 h-4"
                :class="{ 'text-emerald-400': envelopes[n - 1].cycleState }"
              >
                <RotateCcw v-if="envelopes[n - 1].cycleState" />
                <ArrowRight v-else />
              </IconHolder>
            </button>
            <div class="module-value">{{ n }}</div>
            <label class="module-label">{{
              envelopes[n - 1].cycleState ? "Cycle" : "Once"
            }}</label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch, onMounted, nextTick } from "vue";
  import { RotateCcw, ArrowRight } from "lucide-vue-next";
  import Knob from "./Knob.vue";
  import IconHolder from "./IconHolder.vue";
  import audioEngine from "../services/AudioEngine.js";
  import * as Tone from "tone";

  const props = defineProps({
    mode: {
      type: String,
      required: true,
      validator: (value) => ["shape", "behavior"].includes(value),
    },
  });

  // Default envelope settings
  const defaultEnvelope = {
    attack: 100, // 100ms
    release: 200, // 200ms
    amount: 0.8, // 80%
    cycleState: false,
  };

  // Create 4 envelope configurations with slightly different defaults for each channel
  const envelopes = ref(
    Array(4)
      .fill()
      .map((_, index) => ({
        attack: index === 3 ? 150 : 100, // Slightly longer attack for channel 4
        release: index === 3 ? 300 : 200, // Slightly longer release for channel 4
        amount: index === 3 ? 0.7 : 0.8, // Slightly lower amount for channel 4
        cycleState: index >= 2, // Channels 3 & 4 cycling by default
      }))
  );

  // Check if audio engine is ready
  const audioInitialized = ref(false);

  // Initialize audio engine if needed
  onMounted(async () => {
    try {
      // First ensure audio context is started
      await Tone.start();

      // Then initialize audio engine
      if (!audioEngine.initialized) {
        await audioEngine.initialize();
      }

      audioInitialized.value = true;
      console.log("Audio engine initialized from EnvelopeControls");

      // Load current settings from engine after initialization
      loadCurrentSettings();

      // Wait a bit for everything to settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Apply our initial settings with a delay between each envelope to prevent audio glitches
      for (let i = 0; i < envelopes.value.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        await updateEnvelope(i);
      }
    } catch (error) {
      console.error("Failed to initialize audio engine:", error);
    }
  });

  // Load current settings from audio engine
  const loadCurrentSettings = () => {
    if (!audioInitialized.value) return;

    // Load envelope cycling state and parameters for each channel
    for (let i = 0; i < 4; i++) {
      if (audioEngine.envelopes && audioEngine.envelopes[i]) {
        // Load cycling state
        envelopes.value[i].cycleState = !!audioEngine.envelopes[i].isLooping;

        // Load envelope parameters if available
        if (audioEngine.envelopes[i].rise !== undefined) {
          envelopes.value[i].attack = Math.round(
            audioEngine.envelopes[i].rise * 1000
          );
        }

        if (audioEngine.envelopes[i].fall !== undefined) {
          envelopes.value[i].release = Math.round(
            audioEngine.envelopes[i].fall * 1000
          );
        }

        if (audioEngine.envelopes[i].level !== undefined) {
          envelopes.value[i].amount = audioEngine.envelopes[i].level;
        }
      }
    }
  };

  const toggleCycle = (index) => {
    envelopes.value[index].cycleState = !envelopes.value[index].cycleState;
    updateEnvelope(index);
  };

  const formatTime = (ms) => {
    return `${ms}ms`;
  };

  const formatPercent = (value) => {
    return `${Math.round(value * 100)}%`;
  };

  const updateEnvelope = async (index) => {
    try {
      if (!audioInitialized.value) return;

      // Ensure audio context is running
      if (Tone.context.state !== "running") {
        await Tone.start();
        await Tone.context.resume();
      }

      const env = envelopes.value[index];
      if (!env) return;

      // Convert milliseconds to seconds for the audio engine
      const attackSec = env.attack / 1000;
      const releaseSec = env.release / 1000;

      console.log(
        `Setting envelope ${index}: attack=${attackSec}s, release=${releaseSec}s, amount=${env.amount}, cycle=${env.cycleState}`
      );

      // Set envelope parameters
      audioEngine.setEnvelope(index, {
        rise: attackSec,
        fall: releaseSec,
        level: env.amount,
      });

      // Set envelope cycling state
      audioEngine.setEnvelopeLFO(index, env.cycleState);
    } catch (error) {
      console.warn(`Error updating envelope ${index}:`, error);
    }
  };

  // Add debounce utility
  const debounce = (fn, delay) => {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  };

  // Debounced update function to prevent too many rapid updates
  const debouncedUpdate = debounce(async () => {
    for (let i = 0; i < envelopes.value.length; i++) {
      await updateEnvelope(i);
      // Small delay between updates to prevent audio glitches
      if (i < envelopes.value.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
  }, 50);

  // Watch for changes and update the audio engine
  watch(
    envelopes,
    () => {
      debouncedUpdate();
    },
    { deep: true }
  );

  // Reset function
  const reset = async () => {
    // Create new values with defaults
    const newValues = Array(4)
      .fill()
      .map((_, index) => ({
        attack: index === 3 ? 150 : 100, // Slightly longer attack for channel 4
        release: index === 3 ? 300 : 200, // Slightly longer release for channel 4
        amount: index === 3 ? 0.7 : 0.8, // Slightly lower amount for channel 4
        cycleState: index >= 2, // Channels 3 & 4 cycling by default
      }));

    // Update values
    envelopes.value = newValues;

    // Wait for Vue to update the DOM
    await nextTick();

    // Update audio engine with a small delay between each envelope to prevent audio glitches
    for (let i = 0; i < envelopes.value.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      await updateEnvelope(i);
    }
  };

  // Randomize function
  const randomize = async () => {
    // Create new values within the proper ranges for each parameter
    const newValues = envelopes.value.map(() => ({
      attack: Math.floor(10 + Math.random() * 990), // 10-1000ms
      release: Math.floor(10 + Math.random() * 1990), // 10-2000ms
      amount: Math.random(), // 0-1
      cycleState: Math.random() > 0.5, // Random cycling state
    }));

    // Update values
    envelopes.value = newValues;

    // Wait for Vue to update the DOM
    await nextTick();

    // Update audio engine with a small delay between each envelope to prevent audio glitches
    for (let i = 0; i < envelopes.value.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      await updateEnvelope(i);
    }
  };

  // Expose methods for parent component
  defineExpose({
    reset,
    randomize,
  });
</script>

<style scoped>
  .module-panel {
    @apply bg-zinc-900/30 rounded-lg p-6;
  }

  .control-group {
    @apply flex flex-col items-center gap-1;
  }

  .module-value {
    @apply text-[10px] font-mono text-zinc-500 text-center mt-0.5;
  }

  .module-label {
    @apply text-[11px] font-medium text-zinc-400 text-center;
  }
</style>
