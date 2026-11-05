/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0D9488", // Deep Teal
          hover: "#0F766E",
          active: "#115E59",
          light: "#F0FDFA",
          border: "#CCFBF1",
        },
        secondary: {
          DEFAULT: "#0284C7", // Medical Blue
          hover: "#0369A1",
          light: "#F0F9FF",
        },
        positive: {
          DEFAULT: "#10B981", // Subtle Green
          light: "#ECFDF5",
          dark: "#065F46",
        },
        bgWarm: "#F7F9FA",
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#F1F5F9",
        },
        semantic: {
          normal: "#10B981",
          high: "#EF4444",
          low: "#F59E0B",
          pending: "#64748B",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(15, 23, 42, 0.04)",
        card: "0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.03)",
        hover: "0 12px 24px -6px rgba(15, 23, 42, 0.08), 0 4px 8px -4px rgba(15, 23, 42, 0.03)",
        float: "0 20px 35px -10px rgba(15, 23, 42, 0.12), 0 8px 16px -6px rgba(15, 23, 42, 0.04)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

