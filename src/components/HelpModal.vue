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
      class="relative w-full max-w-2xl bg-zinc-900/95 backdrop-blur-xl rounded-xl border border-zinc-800/50 shadow-2xl transform transition-all duration-200"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-6 border-b border-zinc-800/50"
      >
        <h2 class="text-xl font-semibold text-zinc-100">
          How to Use Type Player
        </h2>
        <button
          @click="$emit('close')"
          class="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-emerald-400 transition-all duration-200 border border-zinc-700/50 hover:border-emerald-500/50"
        >
          <X class="w-4 h-4" stroke-width="1.5" />
        </button>
      </div>

      <!-- Scrollable Content -->
      <div class="p-6 max-h-[calc(90vh-8rem)] overflow-y-auto">
        <div class="space-y-6 text-zinc-300">
          <section>
            <h3 class="text-lg font-medium text-emerald-400 mb-2">Overview</h3>
            <p class="text-sm leading-relaxed">
              Type Player is an experimental text-to-music synthesizer inspired
              by the Buchla modular synthesizer. It transforms your text input
              into musical sequences using a unique mapping algorithm.
            </p>
          </section>

          <section>
            <h3 class="text-lg font-medium text-emerald-400 mb-2">
              Getting Started
            </h3>
            <ol class="text-sm space-y-2 list-decimal list-inside">
              <li>Type any text in the input field at the top</li>
              <li>
                The text will automatically generate a unique musical sequence
              </li>
              <li>Use the Speed knob to adjust the tempo</li>
              <li>Experiment with different modules to shape the sound</li>
            </ol>
          </section>

          <section>
            <h3 class="text-lg font-medium text-emerald-400 mb-2">
              Module Controls
            </h3>
            <div class="text-sm space-y-2">
              <p class="font-medium text-zinc-200">Knob Controls:</p>
              <ul class="list-disc list-inside pl-4 space-y-1">
                <li>Drag vertically: Move mouse up/down while holding</li>
                <li>Mouse wheel: Scroll to fine-tune values</li>
                <li>Double-click: Reset to default value</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 class="text-lg font-medium text-emerald-400 mb-2">
              Module Overview
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p class="font-medium text-zinc-200 mb-1">Sound Sources</p>
                <p class="text-zinc-400">
                  Three oscillators and a noise generator for creating rich
                  timbres.
                </p>
              </div>
              <div>
                <p class="font-medium text-zinc-200 mb-1">Shape Controls</p>
                <p class="text-zinc-400">
                  Envelope generators to sculpt the sound's amplitude over time.
                </p>
              </div>
              <div>
                <p class="font-medium text-zinc-200 mb-1">Routing</p>
                <p class="text-zinc-400">
                  Matrix mixer for complex signal routing between modules.
                </p>
              </div>
              <div>
                <p class="font-medium text-zinc-200 mb-1">Gate Controls</p>
                <p class="text-zinc-400">
                  Low Pass Gates for voltage-controlled dynamics and filtering.
                </p>
              </div>
              <div>
                <p class="font-medium text-zinc-200 mb-1">Tone Controls</p>
                <p class="text-zinc-400">
                  Filters and frequency shifters for spectral shaping.
                </p>
              </div>
              <div>
                <p class="font-medium text-zinc-200 mb-1">Space Controls</p>
                <p class="text-zinc-400">
                  Spatial processing for creating depth and movement.
                </p>
              </div>
            </div>
          </section>

          <div class="pt-4 border-t border-zinc-800/50">
            <p class="text-xs text-zinc-500">
              Tip: This is an experimental instrument - there are no wrong ways
              to use it. Feel free to explore and create unexpected sounds!
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { X } from "lucide-vue-next";
  import { onMounted, onUnmounted } from "vue";

  defineEmits(["close"]);

  // Prevent body scroll when modal is open
  onMounted(() => {
    document.body.style.overflow = "hidden";
  });

  onUnmounted(() => {
    document.body.style.overflow = "";
  });
</script>

<style scoped>
  .list-decimal {
    list-style-type: decimal;
  }

  .list-disc {
    list-style-type: disc;
  }

  /* Custom scrollbar for the modal */
  ::-webkit-scrollbar {
    @apply w-1.5;
  }

  ::-webkit-scrollbar-track {
    @apply bg-zinc-800/20 rounded-full;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-emerald-500/20 rounded-full hover:bg-emerald-500/30 transition-colors duration-200;
  }

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

  /* Ensure modal and backdrop are above everything */
  :deep(.modal-backdrop) {
    z-index: 9998;
  }

  :deep(.modal-content) {
    z-index: 9999;
  }
</style>
