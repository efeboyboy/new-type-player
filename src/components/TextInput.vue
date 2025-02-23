<template>
  <div>
    <input
      type="text"
      class="border rounded p-2 w-full"
      placeholder="Enter text here"
      v-model="inputText"
      @input="handleInput"
    />
  </div>
</template>

<script setup>
  import { ref, defineEmits } from "vue";

  // Reactive variable for input value
  const inputText = ref("");

  // Define event emit
  const emit = defineEmits(["update:text"]);

  // Emit updated text on input, validating non-empty input
  const handleInput = () => {
    if (inputText.value.trim() !== "") {
      emit("update:text", inputText.value);
    }
  };
</script>

<style scoped>
  /* Component-specific styles can be added here */
</style>
