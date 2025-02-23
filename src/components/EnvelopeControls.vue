<template>
  <div class="w-full h-full grid grid-cols-2 gap-2">
    <!-- Envelope 1 & 2 -->
    <div v-for="n in 2" :key="n" class="module-panel">
      <div class="flex items-center justify-between mb-2">
        <div class="module-title">Env {{ n }}</div>
        <button
          class="w-4 h-4 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center"
          :class="{
            'bg-emerald-500/20 border-emerald-500/50': envelopes[n - 1].loop,
          }"
          @click="toggleLoop(n - 1)"
        >
          <div
            class="w-1.5 h-1.5 rounded-full"
            :class="{ 'bg-emerald-500': envelopes[n - 1].loop }"
          ></div>
        </button>
      </div>

      <div class="grid grid-cols-2 gap-1.5">
        <!-- Attack -->
        <div class="control-group">
          <Knob
            v-model="envelopes[n - 1].attack"
            :min="0.01"
            :max="1"
            :step="0.01"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="() => updateEnvelope(n - 1)"
          />
          <div class="module-value">
            {{ formatTime(envelopes[n - 1].attack) }}
          </div>
          <label class="module-label">Attack</label>
        </div>

        <!-- Decay -->
        <div class="control-group">
          <Knob
            v-model="envelopes[n - 1].decay"
            :min="0.01"
            :max="1"
            :step="0.01"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="() => updateEnvelope(n - 1)"
          />
          <div class="module-value">
            {{ formatTime(envelopes[n - 1].decay) }}
          </div>
          <label class="module-label">Decay</label>
        </div>

        <!-- Length -->
        <div class="control-group">
          <Knob
            v-model="envelopes[n - 1].length"
            :min="0.1"
            :max="4"
            :step="0.1"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="() => updateEnvelope(n - 1)"
          />
          <div class="module-value">
            {{ envelopes[n - 1].length.toFixed(1) }}x
          </div>
          <label class="module-label">Length</label>
        </div>

        <!-- Level -->
        <div class="control-group">
          <Knob
            v-model="envelopes[n - 1].level"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="() => updateEnvelope(n - 1)"
          />
          <div class="module-value">
            {{ (envelopes[n - 1].level * 100).toFixed(0) }}
          </div>
          <label class="module-label">Level</label>
        </div>
      </div>
    </div>

    <!-- Envelope 3 & 4 -->
    <div v-for="n in 2" :key="n + 2" class="module-panel">
      <div class="flex items-center justify-between mb-2">
        <div class="module-title">Env {{ n + 2 }}</div>
        <button
          class="w-4 h-4 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center"
          :class="{
            'bg-emerald-500/20 border-emerald-500/50': envelopes[n + 1].loop,
          }"
          @click="toggleLoop(n + 1)"
        >
          <div
            class="w-1.5 h-1.5 rounded-full"
            :class="{ 'bg-emerald-500': envelopes[n + 1].loop }"
          ></div>
        </button>
      </div>

      <div class="grid grid-cols-2 gap-1.5">
        <!-- Attack -->
        <div class="control-group">
          <Knob
            v-model="envelopes[n + 1].attack"
            :min="0.01"
            :max="1"
            :step="0.01"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="() => updateEnvelope(n + 1)"
          />
          <div class="module-value">
            {{ formatTime(envelopes[n + 1].attack) }}
          </div>
          <label class="module-label">Attack</label>
        </div>

        <!-- Decay -->
        <div class="control-group">
          <Knob
            v-model="envelopes[n + 1].decay"
            :min="0.01"
            :max="1"
            :step="0.01"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="() => updateEnvelope(n + 1)"
          />
          <div class="module-value">
            {{ formatTime(envelopes[n + 1].decay) }}
          </div>
          <label class="module-label">Decay</label>
        </div>

        <!-- Length -->
        <div class="control-group">
          <Knob
            v-model="envelopes[n + 1].length"
            :min="0.1"
            :max="4"
            :step="0.1"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="() => updateEnvelope(n + 1)"
          />
          <div class="module-value">
            {{ envelopes[n + 1].length.toFixed(1) }}x
          </div>
          <label class="module-label">Length</label>
        </div>

        <!-- Level -->
        <div class="control-group">
          <Knob
            v-model="envelopes[n + 1].level"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="() => updateEnvelope(n + 1)"
          />
          <div class="module-value">
            {{ (envelopes[n + 1].level * 100).toFixed(0) }}
          </div>
          <label class="module-label">Level</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

  // Initialize envelopes with default values
  const envelopes = ref(
    Array(4)
      .fill()
      .map(() => ({
        attack: 0.01,
        decay: 0.2,
        length: 1,
        level: 0.7,
        loop: false,
      }))
  );

  // Format time values
  const formatTime = (time) => {
    return time >= 1 ? time.toFixed(1) : time.toFixed(2);
  };

  // Update envelope parameters
  const updateEnvelope = (index) => {
    const env = envelopes.value[index];
    audioEngine.setEnvelope(index, {
      attack: env.attack * env.length,
      decay: env.decay * env.length,
      level: env.level,
    });
  };

  // Toggle envelope looping
  const toggleLoop = (index) => {
    envelopes.value[index].loop = !envelopes.value[index].loop;
    audioEngine.setEnvelopeLFO(
      index,
      envelopes.value[index].loop,
      1 / (envelopes.value[index].attack + envelopes.value[index].decay)
    );
  };

  // Watch for changes
  watch(
    envelopes.value,
    () => {
      envelopes.value.forEach((_, index) => updateEnvelope(index));
    },
    { deep: true }
  );
</script>

<style scoped>
  .module-panel {
    @apply bg-zinc-900/30 rounded-lg p-2;
  }

  .module-title {
    @apply text-[10px] font-medium text-zinc-400;
  }

  .control-group {
    @apply flex flex-col items-center gap-0.5;
  }

  .module-value {
    @apply text-[8px] font-medium text-zinc-500;
  }

  .module-label {
    @apply text-[8px] text-zinc-400;
  }
</style>
