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
      <circle cx="16" cy="16" r="14" class="fill-zinc-800" />

      <!-- Value Track -->
      <path
        d="M16 6 L16 2"
        class="stroke-emerald-500"
        stroke-width="2"
        stroke-linecap="round"
      />
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
      default: 40, // Increased default size
    },
  });

  const emit = defineEmits(["update:modelValue"]);

  // Computed values for rotation
  const rotation = computed(() => {
    const range = props.max - props.min;
    const normalized = (props.modelValue - props.min) / range;
    return normalized * 270 - 135; // -135 to 135 degrees
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
    const sensitivity = range / 100; // Increased sensitivity

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

  .knob:hover circle {
    @apply fill-zinc-700;
  }

  .knob:active circle {
    @apply fill-zinc-600;
  }

  .knob:hover path {
    @apply stroke-emerald-400;
  }

  .knob:active path {
    @apply stroke-emerald-300;
  }
</style>
