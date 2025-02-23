<template>
  <div
    class="knob relative w-full aspect-square"
    @mousedown="startDrag"
    @touchstart="startDrag"
    @wheel="handleWheel"
    @dblclick="reset"
  >
    <svg
      viewBox="0 0 32 32"
      class="w-full h-full transform transition-transform duration-75"
      :style="{ transform: `rotate(${rotation}deg)` }"
    >
      <!-- Background -->
      <circle
        cx="16"
        cy="16"
        r="14"
        class="fill-zinc-800 transition-colors duration-75"
      />

      <!-- Value Track -->
      <path
        d="M16 6 L16 2"
        class="stroke-emerald-500 transition-colors duration-75"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
  </div>
</template>

<script setup>
  import { ref, computed, watch, onUnmounted } from "vue";

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
    sensitivity: {
      type: Number,
      default: 1,
    },
  });

  const emit = defineEmits(["update:modelValue"]);

  // Internal state
  const internalValue = ref(props.modelValue);
  const isDragging = ref(false);
  const dragStart = ref({ y: 0, value: 0 });
  const lastEmittedValue = ref(props.modelValue);

  // Watch for external value changes
  watch(
    () => props.modelValue,
    (newVal) => {
      if (!isDragging.value) {
        internalValue.value = clampValue(newVal);
        lastEmittedValue.value = internalValue.value;
      }
    }
  );

  // Utility functions
  const clampValue = (value) => {
    const numValue = Number(value);
    if (isNaN(numValue)) return props.min;
    return Math.min(Math.max(numValue, props.min), props.max);
  };

  const quantizeValue = (value) => {
    if (props.step <= 0) return value;
    // More precise step calculation
    const normalized = (value - props.min) / props.step;
    const rounded = Math.round(normalized);
    return props.min + rounded * props.step;
  };

  const normalizeValue = (value) => {
    const range = props.max - props.min;
    if (range === 0) return 0;
    return (clampValue(value) - props.min) / range;
  };

  // Computed values
  const rotation = computed(() => {
    const normalized = normalizeValue(internalValue.value);
    return normalized * 270 - 135; // -135 to 135 degrees
  });

  // Event handlers
  const startDrag = (event) => {
    event.preventDefault();
    const pageY = event.touches ? event.touches[0].pageY : event.pageY;

    isDragging.value = true;
    dragStart.value = {
      y: pageY,
      value: internalValue.value,
    };

    // Add event listeners based on event type
    if (event.touches) {
      document.addEventListener("touchmove", handleDrag, { passive: false });
      document.addEventListener("touchend", stopDrag);
      document.addEventListener("touchcancel", stopDrag);
    } else {
      document.addEventListener("mousemove", handleDrag);
      document.addEventListener("mouseup", stopDrag);
    }
  };

  const handleDrag = (event) => {
    if (!isDragging.value) return;
    event.preventDefault();

    const pageY = event.touches ? event.touches[0].pageY : event.pageY;
    const deltaY = dragStart.value.y - pageY;

    // Simplified sensitivity calculation
    const range = props.max - props.min;
    const sensitivity = range / 200; // Fixed ratio for more predictable movement

    // Calculate new value
    const delta = deltaY * sensitivity;
    const rawValue = dragStart.value.value + delta;

    // Quantize and clamp the value
    const newValue = quantizeValue(clampValue(rawValue));

    // Only emit if value actually changed
    if (newValue !== lastEmittedValue.value) {
      internalValue.value = newValue;
      lastEmittedValue.value = newValue;
      emit("update:modelValue", newValue);
    }
  };

  const handleWheel = (event) => {
    event.preventDefault();

    const range = props.max - props.min;
    const sensitivity = range / 400; // Fixed ratio for wheel movement
    const delta = -event.deltaY * sensitivity;

    const rawValue = internalValue.value + delta;
    const newValue = quantizeValue(clampValue(rawValue));

    if (newValue !== lastEmittedValue.value) {
      internalValue.value = newValue;
      lastEmittedValue.value = newValue;
      emit("update:modelValue", newValue);
    }
  };

  const stopDrag = () => {
    isDragging.value = false;

    // Remove all event listeners
    document.removeEventListener("mousemove", handleDrag);
    document.removeEventListener("mouseup", stopDrag);
    document.removeEventListener("touchmove", handleDrag);
    document.removeEventListener("touchend", stopDrag);
    document.removeEventListener("touchcancel", stopDrag);
  };

  const reset = () => {
    const defaultValue = quantizeValue(props.min + (props.max - props.min) / 2);
    internalValue.value = defaultValue;
    lastEmittedValue.value = defaultValue;
    emit("update:modelValue", defaultValue);
  };

  // Cleanup
  onUnmounted(() => {
    if (isDragging.value) {
      stopDrag();
    }
  });
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
