<template>
  <div class="p-4 bg-zinc-900 rounded-lg">
    <h2 class="text-lg font-medium text-zinc-200 mb-4">Oscillator Test</h2>

    <!-- Basic Controls -->
    <div class="space-y-4">
      <!-- On/Off -->
      <div class="flex items-center justify-between">
        <span class="text-sm text-zinc-400">Power</span>
        <button
          @click="toggleOscillator"
          :class="[
            'px-3 py-1 rounded text-sm',
            isPlaying
              ? 'bg-emerald-500/20 text-emerald-500'
              : 'bg-zinc-800 text-zinc-400',
          ]"
        >
          {{ isPlaying ? "On" : "Off" }}
        </button>
      </div>

      <!-- Frequency -->
      <div>
        <label class="block text-sm text-zinc-400 mb-2">Frequency</label>
        <input
          type="range"
          v-model="frequency"
          min="20"
          max="2000"
          step="1"
          class="w-full"
        />
        <div class="text-xs text-zinc-500 mt-1">{{ frequency }} Hz</div>
      </div>

      <!-- Waveform -->
      <div>
        <label class="block text-sm text-zinc-400 mb-2">Waveform</label>
        <select
          v-model="waveform"
          class="w-full bg-zinc-800 text-zinc-300 rounded px-2 py-1"
        >
          <option value="sine">Sine</option>
          <option value="triangle">Triangle</option>
          <option value="sawtooth">Sawtooth</option>
          <option value="square">Square</option>
        </select>
      </div>
    </div>

    <!-- Debug Info -->
    <div
      class="mt-6 p-3 bg-zinc-800/50 rounded text-xs font-mono text-zinc-500"
    >
      <div>Status: {{ isPlaying ? "Playing" : "Stopped" }}</div>
      <div>Frequency: {{ frequency }}Hz</div>
      <div>Waveform: {{ waveform }}</div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted, watch } from "vue";
  import { BasicOscillator } from "../services/audio/BasicOscillator";

  // State
  const isPlaying = ref(false);
  const frequency = ref(440);
  const waveform = ref("sine");

  // Create oscillator instance
  const oscillator = new BasicOscillator();

  // Methods
  const toggleOscillator = async () => {
    if (!isPlaying.value) {
      await oscillator.start();
      isPlaying.value = true;
    } else {
      oscillator.stop();
      isPlaying.value = false;
    }
  };

  // Watch for parameter changes
  watch(frequency, (newFreq) => {
    oscillator.setFrequency(newFreq);
  });

  watch(waveform, (newType) => {
    oscillator.setWaveform(newType);
  });

  // Cleanup
  onUnmounted(() => {
    oscillator.dispose();
  });
</script>
