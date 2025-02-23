/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        instrument: ['"Instrument Sans"', "sans-serif"],
      },
      colors: {
        rack: {
          panel: "#3f3f46",
          rail: "#52525b",
          screw: "#71717a",
        },
      },
      boxShadow: {
        "inner-lg": "inset 0 2px 4px 0 rgb(0 0 0 / 0.15)",
        module:
          "0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.1)",
      },
    },
  },
  plugins: [],
};
