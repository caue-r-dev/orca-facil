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
        paper: "#F5F2EB",
        ink: "#1E2521",
        "ink-soft": "#4A534D",
        blueprint: "#2F4A5C",
        "blueprint-deep": "#1F3540",
        brass: "#B4813C",
        "brass-soft": "#E4C892",
        line: "#D8D2C2",
        danger: "#A3462F",
        brand: {
          bg: "#FAF7F2",
          text: "#1A1A1A",
          "text-secondary": "#5A5A52",
          "text-tertiary": "#8A8578",
          accent: "#D97706",
          "accent-hover": "#C1660A",
          border: "#E8E2D5",
          "border-input": "#D8D2C4",
          "nav-link": "#C9C4B6",
          "badge-bg": "#FAEEDA",
          "badge-text": "#8A5A1A",
        },
      },
      fontFamily: {
        "serif-body": ["Georgia", "serif"],
        "mono-num": ['"Courier New"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
