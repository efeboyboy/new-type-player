<template>
  <div class="icon-holder">
    <slot></slot>
  </div>
</template>

<script setup>
  // No props needed for basic functionality
</script>

<style>
  .icon-holder {
    @apply flex items-center justify-center;
    line-height: 0;
  }

  .icon-holder :deep(svg) {
    @apply w-full h-full;
  }

  .icon-holder :deep(svg path),
  .icon-holder :deep(svg polyline),
  .icon-holder :deep(svg line),
  .icon-holder :deep(svg circle) {
    stroke-width: 1.5px;
  }
</style>
