// Global object polyfill
if (typeof global === "undefined") {
  window.global = globalThis;
}

// Process polyfill with hrtime
if (typeof process === "undefined") {
  window.process = {
    env: {},
    hrtime: [0, 0],
    browser: true,
  };
}

// Performance polyfill
if (typeof performance === "undefined") {
  window.performance = {
    now: Date.now,
  };
}

// Buffer polyfill
if (typeof Buffer === "undefined") {
  window.Buffer = {
    isBuffer: () => false,
  };
}

// Stream polyfill
if (typeof Stream === "undefined") {
  window.Stream = {};
}

// Util polyfill
if (typeof util === "undefined") {
  window.util = {};
}
