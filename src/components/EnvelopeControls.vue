<template>
  <div class="grid grid-cols-2 gap-4">
    <div v-for="n in 4" :key="n" class="envelope-group">
      <div class="text-[10px] text-zinc-500 mb-2">{{ n }}</div>
      <div class="grid grid-cols-3 gap-2">
        <div class="control-group">
          <label class="text-[10px] text-zinc-400">Start</label>
          <Knob
            v-model="envelopes[n - 1].attack"
            :min="0.01"
            :max="1"
            :step="0.01"
            class="w-8 h-8"
            @update:modelValue="updateEnvelope(n - 1)"
          />
        </div>
        <div class="control-group">
          <label class="text-[10px] text-zinc-400">Hold</label>
          <Knob
            v-model="envelopes[n - 1].sustain"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-8 h-8"
            @update:modelValue="updateEnvelope(n - 1)"
          />
        </div>
        <div class="control-group">
          <label class="text-[10px] text-zinc-400">End</label>
          <Knob
            v-model="envelopes[n - 1].release"
            :min="0.01"
            :max="1"
            :step="0.01"
            class="w-8 h-8"
            @update:modelValue="updateEnvelope(n - 1)"
          />
        </div>
      </div>
      <div class="flex items-center gap-2 mt-2">
        <label class="text-[10px] text-zinc-400">Loop</label>
        <button
          class="w-4 h-4 rounded bg-zinc-800 border border-zinc-700"
          :class="{
            'bg-emerald-500/20 border-emerald-500/50': envelopes[n - 1].loop,
          }"
          @click="toggleLoop(n - 1)"
        ></button>
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
        sustain: 0.5,
        release: 0.5,
        loop: false,
      }))
  );

  const updateEnvelope = (index) => {
    const env = envelopes.value[index];
    audioEngine.setEnvelope(index, {
      attack: env.attack,
      sustain: env.sustain,
      release: env.release,
    });
  };

  const toggleLoop = (index) => {
    envelopes.value[index].loop = !envelopes.value[index].loop;
    audioEngine.setEnvelopeLFO(index, envelopes.value[index].loop);
  };
</script>

<style scoped>
  .control-group {
    @apply flex flex-col items-center gap-1;
  }

  .envelope-group {
    @apply bg-zinc-900/30 rounded-lg p-3;
  }
</style>
