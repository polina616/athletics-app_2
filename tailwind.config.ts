import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        track: { DEFAULT: "#E0442C", dark: "#B8341F", soft: "rgba(224,68,44,0.14)" },
        gold: { DEFAULT: "#C9971F", dark: "#A87A18", soft: "rgba(201,151,31,0.16)" },
        blue: { DEFAULT: "#1E4FCB", soft: "rgba(30,79,203,0.14)" },
        ink: "#161A23",
        muted: "#6C7486",
        status: {
          ok: "#22C55E",
          fail: "#EF4444",
          pass: "#8A93A6",
          record: "#C9971F",
        },
        surface: {
          DEFAULT: "#12151C",
          soft: "#171B24",
        },
      },
      fontFamily: {
        display: ["Bebas Neue", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};
export default config;