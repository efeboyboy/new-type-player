<template>
  <div class="module-panel">
    <div class="flex items-center justify-between mb-3">
      <div class="module-title">Envelope Generator 284</div>
      <div class="flex items-center gap-2">
        <!-- Reset Button -->
        <button
          @click="resetEnvelopes"
          class="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center group"
          title="Reset to Default"
        >
          <RotateCcw
            :size="14"
            class="text-zinc-400 group-hover:text-emerald-400"
            stroke-width="1.5"
          />
        </button>
        <!-- Randomize Button -->
        <button
          @click="randomizeEnvelopes"
          class="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center group"
          title="Randomize Values"
        >
          <Shuffle
            :size="14"
            class="text-zinc-400 group-hover:text-emerald-400"
            stroke-width="1.5"
          />
        </button>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-2">
      <div v-for="n in 4" :key="n" class="flex flex-col gap-2">
        <div class="text-center">
          <div class="module-label">EG {{ n }}</div>
        </div>

        <!-- Attack -->
        <div class="control-group">
          <Knob
            v-model="envelopes[n - 1].attack"
            :min="0.001"
            :max="2"
            :step="0.001"
            class="w-8 h-8"
          />
          <div class="module-value">
            {{ formatTime(envelopes[n - 1].attack) }}
          </div>
          <label class="module-label">A</label>
        </div>

        <!-- Decay -->
        <div class="control-group">
          <Knob
            v-model="envelopes[n - 1].decay"
            :min="0.001"
            :max="2"
            :step="0.001"
            class="w-8 h-8"
          />
          <div class="module-value">
            {{ formatTime(envelopes[n - 1].decay) }}
          </div>
          <label class="module-label">D</label>
        </div>

        <!-- Sustain -->
        <div class="control-group">
          <Knob
            v-model="envelopes[n - 1].sustain"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-8 h-8"
          />
          <div class="module-value">
            {{ formatPercent(envelopes[n - 1].sustain) }}
          </div>
          <label class="module-label">S</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import { RotateCcw, Shuffle } from "lucide-vue-next";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

  // Default values for each envelope
  const defaultEnvelope = {
    attack: 0.01,
    decay: 0.2,
    sustain: 0.7,
  };

  // Create four envelopes with default values
  const envelopes = ref(
    Array(4)
      .fill()
      .map(() => ({ ...defaultEnvelope }))
  );

  const formatTime = (time) => {
    if (time >= 1) return time.toFixed(1);
    return time.toFixed(3);
  };

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  // Reset all envelopes to default values
  const resetEnvelopes = () => {
    envelopes.value = envelopes.value.map(() => ({ ...defaultEnvelope }));
    updateAllEnvelopes();
  };

  // Randomize all envelope parameters
  const randomizeEnvelopes = () => {
    envelopes.value = envelopes.value.map(() => ({
      attack: Math.random() * 0.5,
      decay: 0.1 + Math.random() * 0.9,
      sustain: Math.random(),
    }));
    updateAllEnvelopes();
  };

  // Update all envelope parameters in audio engine
  const updateAllEnvelopes = () => {
    envelopes.value.forEach((env, index) => {
      audioEngine.setEnvelope(index, {
        attack: env.attack,
        decay: env.decay,
        sustain: env.sustain,
      });
    });
  };

  // Watch for changes and update audio engine
  watch(
    envelopes.value,
    () => {
      updateAllEnvelopes();
    },
    { deep: true }
  );
</script>

<style scoped>
  .module-panel {
    @apply bg-zinc-900/30 rounded-lg p-3;
  }

  .module-title {
    @apply text-sm font-medium text-zinc-400;
  }

  .module-value {
    @apply text-[10px] font-medium text-zinc-500;
  }

  .module-label {
    @apply text-[10px] font-medium text-zinc-400;
  }

  .control-group {
    @apply flex flex-col items-center gap-1;
  }
</style>
