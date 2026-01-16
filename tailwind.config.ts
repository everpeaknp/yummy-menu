import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
            DEFAULT: "#ff6929",
            50: "#fff1eb",
            100: "#ffe0d1",
            200: "#ffbf9e",
            300: "#ff9966",
            400: "#ff6929",
            500: "#ff6929",
            600: "#ff4d0a",
            700: "#cc3900",
            800: "#a32e00",
            900: "#7a2200",
        },
        dark: {
            DEFAULT: "#0a0a0a",
            900: "#0a0a0a",
            800: "#171717",
        }
      },
    },
  },
  plugins: [],
};
export default config;
