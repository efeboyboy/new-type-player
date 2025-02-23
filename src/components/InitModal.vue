<!-- Sound Initialization Modal -->
<template>
  <div
    class="fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center p-4 sm:p-6 md:p-8"
  >
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black/50 backdrop-blur-lg transition-opacity duration-200"
      @click="$emit('close')"
    ></div>

    <!-- Modal Content -->
    <div
      class="relative w-full max-w-md bg-blue-900/95 backdrop-blur-xl rounded-xl border border-blue-800/50 shadow-2xl transform transition-all duration-200"
    >
      <!-- Content -->
      <div class="p-8 text-center">
        <h2 class="text-2xl font-semibold text-blue-100 mb-4">
          Initialize Sound Engine
        </h2>
        <p class="text-blue-200 text-sm mb-6">
          Click the button below to start the audio engine. This is required for
          browser security.
        </p>
        <button
          @click="handleInitialize"
          class="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          :class="{
            'opacity-50 cursor-not-allowed': isInitializing,
          }"
          :disabled="isInitializing"
        >
          <span v-if="isInitializing">Initializing...</span>
          <span v-else>Initialize</span>
        </button>
        <div v-if="error" class="mt-4 text-red-400 text-sm">
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref } from "vue";
  import { store } from "../store";

  const isInitializing = ref(false);
  const error = ref(null);
  const emit = defineEmits(["close"]);

  const handleInitialize = async () => {
    if (isInitializing.value) return;

    isInitializing.value = true;
    error.value = null;

    try {
      const success = await store.initializeAudio();
      if (success) {
        emit("close");
      } else {
        error.value = "Failed to initialize audio system. Please try again.";
      }
    } catch (err) {
      console.error("Failed to initialize audio:", err);
      error.value = "Failed to initialize audio system. Please try again.";
    } finally {
      isInitializing.value = false;
    }
  };
</script>

<style scoped>
  /* Ensure modal appears with a nice animation */
  .modal-enter-active,
  .modal-leave-active {
    @apply transition-all duration-200;
  }

  .modal-enter-from,
  .modal-leave-to {
    @apply opacity-0 scale-95;
  }

  .modal-enter-to,
  .modal-leave-from {
    @apply opacity-100 scale-100;
  }
</style>
