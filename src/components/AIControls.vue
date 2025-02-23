<template>
  <div class="ai-controls p-4 bg-gray-800 rounded-lg">
    <h2 class="text-xl font-bold mb-4 text-white">AI Enhancement</h2>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-white mb-4">
      Initializing Magenta models...
    </div>

    <!-- Error State -->
    <div v-if="error" class="text-red-500 mb-4">
      {{ error }}
    </div>

    <!-- Controls -->
    <div v-if="isInitialized" class="space-y-4">
      <!-- Enhancement Controls -->
      <div class="flex flex-col space-y-2">
        <label class="text-white text-sm">Enhancement Amount</label>
        <input
          type="range"
          v-model="enhancementAmount"
          min="0"
          max="1"
          step="0.1"
          class="w-full"
        />
        <span class="text-gray-400 text-xs">
          {{ Math.round(enhancementAmount * 100) }}% AI influence
        </span>
      </div>

      <!-- Variation Controls -->
      <div class="flex flex-col space-y-2">
        <label class="text-white text-sm">Variation Temperature</label>
        <input
          type="range"
          v-model="temperature"
          min="0"
          max="1"
          step="0.1"
          class="w-full"
        />
        <span class="text-gray-400 text-xs">
          {{ Math.round(temperature * 100) }}% randomness
        </span>
      </div>

      <!-- Groove Controls -->
      <div class="flex flex-col space-y-2">
        <label class="text-white text-sm">Groove Intensity</label>
        <input
          type="range"
          v-model="grooveIntensity"
          min="0"
          max="1"
          step="0.1"
          class="w-full"
        />
        <span class="text-gray-400 text-xs">
          {{ Math.round(grooveIntensity * 100) }}% groove
        </span>
      </div>

      <!-- Generate Button -->
      <button
        @click="generateSequence"
        :disabled="isGenerating"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {{ isGenerating ? "Generating..." : "Generate AI Sequence" }}
      </button>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted } from "vue";
  import MagentaService from "../services/MagentaService.js";

  const magentaService = new MagentaService();

  // State
  const isInitialized = ref(false);
  const isLoading = ref(true);
  const isGenerating = ref(false);
  const error = ref(null);

  // Controls
  const enhancementAmount = ref(0.5);
  const temperature = ref(0.5);
  const grooveIntensity = ref(0.5);

  // Initialize Magenta
  onMounted(async () => {
    try {
      await magentaService.initialize();
      isInitialized.value = true;
    } catch (err) {
      error.value = "Failed to initialize AI models: " + err.message;
    } finally {
      isLoading.value = false;
    }
  });

  // Clean up
  onUnmounted(() => {
    magentaService.dispose();
  });

  // Generate sequence
  const generateSequence = async () => {
    if (!isInitialized.value) return;

    isGenerating.value = true;
    error.value = null;

    try {
      const result = await magentaService.generateFromText("Snow", {
        enhancementAmount: enhancementAmount.value,
        temperature: temperature.value,
        grooveIntensity: grooveIntensity.value,
      });

      // Emit the generated sequence
      emit("sequenceGenerated", result);
    } catch (err) {
      error.value = "Failed to generate sequence: " + err.message;
    } finally {
      isGenerating.value = false;
    }
  };

  // Define emits
  const emit = defineEmits(["sequenceGenerated"]);
</script>

<style scoped>
  .ai-controls input[type="range"] {
    @apply appearance-none h-2 bg-gray-700 rounded-lg;
  }

  .ai-controls input[type="range"]::-webkit-slider-thumb {
    @apply appearance-none w-4 h-4 bg-blue-500 rounded-full cursor-pointer;
  }

  .ai-controls input[type="range"]::-moz-range-thumb {
    @apply w-4 h-4 bg-blue-500 rounded-full cursor-pointer border-0;
  }
</style>
