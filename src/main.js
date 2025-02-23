// Import polyfills first
import "./services/polyfills.js";

// Then import other dependencies
import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";

// Create and mount the app
createApp(App).mount("#app");
