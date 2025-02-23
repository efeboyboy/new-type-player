<template>
  <div class="bg-gray-800 p-4 rounded-lg">
    <h3 class="text-lg font-semibold mb-4">Low Pass Gates</h3>

    <div class="grid grid-cols-2 gap-4">
      <div v-for="n in 4" :key="n" class="lpg-group">
        <h4 class="text-sm font-medium mb-2">LPG {{ n }}</h4>
        <div class="grid grid-cols-2 gap-2">
          <div class="param-group">
            <label class="text-xs">Response</label>
            <Knob
              v-model="lpgs[n - 1].response"
              :min="0.1"
              :max="2"
              :step="0.01"
              class="w-8 h-8"
              @update:modelValue="updateLPG(n - 1)"
            />
          </div>
          <div class="param-group">
            <label class="text-xs">Offset</label>
            <Knob
              v-model="lpgs[n - 1].offset"
              :min="0"
              :max="1"
              :step="0.01"
              class="w-8 h-8"
              @update:modelValue="updateLPG(n - 1)"
            />
          </div>
          <div class="param-group">
            <label class="text-xs">Resonance</label>
            <Knob
              v-model="lpgs[n - 1].resonance"
              :min="0"
              :max="5"
              :step="0.1"
              class="w-8 h-8"
              @update:modelValue="updateLPG(n - 1)"
            />
          </div>
          <div class="param-group">
            <label class="text-xs">VCA/VCF</label>
            <Knob
              v-model="lpgs[n - 1].balance"
              :min="0"
              :max="1"
              :step="0.01"
              class="w-8 h-8"
              @update:modelValue="updateLPG(n - 1)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

  const lpgs = ref(
    Array(4)
      .fill()
      .map(() => ({
        response: 0.5,
        offset: 0.2,
        resonance: 1,
        balance: 0.5,
      }))
  );

  const updateLPG = (index) => {
    const lpg = lpgs.value[index];
    audioEngine.setEnvelope(index, {
      timeScale: lpg.response,
      offset: lpg.offset,
      scale: lpg.balance,
    });

    // Update filter parameters
    audioEngine.lpgs[index].filter.Q.value = lpg.resonance;
  };
</script>

<style scoped>
  .param-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .lpg-group {
    background: rgba(0, 0, 0, 0.2);
    padding: 0.75rem;
    border-radius: 0.5rem;
  }
</style>
