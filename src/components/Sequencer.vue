<template>
  <div>
    <div v-if="!sequence || sequence.length === 0">
      No sequence generated. Enter text in the Input section.
    </div>
    <table v-else class="table-auto w-full">
      <thead>
        <tr>
          <th class="px-4 py-2">Channel</th>
          <th class="px-4 py-2">Sequence (MIDI Notes)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(channel, index) in sequence" :key="index">
          <td class="border px-4 py-2">{{ index + 1 }}</td>
          <td class="border px-4 py-2">{{ channel.join(", ") }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { store } from "../store.js";

  const sequence = computed(() => store.sequence);
</script>

<style scoped>
  /* Add styles if needed */
</style>
