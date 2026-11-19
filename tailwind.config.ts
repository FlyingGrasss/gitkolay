import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#ffffff",
        surface: "#ffffff",
        subtle: "#f7f7f8",
        ink: "#18181b",
        muted: "#71717a",
        line: "#e4e4e7",
        strong: "#a1a1aa",
        focus: "#2563eb",
        success: {
          DEFAULT: "#15803d",
          soft: "#f0fdf4",
          line: "#bbf7d0",
        },
        warning: {
          DEFAULT: "#a16207",
          soft: "#fffbeb",
          line: "#fde68a",
        },
        danger: {
          DEFAULT: "#b91c1c",
          soft: "#fef2f2",
          line: "#fecaca",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "SFMono-Regular",
          "Consolas",
          "Liberation Mono",
          "Menlo",
          "monospace",
        ],
      },
      borderRadius: {
        field: "0.5rem",
        container: "0.75rem",
      },
      maxWidth: {
        content: "68rem",
        wide: "80rem",
      },
    },
  },
  plugins: [],
};

export default config;
