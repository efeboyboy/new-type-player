<template>
  <div class="knob-container" @pointerdown="startDrag">
    <div class="knob-ring">
      <!-- Progress arc -->
      <svg class="knob-progress" viewBox="0 0 32 32">
        <circle
          class="track"
          cx="16"
          cy="16"
          r="14"
          stroke-width="2"
          fill="none"
        />
        <circle
          class="value"
          cx="16"
          cy="16"
          r="14"
          stroke-width="2"
          fill="none"
          :stroke-dasharray="progressArc"
          transform="rotate(-90 16 16)"
        />
      </svg>

      <!-- Indicator dot -->
      <div
        class="knob-indicator"
        :style="{ transform: `rotate(${indicatorAngle}deg) translateY(-14px)` }"
      ></div>
    </div>

    <!-- Value display -->
    <div class="knob-value">{{ Math.round(localValue) }}</div>
  </div>
</template>

<script setup>
  import { ref, computed, watch, defineProps, defineEmits } from "vue";

  const props = defineProps({
    modelValue: {
      type: Number,
      required: true,
    },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    step: { type: Number, default: 1 },
  });

  const emit = defineEmits(["update:modelValue"]);
  const localValue = ref(props.modelValue);

  watch(
    () => props.modelValue,
    (newVal) => {
      localValue.value = newVal;
    }
  );

  let startY = 0;
  let startValue = 0;

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
    const sensitivity = 2;
    const dy = startY - e.clientY;
    const delta = Math.round(dy / sensitivity) * props.step;
    let newValue = startValue + delta;
    newValue = Math.max(props.min, Math.min(props.max, newValue));
    localValue.value = newValue;
    emit("update:modelValue", newValue);
  };

  const stopDrag = () => {
    window.removeEventListener("pointermove", onDrag);
    window.removeEventListener("pointerup", stopDrag);
  };

  const indicatorAngle = computed(() => {
    const range = props.max - props.min;
    const normalized = (localValue.value - props.min) / range;
    return normalized * 360;
  });

  const progressArc = computed(() => {
    const range = props.max - props.min;
    const normalized = (localValue.value - props.min) / range;
    const circumference = 2 * Math.PI * 14;
    return `${normalized * circumference} ${circumference}`;
  });
</script>

<style scoped>
  .knob-container {
    @apply relative flex flex-col items-center justify-center select-none;
    width: 100%;
    height: 100%;
  }

  .knob-ring {
    @apply relative rounded-full cursor-pointer;
    width: 90%;
    aspect-ratio: 1;
  }

  .knob-progress {
    @apply absolute inset-0 w-full h-full;
    transform: rotate(-90deg);
  }

  .knob-progress circle {
    @apply transition-all duration-100;
  }

  .knob-progress .track {
    @apply stroke-zinc-800;
  }

  .knob-progress .value {
    @apply stroke-red-500/40;
  }

  .knob-indicator {
    @apply absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-red-500 rounded-full;
    transform-origin: center center;
  }

  .knob-value {
    @apply mt-1 text-[10px] font-mono text-zinc-400 tabular-nums;
  }

  /* Hover state */
  .knob-ring:hover .knob-progress .value {
    @apply stroke-red-500/60;
  }

  /* Active state */
  .knob-ring:active .knob-progress .value {
    @apply stroke-red-500;
  }
</style>
