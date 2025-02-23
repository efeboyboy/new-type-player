// Import polyfills first
import "./services/polyfills.js";

import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";

createApp(App).mount("#app");
