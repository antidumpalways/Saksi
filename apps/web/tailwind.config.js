/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#070B12",
        panel: "#0C1220",
        line: "#1B2436",
        mint: "#7CFFB2",
        muted: "#8A97AE",
        danger: "#FF7A7A",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124,255,178,0.15), 0 20px 60px rgba(0,0,0,0.45)",
      },
    },
  },
  plugins: [],
};
