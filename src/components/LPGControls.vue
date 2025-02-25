<template>
  <div class="module-panel">
    <div class="grid grid-cols-4 gap-4">
      <div v-for="n in 4" :key="n" class="flex flex-col items-center gap-4">
        <div class="text-center">
          <div class="module-label">{{ n }}</div>
        </div>

        <!-- Mode Selector -->
        <div class="control-group">
          <select
            v-model="lpgs[n - 1].mode"
            class="bg-zinc-800/50 text-zinc-300 text-[10px] rounded px-2 py-1 border border-zinc-700/50"
            @change="updateLPG(n - 1)"
          >
            <option value="vcf">VCF</option>
            <option value="vca">VCA</option>
            <option value="both">VCF+VCA</option>
          </select>
          <label class="module-label">Mode</label>
        </div>

        <!-- Level Control -->
        <div class="control-group">
          <Knob
            v-model="lpgs[n - 1].level"
            :min="0.1"
            :max="0.9"
            :step="0.01"
            class="w-10 h-10"
          />
          <div class="module-value">{{ formatPercent(lpgs[n - 1].level) }}</div>
          <label class="module-label">Level</label>
        </div>

        <!-- Mod Amount -->
        <div class="control-group">
          <Knob
            v-model="lpgs[n - 1].modAmount"
            :min="0.1"
            :max="0.9"
            :step="0.01"
            class="w-10 h-10"
          />
          <div class="module-value">
            {{ formatPercent(lpgs[n - 1].modAmount) }}
          </div>
          <label class="module-label">Mod</label>
        </div>

        <!-- Loop Toggle -->
        <button
          @click="toggleMode(n - 1)"
          :class="[
            lpgs[n - 1].loopMode
              ? 'bg-emerald-500/20 text-emerald-500'
              : 'bg-zinc-800/50 text-zinc-400',
            'px-2 py-1 text-[10px] rounded transition-colors flex items-center justify-center w-8 h-8',
          ]"
        >
          <span>{{ lpgs[n - 1].loopMode ? "↻" : "→" }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch, onMounted, nextTick } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";
  import ToneService from "../services/ToneService";
  const Tone = ToneService.getTone();

  // Refined default values based on signal path documentation
  const defaultLPG = (index) => ({
    mode: index < 2 ? "vcf" : "both", // VCF for 1&2, VCF+VCA for 3&4
    level: 0.7, // Reduced from 0.85 for better headroom
    modAmount: 0.5, // Reduced from 0.75 for more subtle modulation
    loopMode: false,
  });

  const lpgs = ref(
    Array(4)
      .fill()
      .map((_, index) => defaultLPG(index))
  );

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  const toggleMode = (index) => {
    lpgs.value[index].loopMode = !lpgs.value[index].loopMode;
    updateLPG(index);
  };

  const updateLPG = async (index) => {
    try {
      await ToneService.ensureStarted();

      if (!audioEngine.initialized) {
        await audioEngine.initialize();
        ToneService.setAudioEngineInitialized(true);
      }

      const lpg = lpgs.value[index];
      if (!lpg) return;

      // Add value smoothing and clamping
      const smoothedValues = {
        mode: lpg.mode,
        level: Math.max(0.1, Math.min(0.9, lpg.level)), // Clamp between 0.1 and 0.9
        modAmount: Math.max(0.1, Math.min(0.9, lpg.modAmount)), // Clamp between 0.1 and 0.9
        loopMode: lpg.loopMode,
      };

      // Update LPG parameters with smoothed values
      audioEngine.setLPGParams(index, smoothedValues);
    } catch (error) {
      console.warn(`Error updating LPG ${index}:`, error);
    }
  };

  // Randomize with more musical values
  const randomize = async () => {
    const newValues = lpgs.value.map(() => ({
      mode: ["vcf", "vca", "both"][Math.floor(Math.random() * 3)],
      level: Math.random() * 0.3 + 0.4, // 0.4 to 0.7 range
      modAmount: Math.random() * 0.4 + 0.3, // 0.3 to 0.7 range
      loopMode: Math.random() > 0.5,
    }));

    lpgs.value = newValues;
    await nextTick();

    for (let i = 0; i < lpgs.value.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50)); // Increased delay for smoother transitions
      await updateLPG(i);
    }
  };

  // Initialize on mount
  onMounted(async () => {
    try {
      if (ToneService.isAudioEngineInitialized()) {
        console.log("Audio already initialized in LPGControls");
        return;
      }

      await ToneService.ensureStarted();

      if (!audioEngine.initialized) {
        await audioEngine.initialize();
        ToneService.setAudioEngineInitialized(true);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      await updateAllLPGs();
    } catch (error) {
      console.warn("Error during LPG initialization:", error);
    }
  });

  const updateAllLPGs = async () => {
    for (let i = 0; i < lpgs.value.length; i++) {
      await updateLPG(i);
      await new Promise((resolve) => setTimeout(resolve, 50));
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

  const debouncedUpdate = debounce(updateAllLPGs, 100);

  watch(
    lpgs,
    () => {
      debouncedUpdate();
    },
    { deep: true }
  );

  // Expose methods for parent component
  defineExpose({
    reset: async () => {
      lpgs.value = Array(4)
        .fill()
        .map((_, index) => defaultLPG(index));

      await nextTick();

      for (let i = 0; i < lpgs.value.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        await updateLPG(i);
      }
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

  select {
    @apply appearance-none w-16 text-center cursor-pointer hover:bg-zinc-700/50 transition-colors;
  }

  select:focus {
    @apply outline-none ring-1 ring-emerald-500/50;
  }
</style>
