import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        foreground: "#f4f4f5",
        teal: {
          DEFAULT: "#F5A3FF",
          dim: "rgba(212, 4, 0, 0.1)",
        },
        border: "rgba(255, 255, 255, 0.12)",
        muted: "#71717a",
        card: "#111111",
        "card-hover": "#161616",
      },
      fontFamily: {
        mono: ["Inter", "'IBM Plex Mono'", "monospace"],
        sans: ["Inter", "'IBM Plex Sans'", "sans-serif"],
      },
      borderColor: {
        DEFAULT: "rgba(255, 255, 255, 0.12)",
      },
      animation: {
        "count-up": "countUp 1.5s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "spin-fast": "spin 0.5s linear infinite",
      },
      keyframes: {
        countUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)",
        teal: "0 0 20px rgba(0, 212, 180, 0.15)",
      },
    },
  },
  plugins: [],
};
export default config;
