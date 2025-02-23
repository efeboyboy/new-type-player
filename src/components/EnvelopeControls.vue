<template>
  <div class="bg-gray-800 p-4 rounded-lg">
    <h3 class="text-lg font-semibold mb-4">Envelope Controls</h3>

    <div class="grid grid-cols-2 gap-4">
      <div v-for="n in 4" :key="n" class="envelope-group">
        <h4 class="text-sm font-medium mb-2">Envelope {{ n }}</h4>
        <div class="grid grid-cols-2 gap-2">
          <div class="param-group">
            <label class="text-xs">Attack</label>
            <Knob
              v-model="envelopes[n - 1].attack"
              :min="0"
              :max="1"
              :step="0.01"
              class="w-8 h-8"
              @update:modelValue="updateEnvelope(n - 1)"
            />
          </div>
          <div class="param-group">
            <label class="text-xs">Decay</label>
            <Knob
              v-model="envelopes[n - 1].decay"
              :min="0"
              :max="1"
              :step="0.01"
              class="w-8 h-8"
              @update:modelValue="updateEnvelope(n - 1)"
            />
          </div>
          <div class="param-group">
            <label class="text-xs">Sustain</label>
            <Knob
              v-model="envelopes[n - 1].sustain"
              :min="0"
              :max="1"
              :step="0.01"
              class="w-8 h-8"
              @update:modelValue="updateEnvelope(n - 1)"
            />
          </div>
          <div class="param-group">
            <label class="text-xs">Release</label>
            <Knob
              v-model="envelopes[n - 1].release"
              :min="0"
              :max="1"
              :step="0.01"
              class="w-8 h-8"
              @update:modelValue="updateEnvelope(n - 1)"
            />
          </div>
        </div>
        <div class="flex items-center justify-between mt-2">
          <label class="text-xs">Loop</label>
          <input
            type="checkbox"
            v-model="envelopes[n - 1].loop"
            @change="toggleLoop(n - 1)"
            class="accent-blue-500"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

  const envelopes = ref(
    Array(4)
      .fill()
      .map(() => ({
        attack: 0.01,
        decay: 0.2,
        sustain: 0.5,
        release: 0.5,
        loop: false,
      }))
  );

  const updateEnvelope = (index) => {
    const env = envelopes.value[index];
    audioEngine.setEnvelope(index, {
      attack: env.attack,
      decay: env.decay,
      sustain: env.sustain,
      release: env.release,
    });
  };

  const toggleLoop = (index) => {
    const env = envelopes.value[index];
    audioEngine.setEnvelopeLFO(index, env.loop);
  };
</script>

<style scoped>
  .param-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .envelope-group {
    background: rgba(0, 0, 0, 0.2);
    padding: 0.75rem;
    border-radius: 0.5rem;
  }
</style>
