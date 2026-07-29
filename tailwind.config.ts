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
        page: "var(--page)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-hover": "var(--surface-hover)",
        "surface-solid": "var(--surface-solid)",
        elevated: "var(--elevated)",
        hairline: "var(--hairline)",
        content: "var(--content)",
        content2: "var(--content-2)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        ink: {
          950: "#080711",
          900: "#0d0b1a",
          850: "#12101f",
          800: "#171426",
          700: "#211d33",
          600: "#2d2842",
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
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(124,58,237,0.55)",
        "glow-cyan": "0 0 34px -10px rgba(56,242,224,0.5)",
        card: "0 20px 50px -24px rgba(0,0,0,0.75)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "spin-slow": {
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
        "spin-slow": "spin-slow 22s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
