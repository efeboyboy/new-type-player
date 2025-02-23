<template>
  <div class="knob-container" @pointerdown="startDrag">
    <!-- Indicator Dot -->
    <div
      class="knob-indicator"
      :style="{ transform: `rotate(${indicatorAngle}deg) translateY(-26px)` }"
    ></div>
    <!-- Display current value -->
    <div class="knob-value">
      {{ localValue }}
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch, defineProps, defineEmits } from "vue";

  // Define component props
  const props = defineProps({
    modelValue: {
      type: Number,
      required: true,
    },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    step: { type: Number, default: 1 },
  });

  // Define emits
  const emit = defineEmits(["update:modelValue"]);

  // Local state for the knob's value
  const localValue = ref(props.modelValue);

  // Watch for external changes
  watch(
    () => props.modelValue,
    (newVal) => {
      localValue.value = newVal;
    }
  );

  let startY = 0;
  let startValue = localValue.value;

  const startDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target && e.pointerId) {
      e.target.setPointerCapture(e.pointerId);
    }
    startY = e.clientY;
    startValue = localValue.value;
    window.addEventListener("pointermove", onDrag);
    window.addEventListener("pointerup", stopDrag);
  };

  const onDrag = (e) => {
    const sensitivity = 2; // changed sensitivity factor from 3 to 2 for increased responsiveness
    const dy = startY - e.clientY; // upward drag increases the value
    const delta = Math.round(dy / sensitivity) * props.step;
    let newValue = startValue + delta;
    if (newValue < props.min) newValue = props.min;
    if (newValue > props.max) newValue = props.max;
    localValue.value = newValue;
    console.log("Knob newValue:", newValue);
    emit("update:modelValue", newValue);
  };

  const stopDrag = () => {
    window.removeEventListener("pointermove", onDrag);
    window.removeEventListener("pointerup", stopDrag);
  };

  // Compute the indicator angle from the current value, mapping value range to an angle between -135 and 135 degrees
  const indicatorAngle = computed(() => {
    const range = props.max - props.min;
    const normalized = (localValue.value - props.min) / range;
    const angle = -135 + normalized * 270; // map to [-135, 135]
    return angle;
  });
</script>

<style scoped>
  .knob-container {
    position: relative;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid #666;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1),
      inset 0 -2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    user-select: none;
  }

  .knob-indicator {
    position: absolute;
    width: 0.75rem;
    height: 0.75rem;
    background: #3b82f6;
    border-radius: 50%;
    box-shadow: 0 0 4px rgba(59, 130, 246, 0.5);
    transform-origin: center center;
  }

  .knob-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: #333;
  }

  .knob-container:hover {
    border-color: #3b82f6;
  }
</style>
