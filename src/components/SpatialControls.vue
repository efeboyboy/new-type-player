<template>
  <div class="module-panel">
    <!-- Channel Controls in a more compact grid -->
    <div class="grid grid-cols-4 gap-3">
      <div v-for="n in 4" :key="n" class="flex flex-col gap-2">
        <div class="text-center">
          <div class="module-title">{{ n }}</div>
        </div>

        <!-- X-Y Position Control - Made slightly larger since it's the main control -->
        <div class="control-group">
          <div
            class="w-24 h-24 bg-zinc-900 rounded-lg relative cursor-pointer hover:bg-zinc-900/70 transition-colors"
            @mousedown="startDrag(n - 1)"
            @mousemove="handleDrag"
            @mouseup="stopDrag"
            @mouseleave="stopDrag"
            ref="xyPad"
          >
            <div
              :class="[
                'absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-transform',
                isAnimating[n - 1] ? 'bg-emerald-500' : 'bg-zinc-400',
              ]"
              :style="{
                left: `${(channels[n - 1].x + 1) * 50}%`,
                top: `${(channels[n - 1].y + 1) * 50}%`,
                transform: `translate(-50%, -50%) scale(${
                  isAnimating[n - 1] ? 1.2 : 1
                })`,
              }"
            ></div>
            <!-- Add grid lines for better visual reference -->
            <div
              class="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none"
            >
              <div class="border-r border-b border-zinc-800/30"></div>
              <div class="border-b border-zinc-800/30"></div>
              <div class="border-r border-zinc-800/30"></div>
              <div></div>
            </div>
          </div>
          <label class="module-label">Position</label>
        </div>

        <!-- Combined Space Control and Animation -->
        <div class="flex items-end gap-2">
          <div class="control-group flex-1">
            <Knob
              v-model="channels[n - 1].reverb"
              :min="0"
              :max="1"
              :step="0.01"
              class="w-12 h-12"
            />
            <div class="module-value">
              {{ formatPercent(channels[n - 1].reverb) }}
            </div>
            <label class="module-label">Space</label>
          </div>

          <button
            @click="toggleAnimation(n - 1)"
            :class="[
              isAnimating[n - 1]
                ? 'bg-emerald-500/20 text-emerald-500'
                : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800/70',
              'w-8 h-8 rounded transition-colors flex items-center justify-center self-center mb-4',
            ]"
          >
            <span class="text-lg">{{ isAnimating[n - 1] ? "↻" : "→" }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Global Reverb Controls - Made more compact -->
    <div class="mt-3 pt-3 border-t border-zinc-800">
      <div class="grid grid-cols-2 gap-3">
        <div class="control-group">
          <Knob
            v-model="reverbParams.decay"
            :min="0.1"
            :max="10"
            :step="0.1"
            class="w-12 h-12"
          />
          <div class="module-value">
            {{ formatTime(reverbParams.decay) }}
          </div>
          <label class="module-label">Length</label>
        </div>

        <div class="control-group">
          <Knob
            v-model="reverbParams.diffusion"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-12 h-12"
          />
          <div class="module-value">
            {{ formatPercent(reverbParams.diffusion) }}
          </div>
          <label class="module-label">Blend</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch, onMounted, onUnmounted } from "vue";
  import { RotateCcw, Shuffle } from "lucide-vue-next";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

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

  const reverbParams = ref({ ...defaultReverbParams });
  const isAnimating = ref([false, false, false, false]);
  const animationFrames = ref([null, null, null, null]);
  const draggedChannel = ref(null);
  const xyPad = ref(null);

  // Animation parameters
  const animationConfigs = [
    { type: "circle", speed: 0.5, radius: 0.8 },
    { type: "figure8", speed: 0.3, size: 0.7 },
    { type: "random", speed: 0.2, range: 0.6 },
    { type: "lissajous", speed: 0.4, complexity: 3 },
  ];

  const startDrag = (channelIndex) => {
    draggedChannel.value = channelIndex;
  };

  const handleDrag = (event) => {
    if (draggedChannel.value === null || !xyPad.value) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    channels.value[draggedChannel.value].x = Math.max(-1, Math.min(1, x));
    channels.value[draggedChannel.value].y = Math.max(-1, Math.min(1, y));

    updateSpatialPosition(draggedChannel.value);
  };

  const stopDrag = () => {
    draggedChannel.value = null;
  };

  const toggleAnimation = (channelIndex) => {
    isAnimating.value[channelIndex] = !isAnimating.value[channelIndex];
    if (isAnimating.value[channelIndex]) {
      startAnimation(channelIndex);
    } else {
      stopAnimation(channelIndex);
    }
  };

  const startAnimation = (channelIndex) => {
    const config = animationConfigs[channelIndex];
    let time = 0;

    const animate = () => {
      time += config.speed / 60;

      switch (config.type) {
        case "circle":
          channels.value[channelIndex].x = Math.cos(time) * config.radius;
          channels.value[channelIndex].y = Math.sin(time) * config.radius;
          break;
        case "figure8":
          channels.value[channelIndex].x = Math.cos(time) * config.size;
          channels.value[channelIndex].y =
            (Math.sin(time * 2) * config.size) / 2;
          break;
        case "random":
          if (time % 1 < 0.016) {
            // Update position every ~1 second
            channels.value[channelIndex].x =
              (Math.random() * 2 - 1) * config.range;
            channels.value[channelIndex].y =
              (Math.random() * 2 - 1) * config.range;
          }
          break;
        case "lissajous":
          channels.value[channelIndex].x =
            Math.sin(time * config.complexity) * 0.8;
          channels.value[channelIndex].y =
            Math.cos(time * (config.complexity + 1)) * 0.8;
          break;
      }

      updateSpatialPosition(channelIndex);
      animationFrames.value[channelIndex] = requestAnimationFrame(animate);
    };

    animate();
  };

  const stopAnimation = (channelIndex) => {
    if (animationFrames.value[channelIndex]) {
      cancelAnimationFrame(animationFrames.value[channelIndex]);
      animationFrames.value[channelIndex] = null;
    }
  };

  // Update spatial position with error handling
  const updateSpatialPosition = async (channelIndex) => {
    try {
      // Ensure audio engine is initialized
      if (!audioEngine.initialized) {
        await audioEngine.initialize();
      }

      const channel = channels.value[channelIndex];
      await audioEngine.setSpatialPosition(
        channelIndex,
        channel.x,
        channel.y,
        channel.reverb
      );
    } catch (error) {
      console.warn(
        `Error updating spatial position for channel ${channelIndex}:`,
        error
      );
    }
  };

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  const formatTime = (value) => {
    return `${value.toFixed(1)}s`;
  };

  // Clean up animations on component unmount
  onUnmounted(() => {
    try {
      animationFrames.value.forEach((frame, index) => {
        if (frame) stopAnimation(index);
      });
    } catch (error) {
      console.warn("Error cleaning up animations:", error);
    }
  });

  // Watch for changes and update audio engine with error handling
  watch(
    channels,
    async () => {
      try {
        for (const [index, channel] of channels.value.entries()) {
          await updateSpatialPosition(index);
        }
      } catch (error) {
        console.warn("Error in channels watcher:", error);
      }
    },
    { deep: true }
  );

  watch(
    reverbParams,
    async () => {
      try {
        // Ensure audio engine is initialized
        if (!audioEngine.initialized) {
          await audioEngine.initialize();
        }

        // Update reverb for each channel
        for (let i = 0; i < channels.value.length; i++) {
          await audioEngine.setSpatialReverb(
            i,
            reverbParams.value.decay,
            reverbParams.value.diffusion
          );
        }
      } catch (error) {
        console.warn("Error in reverb params watcher:", error);
      }
    },
    { deep: true }
  );

  // Expose methods for parent component with error handling
  defineExpose({
    reset: async () => {
      try {
        // Stop any ongoing animations first
        isAnimating.value.forEach((isActive, index) => {
          if (isActive) {
            stopAnimation(index);
          }
        });

        // Reset channel values
        channels.value = Array(4)
          .fill()
          .map(() => ({ ...defaultChannel }));
        reverbParams.value = { ...defaultReverbParams };

        // Ensure all animations are stopped
        isAnimating.value = isAnimating.value.map(() => false);

        // Update all channels
        for (let i = 0; i < channels.value.length; i++) {
          await updateSpatialPosition(i);
        }
      } catch (error) {
        console.warn("Error in reset:", error);
      }
    },
    randomize: async () => {
      try {
        // Stop any ongoing animations first
        isAnimating.value.forEach((isActive, index) => {
          if (isActive) {
            stopAnimation(index);
          }
        });

        // Create more intentional spatial patterns
        const patterns = [
          // Quad spread pattern
          {
            x: [-0.7, 0.7, -0.7, 0.7],
            y: [-0.7, -0.7, 0.7, 0.7],
            reverb: [0.2, 0.2, 0.3, 0.3],
          },
          // Circle pattern
          {
            x: [0.7, 0, -0.7, 0],
            y: [0, 0.7, 0, -0.7],
            reverb: [0.2, 0.25, 0.2, 0.25],
          },
          // Stereo spread pattern
          {
            x: [-0.8, 0.8, -0.4, 0.4],
            y: [0, 0, 0.6, 0.6],
            reverb: [0.15, 0.15, 0.3, 0.3],
          },
          // Random but balanced pattern
          {
            x: Array(4)
              .fill()
              .map(() => Math.random() * 1.4 - 0.7),
            y: Array(4)
              .fill()
              .map(() => Math.random() * 1.4 - 0.7),
            reverb: Array(4)
              .fill()
              .map(() => Math.random() * 0.2 + 0.1),
          },
        ];

        // Select a random pattern
        const selectedPattern =
          patterns[Math.floor(Math.random() * patterns.length)];

        // Apply the pattern
        channels.value = channels.value.map((_, index) => ({
          x: selectedPattern.x[index],
          y: selectedPattern.y[index],
          reverb: selectedPattern.reverb[index],
        }));

        // Set musical reverb parameters
        const reverbPresets = [
          { decay: 1.5, diffusion: 0.6 }, // Room
          { decay: 2.8, diffusion: 0.7 }, // Hall
          { decay: 4.0, diffusion: 0.8 }, // Cathedral
          { decay: 0.8, diffusion: 0.4 }, // Studio
        ];

        const selectedReverb =
          reverbPresets[Math.floor(Math.random() * reverbPresets.length)];
        reverbParams.value = selectedReverb;

        // Update all channels
        for (let i = 0; i < channels.value.length; i++) {
          await updateSpatialPosition(i);
        }

        // Randomly start some animations
        if (Math.random() > 0.5) {
          const animCount = Math.floor(Math.random() * 3) + 1; // Start 1-3 animations
          const availableChannels = [0, 1, 2, 3];
          for (let i = 0; i < animCount; i++) {
            const channelIndex = availableChannels.splice(
              Math.floor(Math.random() * availableChannels.length),
              1
            )[0];
            if (!isAnimating.value[channelIndex]) {
              toggleAnimation(channelIndex);
            }
          }
        }
      } catch (error) {
        console.warn("Error in randomize:", error);
      }
    },
  });
</script>

<style scoped>
  .module-panel {
    @apply bg-zinc-900/30 rounded-lg p-4;
  }

  .control-group {
    @apply flex flex-col items-center gap-1;
  }

  .module-value {
    @apply text-[10px] font-mono text-zinc-500 text-center mt-1;
  }

  .module-label {
    @apply text-[11px] font-medium text-zinc-400 text-center;
  }

  .module-title {
    @apply text-sm font-medium text-zinc-300;
  }
</style>
