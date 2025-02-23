<template>
  <div class="grid grid-cols-2 gap-2">
    <!-- Random Gates -->
    <div class="uncertainty-group">
      <div class="text-[10px] font-medium text-zinc-400 mb-2">Random Gates</div>
      <div class="grid grid-cols-2 gap-1.5">
        <!-- Rate -->
        <div class="control-group">
          <Knob
            v-model="gates.rate"
            :min="0.1"
            :max="10"
            :step="0.1"
            class="w-6 h-6"
            @update:modelValue="updateUncertainty"
          />
          <div class="text-[8px] font-medium text-zinc-500">
            {{ gates.rate.toFixed(1) }}Hz
          </div>
          <label class="text-[8px] text-zinc-400">Rate</label>
        </div>

        <!-- Probability -->
        <div class="control-group">
          <Knob
            v-model="gates.probability"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-6 h-6"
            @update:modelValue="updateUncertainty"
          />
          <div class="text-[8px] font-medium text-zinc-500">
            {{ (gates.probability * 100).toFixed(0) }}%
          </div>
          <label class="text-[8px] text-zinc-400">Prob</label>
        </div>
      </div>
    </div>

    <!-- Random Voltages -->
    <div class="uncertainty-group">
      <div class="text-[10px] font-medium text-zinc-400 mb-2">
        Random Voltages
      </div>
      <div class="grid grid-cols-2 gap-1.5">
        <!-- Range -->
        <div class="control-group">
          <Knob
            v-model="voltages.range"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-6 h-6"
            @update:modelValue="updateUncertainty"
          />
          <div class="text-[8px] font-medium text-zinc-500">
            {{ (voltages.range * 100).toFixed(0) }}
          </div>
          <label class="text-[8px] text-zinc-400">Range</label>
        </div>

        <!-- Slew -->
        <div class="control-group">
          <Knob
            v-model="voltages.slew"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-6 h-6"
            @update:modelValue="updateUncertainty"
          />
          <div class="text-[8px] font-medium text-zinc-500">
            {{ (voltages.slew * 100).toFixed(0) }}
          </div>
          <label class="text-[8px] text-zinc-400">Slew</label>
        </div>
      </div>
    </div>

    <!-- Destinations -->
    <div class="uncertainty-group col-span-2">
      <div class="text-[10px] font-medium text-zinc-400 mb-2">Destinations</div>
      <div class="grid grid-cols-4 gap-1.5">
        <div v-for="n in 4" :key="n" class="control-group">
          <button
            class="w-4 h-4 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center"
            :class="{
              'bg-emerald-500/20 border-emerald-500/50': destinations[n - 1],
            }"
            @click="toggleDestination(n - 1)"
          >
            <div
              class="w-1.5 h-1.5 rounded-full"
              :class="{ 'bg-emerald-500': destinations[n - 1] }"
            ></div>
          </button>
          <label class="text-[8px] text-zinc-400">{{ n }}</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/audio-engine/AudioEngine.js";

  // Initialize uncertainty controls
  const gates = ref({
    rate: 1,
    probability: 0.5,
  });

  const voltages = ref({
    range: 0.5,
    slew: 0.2,
  });

  const destinations = ref(Array(4).fill(false));

  // Toggle destination
  const toggleDestination = (index) => {
    destinations.value[index] = !destinations.value[index];
    updateUncertainty();
  };

  // Update uncertainty parameters
  const updateUncertainty = () => {
    audioEngine.setUncertaintyControls({
      gates: {
        rate: gates.value.rate,
        probability: gates.value.probability,
      },
      voltages: {
        range: voltages.value.range,
        slew: voltages.value.slew,
      },
      destinations: destinations.value,
    });
  };

  // Watch for changes
  watch([gates, voltages], updateUncertainty, { deep: true });
</script>

<style scoped>
  .uncertainty-group {
    @apply bg-zinc-900/30 rounded-lg p-2;
  }

  .control-group {
    @apply flex flex-col items-center gap-0.5;
  }
</style>
