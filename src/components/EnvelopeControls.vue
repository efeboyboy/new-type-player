<template>
  <div class="flex flex-col gap-4" v-if="mode === 'shape'">
    <!-- Shape Controls -->
    <div class="flex gap-6">
      <!-- Attack -->
      <div class="control-group">
        <Knob
          v-model="attack"
          :min="10"
          :max="1000"
          :step="1"
          class="w-10 h-10"
        />
        <div class="module-value">{{ formatTime(attack) }}</div>
        <label class="module-label">Attack</label>
      </div>

      <!-- Release -->
      <div class="control-group">
        <Knob
          v-model="release"
          :min="10"
          :max="2000"
          :step="1"
          class="w-10 h-10"
        />
        <div class="module-value">{{ formatTime(release) }}</div>
        <label class="module-label">Release</label>
      </div>

      <!-- Amount -->
      <div class="control-group">
        <Knob
          v-model="amount"
          :min="0"
          :max="1"
          :step="0.01"
          class="w-10 h-10"
        />
        <div class="module-value">{{ formatPercent(amount) }}</div>
        <label class="module-label">Amount</label>
      </div>
    </div>
  </div>

  <div class="flex flex-col gap-4" v-else>
    <!-- Behavior Controls -->
    <div class="flex gap-6">
      <!-- Cycle Buttons -->
      <div v-for="n in 4" :key="n" class="control-group">
        <button
          class="w-10 h-10 rounded bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center border border-zinc-700/50"
          :class="{ 'border-emerald-500/50': cycleStates[n - 1] }"
          @click="toggleCycle(n - 1)"
        >
          <IconHolder
            class="w-4 h-4"
            :class="{ 'text-emerald-400': cycleStates[n - 1] }"
          >
            <RotateCcw v-if="cycleStates[n - 1]" />
            <ArrowRight v-else />
          </IconHolder>
        </button>
        <div class="module-value">{{ n }}</div>
        <label class="module-label">{{
          cycleStates[n - 1] ? "Cycle" : "Once"
        }}</label>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import { RotateCcw, ArrowRight } from "lucide-vue-next";
  import Knob from "./Knob.vue";
  import IconHolder from "./IconHolder.vue";
  import audioEngine from "../services/AudioEngine.js";

  const props = defineProps({
    mode: {
      type: String,
      required: true,
      validator: (value) => ["shape", "behavior"].includes(value),
    },
  });

  // Shape controls
  const attack = ref(120);
  const release = ref(461);
  const amount = ref(0.89);

  // Behavior controls
  const cycleStates = ref([true, false, false, false]);

  const toggleCycle = (index) => {
    cycleStates.value[index] = !cycleStates.value[index];
    updateBehavior();
  };

  const formatTime = (ms) => {
    return `${ms}ms`;
  };

  const formatPercent = (value) => {
    return `${Math.round(value * 100)}%`;
  };

  const updateShape = () => {
    audioEngine.setEnvelopeShape({
      attack: attack.value,
      release: release.value,
      amount: amount.value,
    });
  };

  const updateBehavior = () => {
    audioEngine.setEnvelopeBehavior(cycleStates.value);
  };

  // Reset function
  const reset = () => {
    attack.value = 120;
    release.value = 461;
    amount.value = 0.89;
    cycleStates.value = [true, false, false, false];
    updateShape();
    updateBehavior();
  };

  // Randomize function
  const randomize = () => {
    attack.value = 10 + Math.random() * 990;
    release.value = 10 + Math.random() * 1990;
    amount.value = Math.random();
    cycleStates.value = cycleStates.value.map(() => Math.random() > 0.5);
    updateShape();
    updateBehavior();
  };

  watch([attack, release, amount], updateShape);

  defineExpose({
    reset,
    randomize,
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
