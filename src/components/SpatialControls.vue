<template>
  <div class="module-panel">
    <div class="grid grid-cols-4 gap-4">
      <!-- Channel Controls -->
      <div v-for="n in 4" :key="n" class="flex flex-col items-center gap-4">
        <div class="text-center">
          <div class="module-label">Channel {{ n }}</div>
        </div>

        <!-- XY Pad -->
        <div
          class="xy-pad relative bg-zinc-800/50 rounded-lg w-full aspect-square"
          @mousedown="startDrag($event, n - 1)"
          @touchstart="startDrag($event, n - 1)"
        >
          <!-- Grid Lines -->
          <div
            class="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none"
          >
            <div class="border-r border-b border-zinc-700/30"></div>
            <div class="border-l border-b border-zinc-700/30"></div>
            <div class="border-r border-t border-zinc-700/30"></div>
            <div class="border-l border-t border-zinc-700/30"></div>
          </div>

          <!-- Position Indicator -->
          <div
            class="absolute w-3 h-3 bg-emerald-500/50 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            :style="{
              left: (channels[n - 1].x + 1) * 50 + '%',
              top: (channels[n - 1].y + 1) * 50 + '%',
            }"
          ></div>

          <!-- Labels -->
          <div
            class="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div class="text-[10px] font-medium text-zinc-500">
              {{ formatPan(channels[n - 1].x) }} /
              {{ formatPan(channels[n - 1].y) }}
            </div>
          </div>
        </div>

        <!-- Reverb Send -->
        <div class="control-group">
          <Knob
            v-model="channels[n - 1].reverb"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-10 h-10"
          />
          <div class="module-value">
            {{ formatPercent(channels[n - 1].reverb) }}
          </div>
          <label class="module-label">Reverb</label>
        </div>
      </div>
    </div>

    <!-- Global Reverb Controls -->
    <div class="mt-4 pt-4 border-t border-zinc-800">
      <div class="grid grid-cols-2 gap-4">
        <div class="control-group">
          <Knob
            v-model="reverbParams.decay"
            :min="0.1"
            :max="10"
            :step="0.1"
            class="w-10 h-10"
          />
          <div class="module-value">
            {{ formatTime(reverbParams.decay) }}
          </div>
          <label class="module-label">Decay</label>
        </div>

        <div class="control-group">
          <Knob
            v-model="reverbParams.diffusion"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-10 h-10"
          />
          <div class="module-value">
            {{ formatPercent(reverbParams.diffusion) }}
          </div>
          <label class="module-label">Diffusion</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import { RotateCcw, Shuffle } from "lucide-vue-next";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/audio-engine/AudioEngine.js";
  import { store } from "../store.js";

  // Default values
  const defaultChannel = {
    x: 0,
    y: 0,
    reverb: 0.2,
  };

  const defaultReverbParams = {
    decay: 2.0,
    diffusion: 0.7,
  };

  // Initialize channels with default values
  const channels = ref(
    Array(4)
      .fill()
      .map(() => ({ ...defaultChannel }))
  );

  // Initialize reverb parameters
  const reverbParams = ref({ ...defaultReverbParams });

  // XY Pad drag handling
  let activeChannel = -1;
  let isDragging = false;

  const startDrag = (event, channelIndex) => {
    event.preventDefault();
    isDragging = true;
    activeChannel = channelIndex;

    const handler = event.touches ? handleTouchMove : handleMouseMove;
    const endHandler = event.touches ? handleTouchEnd : handleMouseEnd;

    document.addEventListener("mousemove", handler);
    document.addEventListener("mouseup", endHandler);
    document.addEventListener("touchmove", handler);
    document.addEventListener("touchend", endHandler);

    updatePosition(event);
  };

  const handleMouseMove = (event) => {
    if (!isDragging) return;
    updatePosition(event);
  };

  const handleTouchMove = (event) => {
    if (!isDragging) return;
    updatePosition(event.touches[0]);
  };

  const handleMouseEnd = () => {
    isDragging = false;
    activeChannel = -1;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseEnd);
  };

  const handleTouchEnd = () => {
    isDragging = false;
    activeChannel = -1;
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", handleTouchEnd);
  };

  const updatePosition = (event) => {
    if (activeChannel === -1) return;

    const pad = event.target.closest(".xy-pad");
    if (!pad) return;

    const rect = pad.getBoundingClientRect();
    const clientX = event.clientX || event.touches?.[0].clientX;
    const clientY = event.clientY || event.touches?.[0].clientY;

    const x = Math.max(
      -1,
      Math.min(1, ((clientX - rect.left) / rect.width) * 2 - 1)
    );
    const y = Math.max(
      -1,
      Math.min(1, ((clientY - rect.top) / rect.height) * 2 - 1)
    );

    channels.value[activeChannel].x = x;
    channels.value[activeChannel].y = y;

    updateChannel(activeChannel);
  };

  // Format values for display
  const formatPan = (value) => {
    if (Math.abs(value) < 0.05) return "C";
    return value > 0
      ? "R" + (value * 100).toFixed(0)
      : "L" + (Math.abs(value) * 100).toFixed(0);
  };

  const formatPercent = (value) => (value * 100).toFixed(0) + "%";
  const formatTime = (value) => value.toFixed(1) + "s";

  // Update spatial position and reverb for a channel
  const updateChannel = (index) => {
    if (!store.audioInitialized) return;

    const channel = channels.value[index];
    audioEngine.setSpatialPosition(index, channel.x, channel.y);
    audioEngine.setSpatialReverb(
      index,
      reverbParams.value.decay,
      channel.reverb
    );
  };

  // Reset to defaults
  const reset = () => {
    if (!store.audioInitialized) return;

    channels.value = channels.value.map(() => ({ ...defaultChannel }));
    reverbParams.value = { ...defaultReverbParams };
    channels.value.forEach((_, index) => updateChannel(index));
  };

  // Randomize all parameters
  const randomize = () => {
    if (!store.audioInitialized) return;

    channels.value = channels.value.map(() => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      reverb: Math.random(),
    }));

    reverbParams.value = {
      decay: Math.random() * 9.9 + 0.1,
      diffusion: Math.random(),
    };

    channels.value.forEach((_, index) => updateChannel(index));
  };

  // Expose methods for parent component
  defineExpose({
    reset,
    randomize,
  });

  // Watch for changes in parameters
  watch(
    [channels, reverbParams],
    () => {
      channels.value.forEach((_, index) => updateChannel(index));
    },
    { deep: true }
  );
</script>

<style scoped>
  .module-panel {
    @apply bg-zinc-900/30 rounded-lg p-6;
  }

  .module-value {
    @apply text-[10px] font-medium text-zinc-500 text-center mt-0.5;
  }

  .module-label {
    @apply text-[10px] font-medium text-zinc-400 text-center;
  }

  .control-group {
    @apply flex flex-col items-center gap-1;
  }

  .xy-pad {
    @apply cursor-pointer select-none border border-zinc-800;
    touch-action: none;
    min-height: 80px;
  }

  .xy-pad:hover {
    @apply bg-zinc-800/70 border-zinc-700;
  }

  .xy-pad:active {
    @apply bg-zinc-800/90 border-emerald-500/30;
  }
</style>
