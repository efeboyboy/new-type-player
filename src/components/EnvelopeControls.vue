<template>
  <div class="flex flex-col gap-2">
    <!-- ADSR Controls -->
    <div class="grid grid-cols-2 gap-2">
      <!-- Attack -->
      <div class="control-group">
        <Knob
          v-model="envelope.attack"
          :min="0"
          :max="1"
          :step="0.01"
          class="w-8 h-8"
          @update:modelValue="updateEnvelope"
        />
        <div class="text-[10px] font-medium text-zinc-500">
          {{ envelope.attack.toFixed(2) }}
        </div>
        <label class="text-[8px] text-zinc-400">Attack</label>
      </div>

      <!-- Decay -->
      <div class="control-group">
        <Knob
          v-model="envelope.decay"
          :min="0"
          :max="1"
          :step="0.01"
          class="w-8 h-8"
          @update:modelValue="updateEnvelope"
        />
        <div class="text-[10px] font-medium text-zinc-500">
          {{ envelope.decay.toFixed(2) }}
        </div>
        <label class="text-[8px] text-zinc-400">Decay</label>
      </div>

      <!-- Sustain -->
      <div class="control-group">
        <Knob
          v-model="envelope.sustain"
          :min="0"
          :max="1"
          :step="0.01"
          class="w-8 h-8"
          @update:modelValue="updateEnvelope"
        />
        <div class="text-[10px] font-medium text-zinc-500">
          {{ envelope.sustain.toFixed(2) }}
        </div>
        <label class="text-[8px] text-zinc-400">Sustain</label>
      </div>

      <!-- Release -->
      <div class="control-group">
        <Knob
          v-model="envelope.release"
          :min="0"
          :max="1"
          :step="0.01"
          class="w-8 h-8"
          @update:modelValue="updateEnvelope"
        />
        <div class="text-[10px] font-medium text-zinc-500">
          {{ envelope.release.toFixed(2) }}
        </div>
        <label class="text-[8px] text-zinc-400">Release</label>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

  // Initialize envelope with default values
  const envelope = ref({
    attack: 0.01,
    decay: 0.2,
    sustain: 0.5,
    release: 0.5,
    loop: false,
  });

  // Update envelope parameters in the audio engine
  const updateEnvelope = () => {
    // Update all channels with the same envelope for now
    for (let i = 0; i < 4; i++) {
      audioEngine.setEnvelope(i, {
        attack: envelope.value.attack,
        decay: envelope.value.decay,
        sustain: envelope.value.sustain,
        release: envelope.value.release,
      });
    }
  };

  // Watch for changes to update the audio engine
  watch(envelope.value, updateEnvelope, { deep: true });

  const toggleLoop = (index) => {
    envelope.value.loop = !envelope.value.loop;
    audioEngine.setEnvelopeLFO(index, envelope.value.loop);
  };
</script>

<style scoped>
  .control-group {
    @apply flex flex-col items-center gap-0.5;
  }

  .envelope-group {
    @apply bg-zinc-900/30 rounded-lg p-2;
  }
</style>
