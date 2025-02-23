// Centralized Polyfills

// First, ensure window and global are properly set
window.global = window;
global = window;

// Performance polyfill
if (!window.performance) {
  window.performance = {
    now: () => Date.now(),
  };
}

// Process polyfill with hrtime
const processPolyfill = {
  env: {},
  browser: true,
  version: "",
  platform: "browser",
  nextTick: (fn) => Promise.resolve().then(fn),
  hrtime: function (previousTimestamp) {
    const clocktime = performance.now() * 1e-3;
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
};

// Ensure hrtime is also available as a property
processPolyfill.hrtime.bigint = function () {
  const time = processPolyfill.hrtime();
  return BigInt(time[0]) * BigInt(1e9) + BigInt(time[1]);
};

// Directly set process on both global and window
window.process = processPolyfill;
global.process = processPolyfill;

// Buffer polyfill
if (!global.Buffer) {
  global.Buffer = {
    isBuffer: () => false,
    from: (data) => new Uint8Array(data),
  };
}

// Stream polyfill
if (!global.Stream) {
  global.Stream = function () {};
  global.Stream.Readable = function () {};
}

// Util polyfill
if (!global.util) {
  global.util = {
    inherits: function (ctor, superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true,
        },
      });
    },
  };
}

// Ensure setImmediate is available
if (!global.setImmediate) {
  global.setImmediate = function (callback) {
    return setTimeout(callback, 0);
  };
  global.clearImmediate = function (id) {
    clearTimeout(id);
  };
}
