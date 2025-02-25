<template>
  <div class="flex flex-col gap-4" v-if="mode === 'shape'">
    <!-- Shape Controls -->
    <div class="flex gap-6">
      <!-- Attack -->
      <div class="control-group">
        <Knob
          v-model="attack"
          :min="10"
          :max="1000"
          :step="1"
          class="w-10 h-10"
        />
        <div class="module-value">{{ formatTime(attack) }}</div>
        <label class="module-label">Attack</label>
      </div>

      <!-- Release -->
      <div class="control-group">
        <Knob
          v-model="release"
          :min="10"
          :max="2000"
          :step="1"
          class="w-10 h-10"
        />
        <div class="module-value">{{ formatTime(release) }}</div>
        <label class="module-label">Release</label>
      </div>

      <!-- Amount -->
      <div class="control-group">
        <Knob
          v-model="amount"
          :min="0"
          :max="1"
          :step="0.01"
          class="w-10 h-10"
        />
        <div class="module-value">{{ formatPercent(amount) }}</div>
        <label class="module-label">Amount</label>
      </div>
    </div>
  </div>

  <div class="flex flex-col gap-4" v-else>
    <!-- Behavior Controls -->
    <div class="flex gap-6">
      <!-- Cycle Buttons -->
      <div v-for="n in 4" :key="n" class="control-group">
        <button
          class="w-10 h-10 rounded bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center border border-zinc-700/50"
          :class="{ 'border-emerald-500/50': cycleStates[n - 1] }"
          @click="toggleCycle(n - 1)"
        >
          <IconHolder
            class="w-4 h-4"
            :class="{ 'text-emerald-400': cycleStates[n - 1] }"
          >
            <RotateCcw v-if="cycleStates[n - 1]" />
            <ArrowRight v-else />
          </IconHolder>
        </button>
        <div class="module-value">{{ n }}</div>
        <label class="module-label">{{
          cycleStates[n - 1] ? "Cycle" : "Once"
        }}</label>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch, onMounted } from "vue";
  import { RotateCcw, ArrowRight } from "lucide-vue-next";
  import Knob from "./Knob.vue";
  import IconHolder from "./IconHolder.vue";
  import audioEngine from "../services/AudioEngine.js";

  const props = defineProps({
    mode: {
      type: String,
      required: true,
      validator: (value) => ["shape", "behavior"].includes(value),
    },
  });

  // Shape controls
  const attack = ref(120);
  const release = ref(461);
  const amount = ref(0.89);

  // Behavior controls
  const cycleStates = ref([false, false, true, true]);

  // Check if audio engine is ready
  const audioInitialized = ref(false);

  // Initialize audio engine if needed
  onMounted(async () => {
    if (!audioEngine.initialized) {
      try {
        await audioEngine.initialize();
        audioInitialized.value = true;
        console.log("Audio engine initialized from EnvelopeControls");

        // Load current settings from engine after initialization
        loadCurrentSettings();

        // Apply our initial settings
        updateShape();
        updateBehavior();
      } catch (error) {
        console.error("Failed to initialize audio engine:", error);
      }
    } else {
      audioInitialized.value = true;
      // Load current settings from engine if already initialized
      loadCurrentSettings();
    }
  });

  // Load current settings from audio engine
  const loadCurrentSettings = () => {
    if (!audioInitialized.value) return;

    // Load envelope cycling state
    for (let i = 0; i < 4; i++) {
      if (audioEngine.envelopes && audioEngine.envelopes[i]) {
        cycleStates.value[i] = !!audioEngine.envelopes[i].isLooping;
      }
    }

    // Load envelope shape parameters
    if (audioEngine.globalEnvelope) {
      attack.value = Math.round(audioEngine.globalEnvelope.rise * 1000);
      release.value = Math.round(audioEngine.globalEnvelope.fall * 1000);
      amount.value = audioEngine.globalEnvelope.level;
    }
  };

  const toggleCycle = (index) => {
    cycleStates.value[index] = !cycleStates.value[index];
    updateBehavior();
  };

  const formatTime = (ms) => {
    return `${ms}ms`;
  };

  const formatPercent = (value) => {
    return `${Math.round(value * 100)}%`;
  };

  const updateShape = () => {
    if (!audioInitialized.value) return;

    // Convert milliseconds to seconds for the audio engine
    const attackSec = attack.value / 1000;
    const releaseSec = release.value / 1000;

    console.log(
      `Setting envelope: attack=${attackSec}s, release=${releaseSec}s, amount=${amount.value}`
    );

    audioEngine.setEnvelope(0, {
      rise: attackSec,
      fall: releaseSec,
      level: amount.value,
    });
  };

  const updateBehavior = () => {
    if (!audioInitialized.value) return;

    cycleStates.value.forEach((isLooping, index) => {
      console.log(`Setting envelope ${index} cycling: ${isLooping}`);
      audioEngine.setEnvelopeLFO(index, isLooping);
    });
  };

  // Reset function
  const reset = () => {
    if (props.mode === "shape") {
      // Default envelope parameters from the signal path documentation
      attack.value = 100; // 100ms (0.1s) matches the 0.1s rise time in globalEnvelope
      release.value = 200; // 200ms (0.2s) matches the 0.2s fall time in globalEnvelope
      amount.value = 0.8; // 80% matches the 0.8 level in globalEnvelope
      updateShape();
    } else {
      // Envelope C & D should be cycling by default (indices 2 & 3)
      cycleStates.value = [false, false, true, true];
      updateBehavior();
    }
  };

  // Randomize function
  const randomize = () => {
    if (props.mode === "shape") {
      attack.value = Math.floor(10 + Math.random() * 990); // 10-1000ms
      release.value = Math.floor(10 + Math.random() * 1990); // 10-2000ms
      amount.value = Math.random(); // 0-1
      updateShape();
    } else {
      cycleStates.value = cycleStates.value.map(() => Math.random() > 0.5);
      updateBehavior();
    }
  };

  // Watch for changes and update the audio engine
  watch([attack, release, amount], updateShape);
  watch(cycleStates, updateBehavior, { deep: true });

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
