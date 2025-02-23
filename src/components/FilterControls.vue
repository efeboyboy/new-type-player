<template>
  <div class="w-full h-full grid grid-cols-2 gap-2">
    <!-- Dual Bandpass Section -->
    <div class="module-panel">
      <div class="module-title">Band Pass</div>
      <div class="grid grid-cols-2 gap-1.5">
        <!-- Filter 1 -->
        <div class="control-group">
          <Knob
            v-model="filter1.freq"
            :min="20"
            :max="20000"
            :step="1"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="updateFilters"
          />
          <div class="module-value">{{ formatFreq(filter1.freq) }}</div>
          <label class="module-label">Freq 1</label>
        </div>
        <div class="control-group">
          <Knob
            v-model="filter1.q"
            :min="0.1"
            :max="10"
            :step="0.1"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="updateFilters"
          />
          <div class="module-value">{{ filter1.q.toFixed(1) }}</div>
          <label class="module-label">Q 1</label>
        </div>
        <!-- Filter 2 -->
        <div class="control-group">
          <Knob
            v-model="filter2.freq"
            :min="20"
            :max="20000"
            :step="1"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="updateFilters"
          />
          <div class="module-value">{{ formatFreq(filter2.freq) }}</div>
          <label class="module-label">Freq 2</label>
        </div>
        <div class="control-group">
          <Knob
            v-model="filter2.q"
            :min="0.1"
            :max="10"
            :step="0.1"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="updateFilters"
          />
          <div class="module-value">{{ filter2.q.toFixed(1) }}</div>
          <label class="module-label">Q 2</label>
        </div>
      </div>
    </div>

    <!-- Tone Shaper Section -->
    <div class="module-panel">
      <div class="module-title">Tone Shape</div>
      <div class="grid grid-cols-3 gap-1.5">
        <div class="control-group">
          <Knob
            v-model="toneShape.low"
            :min="-12"
            :max="12"
            :step="0.1"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="updateToneShape"
          />
          <div class="module-value">{{ formatDb(toneShape.low) }}</div>
          <label class="module-label">Low</label>
        </div>
        <div class="control-group">
          <Knob
            v-model="toneShape.mid"
            :min="-12"
            :max="12"
            :step="0.1"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="updateToneShape"
          />
          <div class="module-value">{{ formatDb(toneShape.mid) }}</div>
          <label class="module-label">Mid</label>
        </div>
        <div class="control-group">
          <Knob
            v-model="toneShape.high"
            :min="-12"
            :max="12"
            :step="0.1"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="updateToneShape"
          />
          <div class="module-value">{{ formatDb(toneShape.high) }}</div>
          <label class="module-label">High</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

  // Initialize filter states
  const filter1 = ref({ freq: 1000, q: 1 });
  const filter2 = ref({ freq: 2000, q: 1 });
  const toneShape = ref({ low: 0, mid: 0, high: 0 });

  // Format frequency in Hz or kHz
  const formatFreq = (freq) => {
    return freq >= 1000
      ? `${(freq / 1000).toFixed(1)}k`
      : `${Math.round(freq)}`;
  };

  // Format dB values
  const formatDb = (db) => {
    return db > 0 ? `+${db.toFixed(1)}` : db.toFixed(1);
  };

  // Update filter parameters
  const updateFilters = () => {
    // Update all oscillator filters
    for (let i = 1; i <= 3; i++) {
      audioEngine.setFilter(i, filter1.value.freq, filter1.value.q);
      audioEngine.setFilter(i + 3, filter2.value.freq, filter2.value.q);
    }
  };

  // Update tone shaper
  const updateToneShape = () => {
    audioEngine.setToneShape(
      toneShape.value.low,
      toneShape.value.mid,
      toneShape.value.high
    );
  };

  // Watch for changes
  watch([filter1, filter2], updateFilters, { deep: true });
  watch(toneShape, updateToneShape, { deep: true });
</script>

<style scoped>
  .module-panel {
    @apply bg-zinc-900/30 rounded-lg p-2;
  }

  .module-title {
    @apply text-xs font-medium text-zinc-400 mb-2;
  }

  .control-group {
    @apply flex flex-col items-center gap-0.5;
  }

  .module-value {
    @apply text-xs font-medium text-zinc-500;
  }

  .module-label {
    @apply text-xs text-zinc-400;
  }
</style>
