<template>
  <div class="bg-gray-800 p-4 rounded-lg">
    <h3 class="text-lg font-semibold mb-4">Spatial Controls</h3>

    <div class="grid grid-cols-2 gap-4">
      <div v-for="n in 4" :key="n" class="spatial-group">
        <h4 class="text-sm font-medium mb-2">Channel {{ n }}</h4>

        <!-- Position Controls -->
        <div
          class="position-pad mb-3"
          @mousedown="startDrag(n - 1, $event)"
          @mousemove="handleDrag($event)"
          @mouseup="stopDrag"
          @mouseleave="stopDrag"
        >
          <div
            class="position-marker"
            :style="{
              left: `${(positions[n - 1].x + 1) * 50}%`,
              top: `${(positions[n - 1].y + 1) * 50}%`,
            }"
          ></div>
          <div class="position-grid">
            <div>FL</div>
            <div>FR</div>
            <div>RL</div>
            <div>RR</div>
          </div>
        </div>

        <!-- Reverb Controls -->
        <div class="grid grid-cols-2 gap-2">
          <div class="param-group">
            <label class="text-xs">Decay</label>
            <Knob
              v-model="reverbs[n - 1].decay"
              :min="0.1"
              :max="10"
              :step="0.1"
              class="w-8 h-8"
              @update:modelValue="updateReverb(n - 1)"
            />
          </div>
          <div class="param-group">
            <label class="text-xs">Mix</label>
            <Knob
              v-model="reverbs[n - 1].mix"
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
  const reverbs = ref(
    Array(4)
      .fill()
      .map(() => ({
        decay: 2,
        mix: 0.2,
      }))
  );

  const activeDrag = ref(null);

  const startDrag = (index, event) => {
    activeDrag.value = index;
    handleDrag(event);
  };

  const handleDrag = (event) => {
    if (activeDrag.value === null) return;

    const pad = event.currentTarget;
    const rect = pad.getBoundingClientRect();

    // Calculate normalized position (-1 to 1)
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    // Clamp values
    positions.value[activeDrag.value] = {
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
    };

    // Update audio engine
    const pos = positions.value[activeDrag.value];
    audioEngine.setSpatialPosition(activeDrag.value, pos.x, pos.y);
  };

  const stopDrag = () => {
    activeDrag.value = null;
  };

  const updateReverb = (index) => {
    const reverb = reverbs.value[index];
    audioEngine.setSpatialReverb(index, reverb.decay, reverb.mix);
  };
</script>

<style scoped>
  .param-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .spatial-group {
    background: rgba(0, 0, 0, 0.2);
    padding: 0.75rem;
    border-radius: 0.5rem;
  }

  .position-pad {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 0.5rem;
    cursor: crosshair;
    overflow: hidden;
  }

  .position-marker {
    position: absolute;
    width: 8px;
    height: 8px;
    background: var(--accent-color);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .position-grid {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    pointer-events: none;
    font-size: 0.6rem;
    opacity: 0.5;
  }

  .position-grid div {
    padding: 0.25rem;
  }
</style>
