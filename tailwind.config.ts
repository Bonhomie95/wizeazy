import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Semantic, theme-aware tokens (backed by CSS variables)
        page: "rgb(var(--page-rgb) / <alpha-value>)",
        "page-2": "rgb(var(--page-2-rgb) / <alpha-value>)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-hover": "var(--surface-hover)",
        "surface-solid": "rgb(var(--surface-solid-rgb) / <alpha-value>)",
        elevated: "var(--elevated)",
        hairline: "var(--hairline)",
        "hairline-strong": "var(--hairline-strong)",
        content: "var(--content)",
        content2: "var(--content-2)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        ink: {
          950: "#08080a",
          900: "#0e0e11",
          850: "#121215",
          800: "#18181c",
          700: "#232328",
          600: "#2e2e35",
        },
        brand: {
          50: "#f2ecff",
          100: "#e5d8ff",
          200: "#c9b1ff",
          300: "#a884ff",
          400: "#8b5cff",
          500: "#7c3aed",
          600: "#6d28d9",
          700: "#5b21b6",
        },
        cyber: {
          400: "#38f2e0",
          500: "#12d9c6",
        },
        deal: {
          400: "#ff8a4c",
          500: "#ff6a2b",
          // text/badge shade: 5.2:1 with white (WCAG AA for small text)
          600: "#c2410c",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        glow: "0 10px 40px -12px rgba(124,58,237,0.55)",
        soft: "var(--shadow-md)",
        lift: "var(--shadow-lg)",
        card: "var(--shadow-md)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "spin-slow": {
          "100%": { transform: "rotate(360deg)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both",
        float: "float 7s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
        "spin-slow": "spin-slow 22s linear infinite",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.16,1,0.3,1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
