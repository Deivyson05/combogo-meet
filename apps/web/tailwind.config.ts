import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cor extraída diretamente do arquivo da logo (#F5821E)
        primary: {
          50: "#fef6ec",
          100: "#fce8cc",
          200: "#f9d09a",
          300: "#f6b463",
          400: "#f59a3f",
          500: "#f5821e", // marca
          600: "#dd6b12",
          700: "#b8530f",
          800: "#924212",
          900: "#773812",
        },
        ink: {
          50: "#f7f7f8",
          100: "#eeeef0",
          200: "#d9d9de",
          300: "#b4b4bd",
          400: "#8b8b97",
          500: "#6b6b78",
          600: "#4f4f5b",
          700: "#3a3a44",
          800: "#232329",
          900: "#131316",
          950: "#0b0b0d",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.8" },
          "80%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.2,0.6,0.35,1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
