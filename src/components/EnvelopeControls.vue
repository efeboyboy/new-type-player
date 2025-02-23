<template>
  <div class="module-panel">
    <div class="grid grid-cols-4 gap-4">
      <div v-for="n in 4" :key="n" class="flex flex-col items-center gap-4">
        <div class="text-center">
          <div class="module-title">Shape {{ n }}</div>
        </div>

        <!-- Attack -->
        <div class="control-group">
          <Knob
            v-model="envelopes[n - 1].attack"
            :min="0.001"
            :max="2"
            :step="0.01"
            class="w-10 h-10"
          />
          <div class="module-value">
            {{ formatTime(envelopes[n - 1].attack) }}
          </div>
          <label class="module-label">Start</label>
        </div>

        <!-- Decay -->
        <div class="control-group">
          <Knob
            v-model="envelopes[n - 1].decay"
            :min="0.001"
            :max="2"
            :step="0.01"
            class="w-10 h-10"
          />
          <div class="module-value">
            {{ formatTime(envelopes[n - 1].decay) }}
          </div>
          <label class="module-label">Fade</label>
        </div>

        <!-- Sustain -->
        <div class="control-group">
          <Knob
            v-model="envelopes[n - 1].sustain"
            :min="0"
            :max="1"
            :step="0.1"
            class="w-10 h-10"
          />
          <div class="module-value">
            {{ formatPercent(envelopes[n - 1].sustain) }}
          </div>
          <label class="module-label">Hold</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
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

  // Reset all envelopes to default values
  const reset = () => {
    envelopes.value = envelopes.value.map(() => ({ ...defaultEnvelope }));
    updateAllEnvelopes();
  };

  // Randomize all envelope parameters
  const randomize = () => {
    envelopes.value = envelopes.value.map(() => ({
      attack: Math.random() * 1.999 + 0.001,
      decay: Math.random() * 1.999 + 0.001,
      sustain: Math.random(),
    }));
    updateAllEnvelopes();
  };

  // Expose methods for parent component
  defineExpose({
    reset,
    randomize,
  });

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
    @apply bg-zinc-900/30 rounded-lg p-6;
  }

  .control-group {
    @apply flex flex-col items-center gap-1;
  }

  .module-value {
    @apply text-[11px] font-mono text-zinc-500 text-center mt-1;
  }

  .module-label {
    @apply text-xs font-medium text-zinc-400 text-center;
  }

  .module-title {
    @apply text-sm font-medium text-zinc-300 mb-2;
  }
</style>
