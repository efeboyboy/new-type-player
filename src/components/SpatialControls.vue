<template>
  <div class="grid grid-cols-2 gap-4">
    <div v-for="n in 4" :key="n" class="spatial-group">
      <div class="text-[10px] text-zinc-500 mb-2">{{ n }}</div>
      <div class="grid grid-cols-2 gap-2">
        <div class="control-group">
          <label class="text-[10px] text-zinc-400">Left/Right</label>
          <Knob
            v-model="positions[n - 1].x"
            :min="-1"
            :max="1"
            :step="0.01"
            class="w-8 h-8"
            @update:modelValue="updatePosition(n - 1)"
          />
        </div>
        <div class="control-group">
          <label class="text-[10px] text-zinc-400">Front/Back</label>
          <Knob
            v-model="positions[n - 1].y"
            :min="-1"
            :max="1"
            :step="0.01"
            class="w-8 h-8"
            @update:modelValue="updatePosition(n - 1)"
          />
        </div>
      </div>
      <div class="mt-2">
        <div class="control-group">
          <label class="text-[10px] text-zinc-400">Space</label>
          <Knob
            v-model="reverbs[n - 1]"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-8 h-8"
            @update:modelValue="updateReverb(n - 1)"
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

  const positions = ref(
    Array(4)
      .fill()
      .map(() => ({ x: 0, y: 0 }))
  );
  const reverbs = ref(Array(4).fill(0.2));

  const updatePosition = (index) => {
    const pos = positions.value[index];
    audioEngine.setSpatialPosition(index, pos.x, pos.y);
  };

  const updateReverb = (index) => {
    audioEngine.setSpatialReverb(index, 2, reverbs.value[index]);
  };
</script>

<style scoped>
  .control-group {
    @apply flex flex-col items-center gap-1;
  }

  .spatial-group {
    @apply bg-zinc-900/30 rounded-lg p-3;
  }
</style>
