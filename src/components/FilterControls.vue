<template>
  <div class="module-panel">
    <div class="grid grid-cols-4 gap-2">
      <!-- Dual Bandpass Filters -->
      <div v-for="n in 2" :key="n" class="flex flex-col gap-2">
        <div class="text-center">
          <div class="module-label">Filter {{ n }}</div>
        </div>

        <!-- Frequency -->
        <div class="control-group">
          <Knob
            v-model="filters[n - 1].freq"
            :min="20"
            :max="20000"
            :step="1"
            class="w-10 h-10"
            @update:modelValue="updateFilters"
          />
          <div class="module-value">{{ formatFreq(filters[n - 1].freq) }}</div>
          <label class="module-label">Freq</label>
        </div>

        <!-- Resonance -->
        <div class="control-group">
          <Knob
            v-model="filters[n - 1].q"
            :min="0.1"
            :max="10"
            :step="0.1"
            class="w-10 h-10"
            @update:modelValue="updateFilters"
          />
          <div class="module-value">{{ filters[n - 1].q.toFixed(1) }}</div>
          <label class="module-label">Res</label>
        </div>
      </div>

      <!-- Tone Shaper -->
      <div v-for="n in 2" :key="n + 2" class="flex flex-col gap-2">
        <div class="text-center">
          <div class="module-label">EQ {{ n }}</div>
        </div>

        <!-- Low/High -->
        <div class="control-group">
          <Knob
            v-model="toneShape[n === 1 ? 'low' : 'high']"
            :min="-12"
            :max="12"
            :step="0.1"
            class="w-10 h-10"
            @update:modelValue="updateToneShape"
          />
          <div class="module-value">
            {{ formatDb(toneShape[n === 1 ? "low" : "high"]) }}
          </div>
          <label class="module-label">{{ n === 1 ? "Low" : "High" }}</label>
        </div>

        <!-- Mid -->
        <div class="control-group">
          <Knob
            v-model="toneShape.mid"
            :min="-12"
            :max="12"
            :step="0.1"
            class="w-10 h-10"
            @update:modelValue="updateToneShape"
          />
          <div class="module-value">{{ formatDb(toneShape.mid) }}</div>
          <label class="module-label">Mid</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

  // Default values
  const defaultFilters = [
    { freq: 1000, q: 1 },
    { freq: 2000, q: 1 },
  ];

  const defaultToneShape = {
    low: 0,
    mid: 0,
    high: 0,
  };

  // Initialize states
  const filters = ref(defaultFilters.map((filter) => ({ ...filter })));
  const toneShape = ref({ ...defaultToneShape });

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
    filters.value.forEach((filter, i) => {
      audioEngine.setFilter(i + 1, filter.freq, filter.q);
    });
  };

  // Update tone shaper
  const updateToneShape = () => {
    audioEngine.setToneShape(
      toneShape.value.low,
      toneShape.value.mid,
      toneShape.value.high
    );
  };

  // Reset to defaults
  const reset = () => {
    filters.value = defaultFilters.map((filter) => ({ ...filter }));
    toneShape.value = { ...defaultToneShape };
    updateFilters();
    updateToneShape();
  };

  // Randomize values
  const randomize = () => {
    filters.value = filters.value.map(() => ({
      freq: Math.exp(Math.random() * Math.log(20000 / 20)) * 20,
      q: 0.1 + Math.random() * 9.9,
    }));
    toneShape.value = {
      low: -12 + Math.random() * 24,
      mid: -12 + Math.random() * 24,
      high: -12 + Math.random() * 24,
    };
    updateFilters();
    updateToneShape();
  };

  // Expose methods for parent component
  defineExpose({
    reset,
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
