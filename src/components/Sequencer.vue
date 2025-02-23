<template>
  <div class="sequencer">
    <div v-if="!sequence || sequence.length === 0" class="empty-state">
      <p class="text-sm text-zinc-500">
        No sequence generated yet. Enter text to begin.
      </p>
    </div>
    <div v-else class="grid gap-3">
      <div v-for="(channel, index) in sequence" :key="index" class="channel">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-2 h-2 rounded-full bg-red-500/40"></div>
          <span class="text-xs text-zinc-400">Channel {{ index + 1 }}</span>
        </div>
        <div class="grid grid-cols-16 gap-1">
          <div
            v-for="(note, stepIndex) in channel"
            :key="stepIndex"
            class="step"
            :class="{ active: isStepActive(index, stepIndex) }"
          >
            <div
              class="step-bar"
              :style="{ height: `${(note / 127) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { store } from "../store.js";

  const sequence = computed(() => store.sequence);
  const currentStep = computed(() => store.currentStep);

  const isStepActive = (channel, step) => {
    return currentStep.value === step;
  };
</script>

<style scoped>
  .empty-state {
    @apply flex items-center justify-center h-32 bg-zinc-950/50 rounded-lg border border-zinc-800/50;
  }

  .channel {
    @apply bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/50;
  }

  .step {
    @apply relative h-16 bg-zinc-900/50 rounded;
    transition: background-color 150ms ease;
  }

  .step.active {
    @apply bg-red-500/10;
  }

  .step-bar {
    @apply absolute bottom-0 left-0 right-0 bg-red-500/30 rounded-t;
    transition: height 150ms ease;
  }

  /* Grid with 16 equal columns */
  .grid-cols-16 {
    grid-template-columns: repeat(16, minmax(0, 1fr));
  }
</style>
