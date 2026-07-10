import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101826",
        panel: "#ffffff",
        canvas: "#f3f5f8",
        line: "#dde3ea",
        artery: "#b3261e",
        vein: "#1d4e89",
        stemi: "#b3261e",
        nstemi: "#c76b19",
        ua: "#8a6d00",
        stable: "#1c6b4a",
        hfref: "#b3261e",
        hfmref: "#c76b19",
        hfpef: "#1c6b4a",
        stageD: "#7a1fa2",
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "serif"],
        sans: ["-apple-system", "Segoe UI", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
