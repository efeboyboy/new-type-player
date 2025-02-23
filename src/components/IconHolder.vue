<template>
  <div
    class="icon-holder relative w-full aspect-square flex items-center justify-center"
  >
    <slot></slot>
  </div>
</template>

<script setup>
  // No props needed for basic functionality
</script>

<style scoped>
  .icon-holder {
    @apply transition-colors;
  }

  .icon-holder :deep(svg) {
    @apply w-full h-full;
  }
</style>
