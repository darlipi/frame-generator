import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // "Darkroom / print-lab" palette — deliberate departure from the
        // cream+terracotta and near-black+neon defaults.
        ink: {
          DEFAULT: "#12151C", // near-black with a blue cast, like wet darkroom tile
          800: "#1A1E27",
          700: "#232837",
        },
        paper: {
          DEFAULT: "#F1EFEA", // exposed contact-sheet paper
          dim: "#D9D5CB",
        },
        cobalt: {
          DEFAULT: "#2B4CE0", // safelight-adjacent spot color, not the usual clay/green
          600: "#233FBD",
          400: "#5670EA",
        },
        safelight: "#E0562B",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        contact: "0 1px 0 rgba(255,255,255,0.04), 0 20px 40px -20px rgba(0,0,0,0.6)",
      },
      borderRadius: {
        frame: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
