<template>
  <div
    class="knob"
    @mousedown="startDrag"
    @touchstart="startDrag"
    @dblclick="reset"
  >
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 32 32"
      class="transform transition-transform"
      :style="{ transform: `rotate(${rotation}deg)` }"
    >
      <!-- Background -->
      <circle
        cx="16"
        cy="16"
        r="14"
        class="fill-zinc-900 stroke-zinc-800"
        stroke-width="1"
      />

      <!-- Value Track -->
      <circle
        cx="16"
        cy="16"
        r="12"
        class="fill-none stroke-emerald-500/20"
        stroke-width="1.5"
        :stroke-dasharray="arcLength"
        :stroke-dashoffset="arcOffset"
        transform="rotate(-90 16 16)"
      />

      <!-- Indicator -->
      <circle cx="16" cy="4" r="1.5" class="fill-emerald-500" />
    </svg>
  </div>
</template>

<script setup>
  import { ref, computed } from "vue";

  const props = defineProps({
    modelValue: {
      type: Number,
      required: true,
    },
    min: {
      type: Number,
      default: 0,
    },
    max: {
      type: Number,
      default: 100,
    },
    step: {
      type: Number,
      default: 1,
    },
    size: {
      type: Number,
      default: 32,
    },
  });

  const emit = defineEmits(["update:modelValue"]);

  // Computed values for rotation and arc
  const rotation = computed(() => {
    const range = props.max - props.min;
    const normalized = (props.modelValue - props.min) / range;
    return normalized * 270 - 135; // -135 to 135 degrees
  });

  const arcLength = computed(() => {
    return 2 * Math.PI * 12; // Circumference of track circle
  });

  const arcOffset = computed(() => {
    const range = props.max - props.min;
    const normalized = (props.modelValue - props.min) / range;
    return arcLength.value * (1 - normalized);
  });

  // Drag handling
  let isDragging = false;
  let startY = 0;
  let startValue = 0;

  const startDrag = (event) => {
    event.preventDefault();
    isDragging = true;
    startY = event.pageY || event.touches?.[0].pageY;
    startValue = props.modelValue;

    document.addEventListener("mousemove", handleDrag);
    document.addEventListener("mouseup", stopDrag);
    document.addEventListener("touchmove", handleDrag);
    document.addEventListener("touchend", stopDrag);
  };

  const handleDrag = (event) => {
    if (!isDragging) return;

    const currentY = event.pageY || event.touches?.[0].pageY;
    const deltaY = startY - currentY;
    const range = props.max - props.min;
    const sensitivity = range / 200; // Adjust for sensitivity

    let newValue = startValue + deltaY * sensitivity;
    newValue = Math.round(newValue / props.step) * props.step;
    newValue = Math.max(props.min, Math.min(props.max, newValue));

    emit("update:modelValue", newValue);
  };

  const stopDrag = () => {
    isDragging = false;
    document.removeEventListener("mousemove", handleDrag);
    document.removeEventListener("mouseup", stopDrag);
    document.removeEventListener("touchmove", handleDrag);
    document.removeEventListener("touchend", stopDrag);
  };

  const reset = () => {
    emit("update:modelValue", props.min + (props.max - props.min) / 2);
  };
</script>

<style scoped>
  .knob {
    @apply cursor-pointer select-none;
    touch-action: none;
  }

  .knob:hover circle:last-child {
    @apply fill-emerald-400;
  }

  .knob:active circle:last-child {
    @apply fill-emerald-300;
  }
</style>
