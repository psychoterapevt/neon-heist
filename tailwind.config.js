/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "JetBrains Mono", "Menlo", "Consolas", "monospace"],
      },
      colors: {
        void: { 950: "#04060b", 900: "#070a12", 850: "#0b1020", 800: "#0f1629", 700: "#18223a" },
        neon: { cyan: "#67e8f9", teal: "#5eead4", pink: "#f472b6", violet: "#c084fc" },
        danger: "#ff3b5c",
        warn: "#fbbf24",
        ok: "#34d399",
      },
      keyframes: {
        "pop-in": { "0%": { opacity: "0", transform: "scale(0.85) translateY(6px)" }, "100%": { opacity: "1", transform: "scale(1) translateY(0)" } },
        "fade-up": { "0%": { opacity: "0", transform: "translateY(10px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        blink: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.35" } },
        scan: { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(100%)" } },
        float: { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        shake: { "0%,100%": { transform: "translateX(0)" }, "25%": { transform: "translateX(-4px)" }, "75%": { transform: "translateX(4px)" } },
      },
      animation: {
        "pop-in": "pop-in 180ms ease-out both",
        "fade-up": "fade-up 300ms ease-out both",
        blink: "blink 1.1s ease-in-out infinite",
        scan: "scan 3.5s linear infinite",
        float: "float 3s ease-in-out infinite",
        shake: "shake 260ms ease-in-out 1",
      },
    },
  },
  plugins: [],
};
