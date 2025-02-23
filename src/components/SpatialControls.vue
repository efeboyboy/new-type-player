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
            @update:modelValue="updateSpatial"
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
            @update:modelValue="updateSpatial"
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
            @update:modelValue="updateSpatial"
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
            @update:modelValue="updateSpatial"
          />
          <div class="module-value">{{ formatPan(rearMix.pan) }}</div>
          <label class="module-label">Pan</label>
        </div>
      </div>
    </div>

    <!-- Spatial Movement -->
    <div class="module-panel col-span-2">
      <div class="module-title">Movement</div>
      <div class="grid grid-cols-4 gap-1.5">
        <!-- Rate -->
        <div class="control-group">
          <Knob
            v-model="movement.rate"
            :min="0.1"
            :max="10"
            :step="0.1"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="updateSpatial"
          />
          <div class="module-value">{{ movement.rate.toFixed(1) }}Hz</div>
          <label class="module-label">Rate</label>
        </div>

        <!-- Depth -->
        <div class="control-group">
          <Knob
            v-model="movement.depth"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="updateSpatial"
          />
          <div class="module-value">
            {{ (movement.depth * 100).toFixed(0) }}
          </div>
          <label class="module-label">Depth</label>
        </div>

        <!-- Spread -->
        <div class="control-group">
          <Knob
            v-model="movement.spread"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="updateSpatial"
          />
          <div class="module-value">
            {{ (movement.spread * 100).toFixed(0) }}
          </div>
          <label class="module-label">Spread</label>
        </div>

        <!-- Phase -->
        <div class="control-group">
          <Knob
            v-model="movement.phase"
            :min="0"
            :max="360"
            :step="1"
            class="w-full aspect-square max-w-[24px]"
            @update:modelValue="updateSpatial"
          />
          <div class="module-value">{{ movement.phase }}°</div>
          <label class="module-label">Phase</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import Knob from "./Knob.vue";
  import audioEngine from "../services/AudioEngine.js";

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

  // Format pan value
  const formatPan = (pan) => {
    if (pan === 0) return "C";
    return pan < 0
      ? `L${Math.abs(pan * 100).toFixed(0)}`
      : `R${(pan * 100).toFixed(0)}`;
  };

  // Update spatial parameters
  const updateSpatial = () => {
    audioEngine.setSpatialControls({
      front: {
        level: frontMix.value.level,
        pan: frontMix.value.pan,
      },
      rear: {
        level: rearMix.value.level,
        pan: rearMix.value.pan,
      },
      movement: {
        rate: movement.value.rate,
        depth: movement.value.depth,
        spread: movement.value.spread,
        phase: movement.value.phase,
      },
    });
  };

  // Watch for changes
  watch([frontMix, rearMix, movement], updateSpatial, { deep: true });
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
