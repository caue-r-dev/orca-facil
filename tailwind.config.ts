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
