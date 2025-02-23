<template>
  <div class="module-panel">
    <div class="grid grid-cols-4 gap-4">
      <div v-for="n in 4" :key="n" class="flex flex-col items-center gap-4">
        <div class="text-center">
          <div class="module-label">Gate {{ n }}</div>
        </div>

        <!-- Response (Rise) -->
        <div class="control-group">
          <Knob
            v-model="lpgs[n - 1].rise"
            :min="0.01"
            :max="1"
            :step="0.01"
            class="w-10 h-10"
          />
          <div class="module-value">{{ formatTime(lpgs[n - 1].rise) }}</div>
          <label class="module-label">Rise</label>
        </div>

        <!-- Fall -->
        <div class="control-group">
          <Knob
            v-model="lpgs[n - 1].fall"
            :min="0.01"
            :max="1"
            :step="0.01"
            class="w-10 h-10"
          />
          <div class="module-value">{{ formatTime(lpgs[n - 1].fall) }}</div>
          <label class="module-label">Fall</label>
        </div>

        <!-- Level -->
        <div class="control-group">
          <Knob
            v-model="lpgs[n - 1].level"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-10 h-10"
          />
          <div class="module-value">{{ formatPercent(lpgs[n - 1].level) }}</div>
          <label class="module-label">Level</label>
        </div>

        <!-- Mode Toggle -->
        <button
          @click="toggleMode(n - 1)"
          :class="{
            'bg-emerald-500/20 text-emerald-500': lpgs[n - 1].loopMode,
            'bg-zinc-800/50 text-zinc-400': !lpgs[n - 1].loopMode,
          }"
          class="px-2 py-1 text-[10px] rounded transition-colors"
        >
          {{ lpgs[n - 1].loopMode ? "LFO" : "Env" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch, onMounted } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";
  import * as Tone from "tone";

  // Default values for each LPG
  const defaultLPG = {
    rise: 0.05, // 50ms rise time - faster attack for better transients
    fall: 0.15, // 150ms fall time - natural decay
    level: 0.85, // 85% level for good presence
    loopMode: false, // Start in envelope mode
  };

  const lpgs = ref(
    Array(4)
      .fill()
      .map((_, index) => ({
        rise: index === 3 ? 0.08 : 0.05, // Slightly slower attack for noise
        fall: index === 3 ? 0.2 : 0.15, // Longer decay for noise
        level: index === 3 ? 0.7 : 0.85, // Lower level for noise
        loopMode: false,
      }))
  );

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  const formatTime = (value) => {
    return `${(value * 1000).toFixed(0)}ms`;
  };

  const toggleMode = (index) => {
    lpgs.value[index].loopMode = !lpgs.value[index].loopMode;
    updateLPG(index);
  };

  const updateLPG = async (index) => {
    try {
      // Ensure audio context is running
      if (Tone.context.state !== "running") {
        await Tone.start();
        await Tone.context.resume();
      }

      // Wait for audio engine initialization
      if (!audioEngine.initialized) {
        await audioEngine.initialize();
      }

      const lpg = lpgs.value[index];
      if (!lpg) return;

      // Add a small delay to ensure nodes are ready
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Set envelope parameters first
      await audioEngine.setEnvelope(index, {
        attack: lpg.rise,
        release: lpg.fall,
        sustain: lpg.level,
        timeScale: 1,
      });

      // Set LPG mode (envelope or LFO)
      await audioEngine.setEnvelopeLFO(
        index,
        lpg.loopMode,
        1 / (lpg.rise + lpg.fall)
      );

      // Set the LPG parameters with retries
      let retries = 3;
      while (retries > 0) {
        try {
          await audioEngine.setLPGParams(index, {
            response: lpg.rise,
            level: lpg.level,
          });
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            console.warn(
              `Failed to set LPG ${index} parameters after 3 attempts`
            );
          } else {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
      }
    } catch (error) {
      console.warn(`Error updating LPG ${index}:`, error);
    }
  };

  // Randomize values
  const randomize = () => {
    lpgs.value = lpgs.value.map(() => ({
      rise: Math.random() * 0.99 + 0.01, // 0.01 to 1
      fall: Math.random() * 0.99 + 0.01, // 0.01 to 1
      level: Math.random(), // 0 to 1
      loopMode: Math.random() > 0.5, // Random mode
    }));
    lpgs.value.forEach((_, index) => updateLPG(index));
  };

  // Watch for changes and update audio engine
  watch(
    lpgs,
    async () => {
      for (let i = 0; i < lpgs.value.length; i++) {
        await updateLPG(i);
      }
    },
    { deep: true }
  );

  // Initialize on mount with default values and proper sequencing
  onMounted(async () => {
    try {
      // First ensure audio context is started
      await Tone.start();

      // Then initialize audio engine
      await audioEngine.initialize();

      // Wait a bit for everything to settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Initialize each LPG with a delay between them
      for (let i = 0; i < lpgs.value.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        await updateLPG(i);
      }
    } catch (error) {
      console.warn("Error during LPG initialization:", error);
    }
  });

  // Expose methods for parent component
  defineExpose({
    reset: () => {
      lpgs.value = Array(4)
        .fill()
        .map((_, index) => ({
          rise: index === 3 ? 0.08 : 0.05,
          fall: index === 3 ? 0.2 : 0.15,
          level: index === 3 ? 0.7 : 0.85,
          loopMode: false,
        }));
      lpgs.value.forEach((_, index) => updateLPG(index));
    },
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
    @apply text-[10px] font-medium text-zinc-500 text-center mt-0.5;
  }

  .module-label {
    @apply text-[10px] font-medium text-zinc-400 text-center;
  }
</style>
