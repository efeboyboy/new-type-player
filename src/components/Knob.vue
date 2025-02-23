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
  });

  const emit = defineEmits(["update:modelValue"]);

  // Computed values for rotation
  const rotation = computed(() => {
    const range = props.max - props.min;
    const normalized = (props.modelValue - props.min) / range;
    return normalized * 270 - 135; // -135 to 135 degrees
  });

  // Drag handling with improved precision
  let isDragging = false;
  let lastY = 0;
  let currentValue = 0;

  const startDrag = (event) => {
    event.preventDefault();
    isDragging = true;
    lastY = event.pageY || event.touches?.[0].pageY;
    currentValue = props.modelValue;

    document.addEventListener("mousemove", handleDrag, { capture: true });
    document.addEventListener("mouseup", stopDrag, { capture: true });
    document.addEventListener("touchmove", handleDrag, {
      capture: true,
      passive: false,
    });
    document.addEventListener("touchend", stopDrag, { capture: true });
  };

  const handleDrag = (event) => {
    if (!isDragging) return;

    const currentY = event.pageY || event.touches?.[0].pageY;
    const deltaY = lastY - currentY;
    lastY = currentY;

    const range = props.max - props.min;
    const sensitivity = range / 50; // Much higher sensitivity

    let newValue = currentValue + deltaY * sensitivity;

    // Apply step quantization
    if (props.step > 0) {
      newValue = Math.round(newValue / props.step) * props.step;
    }

    // Clamp value
    newValue = Math.max(props.min, Math.min(props.max, newValue));

    if (newValue !== props.modelValue) {
      currentValue = newValue;
      emit("update:modelValue", newValue);
    }
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const deltaY = event.deltaY;
    const range = props.max - props.min;
    const sensitivity = range / 200; // Much higher wheel sensitivity

    let newValue = props.modelValue - deltaY * sensitivity;

    if (props.step > 0) {
      newValue = Math.round(newValue / props.step) * props.step;
    }

    newValue = Math.max(props.min, Math.min(props.max, newValue));
    emit("update:modelValue", newValue);
  };

  const stopDrag = () => {
    isDragging = false;
    document.removeEventListener("mousemove", handleDrag, { capture: true });
    document.removeEventListener("mouseup", stopDrag, { capture: true });
    document.removeEventListener("touchmove", handleDrag, { capture: true });
    document.removeEventListener("touchend", stopDrag, { capture: true });
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
