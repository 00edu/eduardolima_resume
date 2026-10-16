import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1a211c",
        clay: "#c45c26",
        sand: "#e8dcc8",
        mist: "#f3eee4",
        pine: "#2f5d50",
        slate: "#4a5560",
        haze: "#d4cbb8",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 12px 40px rgba(26, 33, 28, 0.12)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.35)", opacity: "0.55" },
        },
        wave: {
          "0%, 100%": { transform: "scaleY(0.4)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        rise: "rise 0.45s ease-out both",
        "pulse-dot": "pulseDot 1.6s ease-in-out infinite",
        wave: "wave 0.9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
