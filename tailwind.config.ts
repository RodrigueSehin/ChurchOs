import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0B2A4A",
        // Garde la teinte de marque (`bg-blue`) ET la palette standard : sans elle, `bg-blue-100`, `text-blue-600`… n'existent pas.
        blue: { ...colors.blue, DEFAULT: "#1F3F6D" },
        gold: "#EED58E",
        primary: {
          DEFAULT: "#2563EB",
          foreground: "#FFFFFF",
        },
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
        surface: "#F5F8FC",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
      },
      // Animations de la Vitrine (désactivées par `prefers-reduced-motion`, voir globals.css).
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(24px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-down": { from: { opacity: "0", transform: "translateY(-8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        float: { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-12px)" } },
        "ken-burns": { from: { transform: "scale(1)" }, to: { transform: "scale(1.12)" } },
        "gradient-x": { "0%, 100%": { backgroundPosition: "0% 50%" }, "50%": { backgroundPosition: "100% 50%" } },
        blob: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(30px, -40px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.95)" },
        },
        "ping-soft": { "0%": { transform: "scale(1)", opacity: "0.5" }, "100%": { transform: "scale(1.5)", opacity: "0" } },
        shimmer: { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-up": "fade-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.6s ease-out both",
        "slide-down": "slide-down 0.25s ease-out both",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 9s ease-in-out infinite",
        "ken-burns": "ken-burns 22s ease-in-out infinite alternate",
        "gradient-x": "gradient-x 6s ease infinite",
        blob: "blob 14s ease-in-out infinite",
        "ping-soft": "ping-soft 2.4s cubic-bezier(0, 0, 0.2, 1) infinite",
        shimmer: "shimmer 3.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
