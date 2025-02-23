<template>
  <div class="grid grid-cols-2 gap-2">
    <!-- Two columns of two envelope generators each -->
    <div v-for="group in 2" :key="group" class="grid grid-rows-2 gap-2">
      <div v-for="n in 2" :key="n" class="module-panel">
        <div class="module-title text-sm mb-2">
          Envelope Generator 284-{{ (group - 1) * 2 + n }}
        </div>
        <div class="grid grid-cols-3 gap-1.5">
          <!-- Attack -->
          <div class="control-group">
            <Knob
              v-model="envelopes[(group - 1) * 2 + n - 1].attack"
              :min="0.001"
              :max="2"
              :step="0.001"
              class="w-full aspect-square max-w-[32px]"
            />
            <div class="module-value text-sm">
              {{ formatTime(envelopes[(group - 1) * 2 + n - 1].attack) }}
            </div>
            <label class="module-label text-xs">Attack</label>
          </div>

          <!-- Decay -->
          <div class="control-group">
            <Knob
              v-model="envelopes[(group - 1) * 2 + n - 1].decay"
              :min="0.001"
              :max="2"
              :step="0.001"
              class="w-full aspect-square max-w-[32px]"
            />
            <div class="module-value text-sm">
              {{ formatTime(envelopes[(group - 1) * 2 + n - 1].decay) }}
            </div>
            <label class="module-label text-xs">Decay</label>
          </div>

          <!-- Sustain -->
          <div class="control-group">
            <Knob
              v-model="envelopes[(group - 1) * 2 + n - 1].sustain"
              :min="0"
              :max="1"
              :step="0.01"
              class="w-full aspect-square max-w-[32px]"
            />
            <div class="module-value text-sm">
              {{ formatPercent(envelopes[(group - 1) * 2 + n - 1].sustain) }}
            </div>
            <label class="module-label text-xs">Sustain</label>
          </div>
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

  // Update envelope parameters in audio engine
  watch(
    envelopes.value,
    (newValues) => {
      newValues.forEach((env, index) => {
        audioEngine.setEnvelope(index, {
          attack: env.attack,
          decay: env.decay,
          sustain: env.sustain,
        });
      });
    },
    { deep: true }
  );
</script>

<style scoped>
  .control-group {
    @apply flex flex-col items-center gap-1;
  }

  .module-value {
    @apply font-medium text-zinc-300;
  }

  .module-label {
    @apply font-medium text-zinc-500;
  }

  .module-panel {
    @apply bg-zinc-900/30 rounded-lg p-2;
  }
</style>
