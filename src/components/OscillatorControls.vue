<template>
  <div class="oscillator-controls bg-gray-800 p-4 rounded-lg">
    <h3 class="text-lg font-semibold mb-4">Oscillator {{ number }}</h3>

    <!-- Frequency Control -->
    <div class="control-group mb-4">
      <label class="text-sm">Frequency</label>
      <Knob v-model="frequency" :min="20" :max="2000" :step="1" class="mt-2" />
      <div class="text-sm mt-1">{{ frequency }}Hz</div>
    </div>

    <!-- Wave Shape Control -->
    <div class="control-group mb-4">
      <label class="text-sm">Wave Shape</label>
      <Knob v-model="waveShape" :min="0" :max="1" :step="0.01" class="mt-2" />
    </div>

    <!-- Wave Type Selector -->
    <div class="control-group mb-4">
      <label class="text-sm block mb-2">Wave Type</label>
      <select
        v-model="waveType"
        class="bg-gray-700 text-white rounded p-1 w-full"
      >
        <option value="sine">Sine</option>
        <option value="triangle">Triangle</option>
        <option value="square">Square</option>
        <option value="sawtooth">Sawtooth</option>
      </select>
    </div>

    <!-- Frequency Modulation Amount -->
    <div class="control-group mb-4">
      <label class="text-sm">FM Amount</label>
      <Knob v-model="fmAmount" :min="0" :max="1" :step="0.01" class="mt-2" />
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

  const props = defineProps({
    number: {
      type: Number,
      required: true,
      validator: (value) => value >= 1 && value <= 3,
    },
  });

  const frequency = ref(440);
  const waveShape = ref(0);
  const waveType = ref("sine");
  const fmAmount = ref(0);

  // Watch for changes and update the audio engine
  watch(
    [frequency, waveShape, waveType, fmAmount],
    ([newFreq, newShape, newType, newFM]) => {
      const oscNumber = props.number;

      // Update oscillator parameters
      audioEngine.setOscillatorParams(oscNumber, {
        frequency: newFreq,
        waveShape: newShape,
        waveType: newType,
        fmAmount: newFM,
      });
    }
  );
</script>

<style scoped>
  .oscillator-controls {
    width: 200px;
    color: white;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>
