<template>
  <div class="w-full h-full grid grid-cols-2 gap-2">
    <!-- Front Mix -->
    <div class="module-panel">
      <div class="module-title">Front Mix</div>
      <div class="grid grid-cols-2 gap-1.5">
        <!-- Front Level -->
        <div class="control-group">
          <Knob
            v-model="frontMix.level"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-full aspect-square max-w-[24px]"
          />
          <div class="module-value">
            {{ (frontMix.level * 100).toFixed(0) }}
          </div>
          <label class="module-label">Level</label>
        </div>

        <!-- Front Pan -->
        <div class="control-group">
          <Knob
            v-model="frontMix.pan"
            :min="-1"
            :max="1"
            :step="0.01"
            class="w-full aspect-square max-w-[24px]"
          />
          <div class="module-value">{{ formatPan(frontMix.pan) }}</div>
          <label class="module-label">Pan</label>
        </div>
      </div>
    </div>

    <!-- Rear Mix -->
    <div class="module-panel">
      <div class="module-title">Rear Mix</div>
      <div class="grid grid-cols-2 gap-1.5">
        <!-- Rear Level -->
        <div class="control-group">
          <Knob
            v-model="rearMix.level"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-full aspect-square max-w-[24px]"
          />
          <div class="module-value">{{ (rearMix.level * 100).toFixed(0) }}</div>
          <label class="module-label">Level</label>
        </div>

        <!-- Rear Pan -->
        <div class="control-group">
          <Knob
            v-model="rearMix.pan"
            :min="-1"
            :max="1"
            :step="0.01"
            class="w-full aspect-square max-w-[24px]"
          />
          <div class="module-value">{{ formatPan(rearMix.pan) }}</div>
          <label class="module-label">Pan</label>
        </div>
      </div>
    </div>

    <!-- Reverb -->
    <div class="module-panel col-span-2">
      <div class="module-title">Space</div>
      <div class="grid grid-cols-2 gap-1.5">
        <!-- Decay -->
        <div class="control-group">
          <Knob
            v-model="reverb.decay"
            :min="0.1"
            :max="10"
            :step="0.1"
            class="w-full aspect-square max-w-[24px]"
          />
          <div class="module-value">{{ reverb.decay.toFixed(1) }}s</div>
          <label class="module-label">Decay</label>
        </div>

        <!-- Mix -->
        <div class="control-group">
          <Knob
            v-model="reverb.mix"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-full aspect-square max-w-[24px]"
          />
          <div class="module-value">{{ (reverb.mix * 100).toFixed(0) }}%</div>
          <label class="module-label">Mix</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

  // Add props for channel
  const props = defineProps({
    channel: {
      type: Number,
      default: 0, // Default to first channel
    },
  });

  // Initialize spatial controls
  const frontMix = ref({
    level: 0.7,
    pan: 0,
  });

  const rearMix = ref({
    level: 0.5,
    pan: 0,
  });

  const movement = ref({
    rate: 1,
    depth: 0.5,
    spread: 0.7,
    phase: 90,
  });

  // Add reverb controls
  const reverb = ref({
    decay: 2,
    mix: 0.2,
  });

  // Format pan value
  const formatPan = (pan) => {
    if (pan === 0) return "C";
    return pan < 0
      ? `L${Math.abs(pan * 100).toFixed(0)}`
      : `R${(pan * 100).toFixed(0)}`;
  };

  // Update spatial parameters
  const updateSpatial = () => {
    // Calculate front/back balance
    const frontAmount = frontMix.value.level;
    const rearAmount = rearMix.value.level;
    const totalAmount = frontAmount + rearAmount;

    // Normalize to get a -1 to 1 range for y-axis (front/back)
    const y = totalAmount > 0 ? (rearAmount - frontAmount) / totalAmount : 0;

    // Average the pan values, weighted by their levels
    const x =
      totalAmount > 0
        ? (frontMix.value.pan * frontAmount + rearMix.value.pan * rearAmount) /
          totalAmount
        : 0;

    // Update spatial position for all channels (since we're controlling the master position)
    for (let i = 0; i < 4; i++) {
      audioEngine.setSpatialPosition(i, x, y);
      audioEngine.setSpatialReverb(i, reverb.value.decay, reverb.value.mix);
    }
  };

  // Watch for changes
  watch([frontMix, rearMix, movement, reverb], updateSpatial, { deep: true });
</script>

<style scoped>
  .module-panel {
    @apply bg-zinc-900/30 rounded-lg p-2;
  }

  .module-title {
    @apply text-sm font-medium text-zinc-400 mb-2;
  }

  .control-group {
    @apply flex flex-col items-center gap-0.5;
  }

  .module-value {
    @apply text-sm font-medium text-zinc-500;
  }

  .module-label {
    @apply text-xs text-zinc-400;
  }
</style>
