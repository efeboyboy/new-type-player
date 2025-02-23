// Global object polyfill
if (typeof global === "undefined") {
  window.global = globalThis;
}

// Process polyfill with hrtime
if (typeof process === "undefined") {
  window.process = {
    env: {},
    hrtime: function (previousTimestamp) {
      const now = performance.now();
      const prev = previousTimestamp
        ? previousTimestamp[0] * 1e3 + previousTimestamp[1] / 1e6
        : 0;
      const diff = now - prev;
      return [Math.floor(diff / 1000), (diff % 1000) * 1e6];
    },
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
