/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        portal: {
          bg: "var(--portal-bg)",
          muted: "var(--portal-muted)",
          "muted-bg": "var(--portal-muted-bg)",
          border: "var(--portal-border)",
          text: "var(--portal-text)",
          card: "var(--portal-card)",
          invert: "var(--portal-invert)",
          "invert-text": "var(--portal-invert-text)",
          "danger-bg": "var(--portal-danger-bg)",
          "danger-border": "var(--portal-danger-border)",
          danger: "var(--portal-danger-text)",
          "ok-bg": "var(--portal-ok-bg)",
          "ok-border": "var(--portal-ok-border)",
          ok: "var(--portal-ok-text)",
          "warn-bg": "var(--portal-warn-bg)",
          "warn-border": "var(--portal-warn-border)",
          warn: "var(--portal-warn-text)",
        },
        chat: {
          bg: "var(--portal-bg)",
          panel: "var(--portal-card)",
          elev: "var(--portal-muted-bg)",
          border: "var(--portal-border)",
          hover: "var(--portal-muted-bg)",
          muted: "var(--portal-muted)",
          text: "var(--portal-text)",
          accent: "var(--portal-invert)",
          accent2: "var(--portal-invert)",
        },
        brand: {
          400: "var(--portal-muted)",
          500: "var(--portal-invert)",
          600: "var(--portal-text)",
        },
        navy: {
          500: "var(--portal-invert)",
          600: "var(--portal-text)",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.08), 0 24px 64px rgba(0,0,0,0.45)",
        soft: "0 8px 30px rgba(0,0,0,0.28)",
        brand: "none",
      },
    },
  },
  plugins: [],
};
