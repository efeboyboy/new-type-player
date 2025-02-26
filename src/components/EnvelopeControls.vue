<template>
  <div class="flex gap-6 flex-col">
    <!-- Cycle Button (for all envelopes) -->
    <div class="control-group">
      <button
        class="w-10 h-10 rounded bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center border border-zinc-700/50"
        :class="{ 'border-emerald-500/50': cycleState }"
        @click="toggleCycle"
      >
        <IconHolder class="w-4 h-4" :class="{ 'text-emerald-400': cycleState }">
          <RotateCcw v-if="cycleState" />
          <ArrowRight v-else />
        </IconHolder>
      </button>
      <div class="module-value">{{ number }}</div>
      <label class="module-label">{{ cycleState ? "Cycle" : "Once" }}</label>
    </div>

    <!-- Attack (only in shape mode) -->
    <div v-if="mode === 'shape'" class="control-group">
      <Knob
        v-model="attack"
        :min="10"
        :max="1000"
        :step="1"
        class="w-10 h-10"
        @update:model-value="handleParameterChange('attack')"
      />
      <div class="module-value">{{ formatTime(attack) }}</div>
      <label class="module-label">Attack</label>
    </div>

    <!-- Release (only in shape mode) -->
    <div v-if="mode === 'shape'" class="control-group">
      <Knob
        v-model="release"
        :min="10"
        :max="2000"
        :step="1"
        class="w-10 h-10"
        @update:model-value="handleParameterChange('release')"
      />
      <div class="module-value">{{ formatTime(release) }}</div>
      <label class="module-label">Release</label>
    </div>

    <!-- Amount (only in shape mode) -->
    <div v-if="mode === 'shape'" class="control-group">
      <Knob
        v-model="amount"
        :min="0"
        :max="1"
        :step="0.01"
        class="w-10 h-10"
        @update:model-value="handleParameterChange('amount')"
      />
      <div class="module-value">{{ formatPercent(amount) }}</div>
      <label class="module-label">Amount</label>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch, onMounted, nextTick, onBeforeUnmount } from "vue";
  import { RotateCcw, ArrowRight } from "lucide-vue-next";
  import Knob from "./Knob.vue";
  import IconHolder from "./IconHolder.vue";
  import audioEngine from "../services/AudioEngine.js";
  import ToneService from "../services/ToneService";
  const Tone = ToneService.getTone();

  const props = defineProps({
    mode: {
      type: String,
      required: true,
      validator: (value) => ["shape", "behavior"].includes(value),
    },
    number: {
      type: Number,
      required: true,
      validator: (value) => value >= 1 && value <= 4,
    },
  });

  // Store timeouts for cleanup
  const timeoutIds = ref([]);

  // Helper to safely add timeouts that will be cleaned up
  const safeTimeout = (callback, delay) => {
    const id = setTimeout(callback, delay);
    timeoutIds.value.push(id);
    return id;
  };

  // Clean up all timeouts on component unmount
  onBeforeUnmount(() => {
    timeoutIds.value.forEach((id) => clearTimeout(id));
    timeoutIds.value = [];

    // Cancel any pending debounced updates
    if (debouncedUpdate.cancel) {
      debouncedUpdate.cancel();
    }
  });

  // Get default values based on envelope number
  const getDefaultValues = (number) => ({
    attack: number === 4 ? 150 : number === 3 ? 728 : number === 2 ? 243 : 39, // Different attack times for each envelope
    release:
      number === 4 ? 300 : number === 3 ? 1190 : number === 2 ? 1919 : 59, // Different release times for each envelope
    amount:
      number === 4 ? 0.7 : number === 3 ? 0.24 : number === 2 ? 0.04 : 0.76, // Different amounts for each envelope
    cycleState: number >= 3, // Envelopes 3 & 4 cycling by default
  });

  const defaults = getDefaultValues(props.number);
  const attack = ref(defaults.attack);
  const release = ref(defaults.release);
  const amount = ref(defaults.amount);
  const cycleState = ref(defaults.cycleState);

  // Check if audio engine is ready
  const audioInitialized = ref(false);

  // Initialize audio engine if needed
  onMounted(async () => {
    try {
      // First ensure audio context is started
      await ToneService.ensureStarted();

      // Then initialize audio engine if not already initialized
      if (!audioEngine.initialized) {
        await audioEngine.initialize();
        ToneService.setAudioEngineInitialized(true);
      }

      audioInitialized.value = true;

      // Load current settings from engine after initialization
      loadCurrentSettings();

      // Wait a bit for everything to settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Apply our initial settings once
      await updateEnvelope();
    } catch (error) {
      console.error("Failed to initialize audio engine:", error);
    }
  });

  // Load current settings from audio engine
  const loadCurrentSettings = () => {
    if (!audioInitialized.value) return;

    const index = props.number - 1;

    // Load envelope parameters if available
    if (audioEngine.envelopes && audioEngine.envelopes[index]) {
      // Load cycling state, but ensure envelopes 3 & 4 always have cycling enabled
      if (index >= 2) {
        cycleState.value = true;
      } else {
        cycleState.value = !!audioEngine.envelopes[index].isLooping;
      }

      if (audioEngine.envelopes[index].rise !== undefined) {
        attack.value = Math.round(audioEngine.envelopes[index].rise * 1000);
      }

      if (audioEngine.envelopes[index].fall !== undefined) {
        release.value = Math.round(audioEngine.envelopes[index].fall * 1000);
      }

      if (audioEngine.envelopes[index].level !== undefined) {
        amount.value = audioEngine.envelopes[index].level;
      }
    }
  };

  const toggleCycle = () => {
    const index = props.number - 1;

    // For envelopes 3 and 4, always keep cycling enabled
    if (index >= 2) {
      cycleState.value = true;
    } else {
      // Only allow toggling for envelopes 1 and 2
      cycleState.value = !cycleState.value;
    }

    updateEnvelope();
  };

  const formatTime = (ms) => {
    return `${ms}ms`;
  };

  const formatPercent = (value) => {
    return `${Math.round(value * 100)}%`;
  };

  // Parameter change handler
  const handleParameterChange = (paramType) => {
    // Use debounced update to prevent too many rapid updates
    debouncedUpdate();
  };

  const updateEnvelope = async () => {
    try {
      if (!audioInitialized.value) return;

      // Ensure audio context is running
      await ToneService.ensureStarted();

      const index = props.number - 1;

      // Ensure envelopes 3 & 4 (indices 2 & 3) always have cycling enabled
      if (index >= 2) {
        cycleState.value = true;
      }

      // Convert milliseconds to seconds for the audio engine
      const attackSec = attack.value / 1000;
      const releaseSec = release.value / 1000;

      // Set envelope parameters
      audioEngine.setEnvelope(index, {
        rise: attackSec,
        fall: releaseSec,
        level: amount.value,
      });

      // Set envelope cycling state
      audioEngine.setEnvelopeLFO(index, cycleState.value);
    } catch (error) {
      console.warn(`Error updating envelope ${props.number}:`, error);
    }
  };

  // Increase debounce time to prevent rapid updates
  const debounce = (fn, delay) => {
    let timeoutId;
    const debounced = function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };

    debounced.cancel = () => {
      clearTimeout(timeoutId);
    };

    return debounced;
  };

  // Debounced update function to prevent too many rapid updates
  const debouncedUpdate = debounce(updateEnvelope, 100);

  // Watch for changes and update the audio engine
  watch([attack, release, amount, cycleState], () => {
    debouncedUpdate();
  });

  // Reset function
  const reset = async () => {
    const newDefaults = getDefaultValues(props.number);

    // Update values
    attack.value = newDefaults.attack;
    release.value = newDefaults.release;
    amount.value = newDefaults.amount;
    cycleState.value = newDefaults.cycleState;

    // Wait for Vue to update the DOM
    await nextTick();

    // Update audio engine with a small delay to prevent audio glitches
    await new Promise((resolve) => setTimeout(resolve, 20));
    await updateEnvelope();
  };

  // Randomize function
  const randomize = async () => {
    // Create new values within the proper ranges for each parameter
    attack.value = Math.floor(10 + Math.random() * 990); // 10-1000ms
    release.value = Math.floor(10 + Math.random() * 1990); // 10-2000ms
    amount.value = Math.random(); // 0-1

    const index = props.number - 1;
    // Always true for indices 2 & 3, random for others
    cycleState.value = index >= 2 ? true : Math.random() > 0.5;

    // Wait for Vue to update the DOM
    await nextTick();

    // Update audio engine with a small delay to prevent audio glitches
    await new Promise((resolve) => setTimeout(resolve, 20));
    await updateEnvelope();
  };

  // Expose methods for parent component
  defineExpose({
    reset,
    randomize,
  });
</script>

<style scoped>
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
