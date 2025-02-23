<template>
  <div class="module-panel h-full">
    <div class="grid grid-cols-4 gap-4 h-full">
      <!-- Tone 1 -->
      <div class="flex flex-col gap-2">
        <div class="text-center">
          <div class="module-title">Tone 1</div>
        </div>

        <!-- Color -->
        <div class="control-group">
          <Knob
            v-model="filters[0].freq"
            :min="80"
            :max="800"
            :step="10"
            class="w-10 h-10"
            @update:modelValue="updateFilters"
          />
          <div class="module-value">{{ formatFreq(filters[0].freq) }}</div>
          <label class="module-label">Color</label>
        </div>

        <!-- Focus -->
        <div class="control-group">
          <Knob
            v-model="filters[0].q"
            :min="1.2"
            :max="4.8"
            :step="0.2"
            class="w-10 h-10"
            @update:modelValue="updateFilters"
          />
          <div class="module-value">{{ formatQ(filters[0].q) }}</div>
          <label class="module-label">Focus</label>
        </div>
      </div>

      <!-- Tone 2 -->
      <div class="flex flex-col gap-2">
        <div class="text-center">
          <div class="module-title">Tone 2</div>
        </div>

        <!-- Color -->
        <div class="control-group">
          <Knob
            v-model="filters[1].freq"
            :min="200"
            :max="2000"
            :step="10"
            class="w-10 h-10"
            @update:modelValue="updateFilters"
          />
          <div class="module-value">{{ formatFreq(filters[1].freq) }}</div>
          <label class="module-label">Color</label>
        </div>

        <!-- Focus -->
        <div class="control-group">
          <Knob
            v-model="filters[1].q"
            :min="1.2"
            :max="4.8"
            :step="0.2"
            class="w-10 h-10"
            @update:modelValue="updateFilters"
          />
          <div class="module-value">{{ formatQ(filters[1].q) }}</div>
          <label class="module-label">Focus</label>
        </div>
      </div>

      <!-- Mix 1 -->
      <div class="flex flex-col gap-2">
        <div class="text-center">
          <div class="module-title">Mix 1</div>
        </div>

        <!-- Bass -->
        <div class="control-group">
          <Knob
            v-model="toneShape.low"
            :min="-4.8"
            :max="3.6"
            :step="0.2"
            class="w-10 h-10"
            @update:modelValue="updateToneShape"
          />
          <div class="module-value">{{ formatDb(toneShape.low) }}</div>
          <label class="module-label">Bass</label>
        </div>

        <!-- Middle -->
        <div class="control-group">
          <Knob
            v-model="toneShape.mid"
            :min="-2.4"
            :max="2.4"
            :step="0.2"
            class="w-10 h-10"
            @update:modelValue="updateToneShape"
          />
          <div class="module-value">{{ formatDb(toneShape.mid) }}</div>
          <label class="module-label">Middle</label>
        </div>
      </div>

      <!-- Mix 2 -->
      <div class="flex flex-col gap-2">
        <div class="text-center">
          <div class="module-title">Mix 2</div>
        </div>

        <!-- Treble -->
        <div class="control-group">
          <Knob
            v-model="toneShape.high"
            :min="-4.8"
            :max="3.6"
            :step="0.2"
            class="w-10 h-10"
            @update:modelValue="updateToneShape"
          />
          <div class="module-value">{{ formatDb(toneShape.high) }}</div>
          <label class="module-label">Treble</label>
        </div>

        <!-- Presence -->
        <div class="control-group">
          <Knob
            v-model="toneShape.presence"
            :min="0"
            :max="3.6"
            :step="0.2"
            class="w-10 h-10"
            @update:modelValue="updateToneShape"
          />
          <div class="module-value">
            {{ formatPresence(toneShape.presence) }}
          </div>
          <label class="module-label">Presence</label>
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
    { freq: 440, q: 2.4 }, // Start at A4 with moderate focus
    { freq: 880, q: 2.4 }, // Start an octave up with moderate focus
  ];

  const defaultToneShape = {
    low: 1.2, // Slight bass warmth
    mid: -0.8, // Slight mid dip for clarity
    high: -1.2, // Gentle high end roll-off
    presence: 1.8, // Moderate presence boost
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

  // Format Q values without descriptive text
  const formatQ = (q) => {
    return q.toFixed(1);
  };

  // Format dB values without descriptive text
  const formatDb = (db) => {
    const prefix = db > 0 ? "+" : "";
    return `${prefix}${db.toFixed(1)}`;
  };

  // Format presence values without descriptive text
  const formatPresence = (value) => {
    return value.toFixed(1);
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
      toneShape.value.high,
      toneShape.value.presence
    );
  };

  // Reset to defaults
  const reset = () => {
    filters.value = defaultFilters.map((filter) => ({ ...filter }));
    toneShape.value = { ...defaultToneShape };
    updateFilters();
    updateToneShape();
  };

  // Randomize values with musical constraints
  const randomize = () => {
    filters.value = filters.value.map((_, i) => {
      // Calculate frequency within the optimal range for each filter
      const minFreq = i === 0 ? 80 : 200;
      const maxFreq = i === 0 ? 800 : 2000;
      const freqRange = Math.log(maxFreq / minFreq);
      const randomFreq = Math.exp(Math.random() * freqRange) * minFreq;

      // Focus (Q) favors musical values
      const q = 1.2 + Math.random() * 2.4;

      return {
        freq: randomFreq,
        q: q,
      };
    });

    // Randomize tone shape with musical constraints
    toneShape.value = {
      low: (Math.random() * 4.8 - 2.4) * 0.75,
      mid: (Math.random() * 2.4 - 1.2) * 0.75,
      high: (Math.random() * 3.6 - 2.4) * 0.75,
      presence: 1.2 + Math.random() * 1.6,
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
    @apply bg-zinc-900/30 rounded-lg p-3;
  }

  .control-group {
    @apply flex flex-col items-center gap-1;
  }

  .module-value {
    @apply text-[10px] font-mono text-zinc-500 text-center mt-0.5;
  }

  .module-label {
    @apply text-[11px] font-medium text-zinc-400 text-center;
  }

  .module-title {
    @apply text-sm font-medium text-zinc-300;
  }
</style>
