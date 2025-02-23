<template>
  <div class="module-panel">
    <div class="grid grid-cols-2 gap-3">
      <!-- Master Envelope Controls -->
      <div class="flex flex-col gap-2">
        <div class="text-center">
          <div class="module-title">Shape</div>
        </div>

        <div class="flex flex-col gap-2">
          <!-- Rise Time -->
          <div class="control-group">
            <Knob
              v-model="masterEnvelope.rise"
              :min="0.001"
              :max="0.5"
              :step="0.001"
              class="w-10 h-10"
              @update:modelValue="updateMasterEnvelope"
            />
            <div class="module-value">
              {{ formatTime(masterEnvelope.rise) }}
            </div>
            <label class="module-label">Attack</label>
          </div>

          <!-- Fall Time -->
          <div class="control-group">
            <Knob
              v-model="masterEnvelope.fall"
              :min="0.01"
              :max="2"
              :step="0.01"
              class="w-10 h-10"
              @update:modelValue="updateMasterEnvelope"
            />
            <div class="module-value">
              {{ formatTime(masterEnvelope.fall) }}
            </div>
            <label class="module-label">Release</label>
          </div>

          <!-- Level -->
          <div class="control-group">
            <Knob
              v-model="masterEnvelope.level"
              :min="0.2"
              :max="1"
              :step="0.01"
              class="w-10 h-10"
              @update:modelValue="updateMasterEnvelope"
            />
            <div class="module-value">
              {{ formatPercent(masterEnvelope.level) }}
            </div>
            <label class="module-label">Amount</label>
          </div>
        </div>
      </div>

      <!-- Channel Mode Controls -->
      <div class="flex flex-col gap-2">
        <div class="text-center">
          <div class="module-title">Behavior</div>
        </div>

        <div class="flex flex-col gap-2">
          <!-- Loop Mode Toggles -->
          <div v-for="n in 4" :key="n" class="control-group">
            <button
              @click="toggleMode(n - 1)"
              :class="[
                'w-10 h-10 rounded-lg',
                loopModes[n - 1]
                  ? 'bg-emerald-500/30 border-emerald-500'
                  : 'bg-zinc-800 border-zinc-700',
                'border hover:bg-zinc-700 transition-colors flex items-center justify-center',
              ]"
            >
              <span class="text-xs">{{ loopModes[n - 1] ? "↻" : "→" }}</span>
            </button>
            <div class="module-value">{{ n }}</div>
            <label class="module-label">{{
              loopModes[n - 1] ? "Cycle" : "Once"
            }}</label>
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

  // Master envelope controls
  const masterEnvelope = ref({
    rise: 0.01,
    fall: 0.1,
    level: 0.8,
  });

  // Loop mode for each channel
  const loopModes = ref([false, false, false, false]);

  const formatTime = (time) => {
    if (time >= 1) return time.toFixed(1) + "s";
    return (time * 1000).toFixed(0) + "ms";
  };

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  // Update master envelope (affects all channels with their respective offsets)
  const updateMasterEnvelope = () => {
    audioEngine.setEnvelope(0, {
      rise: masterEnvelope.value.rise,
      fall: masterEnvelope.value.fall,
      level: masterEnvelope.value.level,
    });
  };

  // Toggle loop mode for a channel
  const toggleMode = (index) => {
    loopModes.value[index] = !loopModes.value[index];
    audioEngine.setEnvelopeLFO(
      index,
      loopModes.value[index],
      1 / (masterEnvelope.value.rise + masterEnvelope.value.fall)
    );
  };

  // Reset to defaults
  const reset = () => {
    masterEnvelope.value = {
      rise: 0.01,
      fall: 0.1,
      level: 0.8,
    };
    loopModes.value = [false, false, false, false];
    updateMasterEnvelope();
    loopModes.value.forEach((_, i) => {
      audioEngine.setEnvelopeLFO(i, false);
    });
  };

  // Randomize with musical constraints
  const randomize = () => {
    masterEnvelope.value = {
      rise: 0.01 + Math.random() * 0.49,
      fall: 0.01 + Math.random() * 0.49,
      level: 0.6 + Math.random() * 0.4,
    };
    loopModes.value = loopModes.value.map(() => Math.random() > 0.7);
    updateMasterEnvelope();
    loopModes.value.forEach((mode, i) => {
      audioEngine.setEnvelopeLFO(
        i,
        mode,
        1 / (masterEnvelope.value.rise + masterEnvelope.value.fall)
      );
    });
  };

  // Expose methods for parent component
  defineExpose({
    reset,
    randomize,
  });

  // Watch for changes and update audio engine
  watch(
    masterEnvelope,
    () => {
      updateMasterEnvelope();
    },
    { deep: true }
  );
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
