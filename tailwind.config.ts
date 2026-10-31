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
        display: ["var(--font-body)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      colors: {
        orange: {
          50: '#FFF1E7', 100: '#FFE3D6', 200: '#FFC9B4', 300: '#FFA585',
          400: '#FA7A51', 500: '#F24E1E', 600: '#D64119', 700: '#AD3213',
          800: '#86290F', 900: '#65220F', 950: '#3D170D',
        },
        stone: {
          50: '#FFFAF6', 100: '#FFF3EC', 200: '#EEE2D9', 300: '#DBCABF',
          400: '#95877D', 500: '#74665D', 600: '#655750', 700: '#51433E',
          800: '#3F322E', 900: '#302622', 950: '#241B17',
        },
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
