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
          50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB',
          400: '#9CA3AF', 500: '#6B7280', 600: '#4B5563', 700: '#374151',
          800: '#1F2937', 900: '#111827', 950: '#0B1220',
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
