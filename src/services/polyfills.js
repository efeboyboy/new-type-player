// Global object polyfill
if (typeof global === "undefined") {
  window.global = globalThis;
}

// Process polyfill with hrtime
if (typeof process === "undefined") {
  window.process = {
    env: {},
    hrtime: function (previousTimestamp) {
      const performanceNow =
        performance && performance.now ? performance.now() : Date.now();
      const clocktime = performanceNow * 1e-3;
      let seconds = Math.floor(clocktime);
      let nanoseconds = Math.floor((clocktime % 1) * 1e9);

      if (previousTimestamp) {
        seconds = seconds - previousTimestamp[0];
        nanoseconds = nanoseconds - previousTimestamp[1];
        if (nanoseconds < 0) {
          seconds--;
          nanoseconds += 1e9;
        }
      }
      return [seconds, nanoseconds];
    },
    browser: true,
  };
}

// Performance polyfill
if (typeof performance === "undefined") {
  window.performance = {
    now: function () {
      return Date.now();
    },
  };
}

// Buffer polyfill
if (typeof Buffer === "undefined") {
  import("buffer").then(({ Buffer }) => {
    window.Buffer = Buffer;
    window.Buffer.isBuffer = (obj) => Buffer.isBuffer(obj);
  });
}

// Stream polyfill
if (typeof Stream === "undefined") {
  import("stream-browserify").then((Stream) => {
    window.Stream = Stream;
  });
}

// Util polyfill
if (typeof util === "undefined") {
  import("util").then((util) => {
    window.util = util;
  });
}
