<template>
  <div class="oscillator-bank">
    <!-- Oscillator Controls -->
    <div class="grid grid-cols-3 gap-4">
      <div v-for="n in 3" :key="n" class="oscillator-module">
        <div class="module-header">
          <h3 class="text-sm font-medium text-zinc-300">Oscillator {{ n }}</h3>
          <div class="flex gap-2">
            <button
              @click="toggleOscillator(n - 1)"
              :class="[
                'px-2 py-1 text-xs rounded transition-colors',
                isPlaying[n - 1]
                  ? 'bg-emerald-500/20 text-emerald-500'
                  : 'bg-zinc-800 text-zinc-400',
              ]"
            >
              {{ isPlaying[n - 1] ? "On" : "Off" }}
            </button>
          </div>
        </div>

        <!-- Frequency Controls -->
        <div class="control-group">
          <Knob
            v-model="frequencies[n - 1]"
            :min="20"
            :max="2000"
            :step="1"
            log
            class="w-12 h-12"
          />
          <div class="module-value">{{ formatFreq(frequencies[n - 1]) }}</div>
          <label class="module-label">Frequency</label>
        </div>

        <!-- Fine Tune -->
        <div class="control-group">
          <Knob
            v-model="detunes[n - 1]"
            :min="-100"
            :max="100"
            :step="1"
            class="w-10 h-10"
          />
          <div class="module-value">{{ formatCents(detunes[n - 1]) }}</div>
          <label class="module-label">Fine</label>
        </div>

        <!-- Waveform Selection -->
        <div class="control-group">
          <select
            v-model="waveforms[n - 1]"
            class="bg-zinc-800 text-zinc-300 text-sm rounded px-2 py-1"
          >
            <option value="sine">Sine</option>
            <option value="triangle">Triangle</option>
            <option value="sawtooth">Sawtooth</option>
            <option value="square">Square</option>
            <option value="custom">Custom</option>
          </select>
          <label class="module-label">Waveform</label>
        </div>

        <!-- FM Amount -->
        <div class="control-group">
          <Knob
            v-model="fmAmounts[n - 1]"
            :min="0"
            :max="1000"
            :step="1"
            class="w-10 h-10"
          />
          <div class="module-value">{{ formatFM(fmAmounts[n - 1]) }}</div>
          <label class="module-label">FM</label>
        </div>
      </div>
    </div>

    <!-- Cross-Modulation Matrix -->
    <div class="mt-4 p-3 bg-zinc-900/50 rounded">
      <h4 class="text-xs font-medium text-zinc-400 mb-2">Modulation Matrix</h4>
      <div class="grid grid-cols-3 gap-2">
        <div v-for="(src, i) in 3" :key="'src' + i" class="text-center">
          <div v-for="(dest, j) in 3" :key="'dest' + j" class="mb-1">
            <input
              type="checkbox"
              v-model="modMatrix[i][j]"
              :disabled="i === j"
              class="form-checkbox"
            />
            <span class="text-xs text-zinc-500 ml-1"
              >{{ i + 1 }} → {{ j + 1 }}</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import Knob from "../Knob.vue";

  // State
  const frequencies = ref([440, 440, 440]);
  const detunes = ref([0, 0, 0]);
  const waveforms = ref(["sine", "sine", "sine"]);
  const fmAmounts = ref([0, 0, 0]);
  const isPlaying = ref([false, false, false]);
  const modMatrix = ref([
    [false, false, false],
    [false, false, false],
    [false, false, false],
  ]);

  // Formatters
  const formatFreq = (freq) => `${Math.round(freq)} Hz`;
  const formatCents = (cents) => `${cents > 0 ? "+" : ""}${cents}¢`;
  const formatFM = (amount) => `${amount}`;

  // Methods
  const toggleOscillator = (index) => {
    isPlaying.value[index] = !isPlaying.value[index];
    emit("oscillatorToggle", { index, state: isPlaying.value[index] });
  };

  // Events
  const emit = defineEmits([
    "update:frequency",
    "update:detune",
    "update:waveform",
    "update:fmAmount",
    "oscillatorToggle",
    "modMatrixUpdate",
  ]);

  // Watch for changes
  watch(frequencies, (newVal) => emit("update:frequency", newVal));
  watch(detunes, (newVal) => emit("update:detune", newVal));
  watch(waveforms, (newVal) => emit("update:waveform", newVal));
  watch(fmAmounts, (newVal) => emit("update:fmAmount", newVal));
  watch(modMatrix, (newVal) => emit("modMatrixUpdate", newVal));

  // Expose methods for parent
  defineExpose({
    reset: () => {
      frequencies.value = [440, 440, 440];
      detunes.value = [0, 0, 0];
      waveforms.value = ["sine", "sine", "sine"];
      fmAmounts.value = [0, 0, 0];
      modMatrix.value = [
        [false, false, false],
        [false, false, false],
        [false, false, false],
      ];
    },
  });
</script>

<style scoped>
  .oscillator-module {
    @apply p-4 bg-zinc-900/50 rounded-lg;
  }

  .module-header {
    @apply flex justify-between items-center mb-4;
  }

  .control-group {
    @apply flex flex-col items-center gap-1 mb-3;
  }

  .module-value {
    @apply text-[10px] font-mono text-zinc-500 text-center mt-0.5;
  }

  .module-label {
    @apply text-[11px] font-medium text-zinc-400 text-center;
  }

  .form-checkbox {
    @apply rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-emerald-500/20;
  }
</style>
