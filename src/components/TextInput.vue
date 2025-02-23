<template>
  <div class="flex flex-col gap-2">
    <input
      type="text"
      class="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-colors"
      placeholder="Enter text to generate sequence..."
      v-model="inputText"
      @input="handleInput"
    />
    <div class="flex items-center justify-between text-xs text-zinc-500">
      <span>Characters: {{ inputText.length }}</span>
      <button
        @click="clearInput"
        class="text-zinc-400 hover:text-red-500 transition-colors"
      >
        Clear
      </button>
    </div>
  </div>
</template>

<script setup>
  import { ref, defineEmits } from "vue";

  const inputText = ref("");
  const emit = defineEmits(["update:text"]);

  const handleInput = () => {
    if (inputText.value.trim() !== "") {
      emit("update:text", inputText.value);
    }
  };

  const clearInput = () => {
    inputText.value = "";
    emit("update:text", "");
  };
</script>

<style scoped>
  /* Component-specific styles can be added here */
</style>
