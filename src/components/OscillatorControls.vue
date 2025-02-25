<template>
  <div class="flex gap-6">
    <!-- Fine Tune Control -->
    <div class="control-group">
      <Knob
        v-model="fineTune"
        :min="-12"
        :max="12"
        :step="1"
        class="w-10 h-10"
      />
      <div class="module-value">{{ formatPitch(fineTune) }}</div>
      <label class="module-label">Tune</label>
    </div>

    <!-- Octave Control -->
    <div class="control-group">
      <Knob v-model="octave" :min="-3" :max="3" :step="1" class="w-10 h-10" />
      <div class="module-value">{{ formatOctave(octave) }}</div>
      <label class="module-label">Oct</label>
    </div>

    <!-- Wave Morph Control -->
    <div class="control-group">
      <Knob
        v-model="waveform"
        :min="0"
        :max="1"
        :step="0.01"
        class="w-10 h-10"
      />
      <div class="module-value">{{ formatWaveform(waveform) }}</div>
      <label class="module-label">Wave</label>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch, onMounted } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

  const props = defineProps({
    number: {
      type: Number,
      required: true,
    },
  });

  // Default values
  const defaultValues = {
    fineTune: 0, // Semitones (-12 to +12)
    octave: 0, // Octaves (-3 to +3)
    waveform: 0.5, // Center position (pulse wave)
  };

  const fineTune = ref(defaultValues.fineTune);
  const octave = ref(defaultValues.octave);
  const waveform = ref(defaultValues.waveform);
  const isInitialized = ref(false);

  // Base frequency for A4 (440 Hz)
  const BASE_FREQ = 440;

  const calculateFrequency = (midiNote = 69) => {
    // Default to A4 (MIDI note 69)
    // Calculate total semitone offset
    const semitonesFromOctave = octave.value * 12;
    const totalSemitones = fineTune.value + semitonesFromOctave;

    // Calculate frequency using equal temperament formula
    // Base note is the MIDI note from sequencer or default A4 (69)
    return BASE_FREQ * Math.pow(2, (midiNote - 69 + totalSemitones) / 12);
  };

  const determineWaveform = (value) => {
    // Linear interpolation between waveforms
    if (value === 0) return "sawtooth";
    if (value === 0.5) return "pulse";
    if (value === 1) return "triangle";

    // Continuous morphing between waveforms
    if (value < 0.5) {
      return "sawtooth-to-pulse"; // For the audio engine to handle morphing
    } else {
      return "pulse-to-triangle"; // For the audio engine to handle morphing
    }
  };

  const updateOscillator = async (midiNote) => {
    if (!isInitialized.value) return;

    const frequency = calculateFrequency(midiNote);
    // console.log(
    //   `Oscillator ${props.number} - Frequency: ${frequency}Hz, Tune: ${fineTune.value}st, Oct: ${octave.value}`
    // );

    audioEngine.setOscillatorParams(props.number, {
      frequency,
      waveform: determineWaveform(waveform.value),
      waveShape: waveform.value,
    });
  };

  // Formatting functions
  const formatPitch = (p) => {
    return p > 0 ? `+${p}st` : `${p}st`;
  };

  const formatOctave = (o) => {
    return o > 0 ? `+${o}` : o.toString();
  };

  const formatWaveform = (value) => {
    if (value < 0.25) return "Saw";
    if (value < 0.75) return "Pulse";
    return "Tri";
  };

  // Method to update frequency from sequencer
  const setSequencerPitch = (midiNote) => {
    updateOscillator(midiNote);
  };

  // Initialize audio engine and oscillator
  onMounted(async () => {
    try {
      await audioEngine.initialize();
      isInitialized.value = true;
      // Initialize oscillator with default frequency (A4 = 440Hz)
      updateOscillator();
    } catch (error) {
      console.error("Failed to initialize audio engine:", error);
    }
  });

  // Update the exposed methods
  defineExpose({
    reset: () => {
      fineTune.value = defaultValues.fineTune;
      octave.value = defaultValues.octave;
      waveform.value = defaultValues.waveform;
      updateOscillator(); // Ensure the oscillator updates after reset
    },
    randomize: () => {
      fineTune.value = Math.floor(Math.random() * 25) - 12;
      octave.value = Math.floor(Math.random() * 7) - 3;
      waveform.value = Math.random();
      updateOscillator(); // Ensure the oscillator updates after randomization
    },
    setSequencerPitch,
  });

  // Watch for changes in any control with debounce
  let updateTimeout;
  watch([fineTune, octave, waveform], () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => updateOscillator(), 50); // 50ms debounce
  });
</script>

<style scoped>
  .control-group {
    @apply flex flex-col items-center gap-1;
  }

  .module-value {
    @apply text-[10px] font-mono text-zinc-500 text-center mt-0.5;
  }

  .module-label {
    @apply text-[11px] font-medium text-zinc-400 text-center;
  }
</style>
