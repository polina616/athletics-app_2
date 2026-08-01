import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        track: { DEFAULT: "#E0442C", dark: "#B8341F", light: "#FF6A4D", soft: "rgba(224,68,44,0.14)" },
        gold: { DEFAULT: "#C9971F", dark: "#A87A18", light: "#E9BE4E", soft: "rgba(201,151,31,0.16)" },
        blue: { DEFAULT: "#1E4FCB", light: "#5B8CFF", soft: "rgba(30,79,203,0.14)" },
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
          raised: "#1B1F29",
        },
      },
      fontFamily: {
        display: ["Bebas Neue", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "display-xl": ["clamp(2.5rem, 5vw, 4rem)", { lineHeight: "0.95", letterSpacing: "0.005em" }],
        "display-lg": ["clamp(2rem, 3.4vw, 2.75rem)", { lineHeight: "0.98", letterSpacing: "0.01em" }],
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
      borderRadius: {
        sm2: "0.625rem",
        xl2: "1.25rem",
        xl3: "1.75rem",
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.5)",
        "card-lg": "0 1px 0 rgba(255,255,255,0.05) inset, 0 24px 48px -20px rgba(0,0,0,0.65)",
        "glow-track": "0 0 0 1px rgba(224,68,44,0.35), 0 8px 30px -6px rgba(224,68,44,0.45)",
        "glow-blue": "0 0 0 1px rgba(30,79,203,0.35), 0 8px 30px -6px rgba(30,79,203,0.4)",
        "glow-gold": "0 0 0 1px rgba(201,151,31,0.35), 0 8px 30px -6px rgba(201,151,31,0.4)",
      },
      backgroundImage: {
        "grain": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 1.6s linear infinite",
      },
      transitionTimingFunction: {
        swift: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
export default config;