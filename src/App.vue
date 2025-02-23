<script setup>
  import { watch } from "vue";
  import TextInput from "./components/TextInput.vue";
  import Sequencer from "./components/Sequencer.vue";
  import ControlPanel from "./components/ControlPanel.vue";
  import { store } from "./store.js";
  import AudioEngine from "./services/AudioEngine.js";

  const handleUpdateText = (newText) => {
    store.updateInput(newText);
  };

  // Watch the playback state and start/stop the AudioEngine accordingly
  watch(
    () => store.playing,
    (playing) => {
      if (playing) {
        AudioEngine.startPlayback(store.sequence);
      } else {
        AudioEngine.stopPlayback();
      }
    }
  );
</script>

<template>
  <div id="app" class="container mx-auto p-4">
    <header class="mb-4">
      <h1 class="text-3xl font-bold text-center">Buchla Type Player</h1>
    </header>
    <main class="flex flex-col space-y-4">
      <section id="input-section">
        <TextInput @update:text="handleUpdateText" />
      </section>
      <section id="sequencer-section">
        <Sequencer />
      </section>
      <section id="control-section">
        <ControlPanel />
      </section>
    </main>
  </div>
</template>

<style>
  /* Global styles can be added here */
</style>
