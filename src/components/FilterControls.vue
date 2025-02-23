<template>
  <div class="module-panel">
    <div class="grid grid-cols-4 gap-2">
      <!-- Dual Bandpass Filters -->
      <div v-for="n in 2" :key="n" class="flex flex-col gap-2">
        <div class="text-center">
          <div class="module-title">Tone {{ n }}</div>
        </div>

        <!-- Frequency -->
        <div class="control-group">
          <Knob
            v-model="filters[n - 1].freq"
            :min="[80, 200][n - 1]"
            :max="[800, 2000][n - 1]"
            :step="10"
            class="w-10 h-10"
            @update:modelValue="updateFilters"
          />
          <div class="module-value">{{ formatFreq(filters[n - 1].freq) }}</div>
          <label class="module-label">Color</label>
        </div>

        <!-- Resonance -->
        <div class="control-group">
          <Knob
            v-model="filters[n - 1].q"
            :min="1.2"
            :max="4.8"
            :step="0.2"
            class="w-10 h-10"
            @update:modelValue="updateFilters"
          />
          <div class="module-value">{{ formatQ(filters[n - 1].q) }}</div>
          <label class="module-label">Focus</label>
        </div>
      </div>

      <!-- Tone Shaper -->
      <div v-for="n in 2" :key="n + 2" class="flex flex-col gap-2">
        <div class="text-center">
          <div class="module-title">Mix {{ n }}</div>
        </div>

        <!-- Low/High -->
        <div class="control-group">
          <Knob
            v-model="toneShape[n === 1 ? 'low' : 'high']"
            :min="-4.8"
            :max="3.6"
            :step="0.2"
            class="w-10 h-10"
            @update:modelValue="updateToneShape"
          />
          <div class="module-value">
            {{ formatDb(toneShape[n === 1 ? "low" : "high"]) }}
          </div>
          <label class="module-label">{{ n === 1 ? "Bass" : "Treble" }}</label>
        </div>

        <!-- Mid/Presence -->
        <div class="control-group">
          <Knob
            v-model="toneShape[n === 1 ? 'mid' : 'presence']"
            :min="n === 1 ? -2.4 : 0"
            :max="n === 1 ? 2.4 : 3.6"
            :step="0.2"
            class="w-10 h-10"
            @update:modelValue="updateToneShape"
          />
          <div class="module-value">
            {{
              n === 1
                ? formatDb(toneShape.mid)
                : formatPresence(toneShape.presence)
            }}
          </div>
          <label class="module-label">{{
            n === 1 ? "Middle" : "Presence"
          }}</label>
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

  // Format Q values with descriptive text
  const formatQ = (q) => {
    let desc = "";
    if (q < 2) desc = " (Smooth)";
    else if (q < 3.6) desc = " (Musical)";
    else desc = " (Sharp)";
    return `${q.toFixed(1)}${desc}`;
  };

  // Format dB values with descriptive text
  const formatDb = (db) => {
    const prefix = db > 0 ? "+" : "";
    let desc = "";
    if (Math.abs(db) < 1.2) desc = " (Subtle)";
    else if (Math.abs(db) < 3.2) desc = " (Moderate)";
    else desc = " (Strong)";
    return `${prefix}${db.toFixed(1)}${desc}`;
  };

  // Format presence values with descriptive text
  const formatPresence = (value) => {
    let desc = "";
    if (value < 1.2) desc = " (Soft)";
    else if (value < 2.4) desc = " (Clear)";
    else desc = " (Bright)";
    return `${value.toFixed(1)}${desc}`;
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
      const q = 1.2 + Math.random() * 2.4; // Bias towards moderate Q values

      return {
        freq: randomFreq,
        q: q,
      };
    });

    // Randomize tone shape with musical constraints
    toneShape.value = {
      low: (Math.random() * 4.8 - 2.4) * 0.75, // Bias towards subtle boost
      mid: (Math.random() * 2.4 - 1.2) * 0.75, // Keep mids more subtle
      high: (Math.random() * 3.6 - 2.4) * 0.75, // Bias towards slight cut
      presence: 1.2 + Math.random() * 1.6, // Keep presence in the clear range
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
    @apply text-[11px] font-mono text-zinc-500 text-center mt-1;
  }

  .module-label {
    @apply text-xs font-medium text-zinc-400 text-center;
  }

  .module-title {
    @apply text-sm font-medium text-zinc-300 mb-2;
  }
</style>
