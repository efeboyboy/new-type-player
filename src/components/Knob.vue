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
  const dragStart = ref({ x: 0, y: 0, value: 0 });
  const lastEmittedValue = ref(props.modelValue);
  const gestureMode = ref(null); // 'rotate', 'vertical', or 'horizontal'
  const gestureThreshold = 10; // Pixels to move before determining gesture mode

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

  // Gesture detection functions
  const determineGestureMode = (event) => {
    const pageX = event.touches ? event.touches[0].pageX : event.pageX;
    const pageY = event.touches ? event.touches[0].pageY : event.pageY;

    const deltaX = Math.abs(pageX - dragStart.value.x);
    const deltaY = Math.abs(pageY - dragStart.value.y);

    // If we've moved past the threshold, determine the gesture type
    if (deltaX > gestureThreshold || deltaY > gestureThreshold) {
      if (deltaY > deltaX) {
        // Vertical movement is dominant
        gestureMode.value = "vertical";
      } else {
        // Either rotate or horizontal depending on implementation preference
        // For Apple-style knobs, we typically use vertical slide rather than horizontal
        gestureMode.value = "rotate";
      }
    }
  };

  // Calculate value based on rotation
  const calculateRotationValue = (event) => {
    const pageX = event.touches ? event.touches[0].pageX : event.pageX;
    const pageY = event.touches ? event.touches[0].pageY : event.pageY;

    // Calculate the center of the knob
    const knobElement = event.currentTarget;
    const rect = knobElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate the angle
    const startAngle = Math.atan2(
      dragStart.value.y - centerY,
      dragStart.value.x - centerX
    );
    const currentAngle = Math.atan2(pageY - centerY, pageX - centerX);

    // Convert angle to degrees and calculate delta
    let angleDelta = (currentAngle - startAngle) * (180 / Math.PI);

    // Normalize delta to be between -180 and 180 degrees
    if (angleDelta > 180) angleDelta -= 360;
    if (angleDelta < -180) angleDelta += 360;

    // Scale angleDelta to value range
    const range = props.max - props.min;
    const valueDelta = (angleDelta / 270) * range;

    return dragStart.value.value + valueDelta;
  };

  // Calculate value based on vertical slide
  const calculateVerticalValue = (event) => {
    const pageY = event.touches ? event.touches[0].pageY : event.pageY;
    const deltaY = dragStart.value.y - pageY;

    // Calculate vertical sensitivity based on range
    const range = props.max - props.min;
    const sensitivity = (range / 200) * props.sensitivity; // Adjust based on range and sensitivity prop

    return dragStart.value.value + deltaY * sensitivity;
  };

  // Event handlers
  const startDrag = (event) => {
    event.preventDefault();
    const pageX = event.touches ? event.touches[0].pageX : event.pageX;
    const pageY = event.touches ? event.touches[0].pageY : event.pageY;

    isDragging.value = true;
    gestureMode.value = null; // Reset gesture mode

    dragStart.value = {
      x: pageX,
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

    // Determine gesture mode if not already set
    if (!gestureMode.value) {
      determineGestureMode(event);
    }

    let newValue;
    if (gestureMode.value === "vertical") {
      // Vertical slide mode
      newValue = calculateVerticalValue(event);
    } else {
      // Default to rotation mode
      newValue = calculateRotationValue(event);
    }

    // Quantize and clamp the value
    newValue = quantizeValue(clampValue(newValue));

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
    const sensitivity = (range / 400) * props.sensitivity; // Adjust sensitivity based on range
    const delta = -event.deltaY * sensitivity * 0.01; // Scale down for smoother wheel control

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
    gestureMode.value = null;

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
