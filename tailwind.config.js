import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "rgb(248, 250, 252)",
        foreground: "rgb(15, 23, 42)",

        card: {
          DEFAULT: "rgb(255, 255, 255)",
          foreground: "rgb(15, 23, 42)",
        },
        popover: {
          DEFAULT: "rgb(255, 255, 255)",
          foreground: "rgb(15, 23, 42)",
        },
        primary: {
          DEFAULT: "rgb(30, 58, 138)",
          foreground: "rgb(248, 250, 252)",
        },
        secondary: {
          DEFAULT: "rgb(241, 245, 249)",
          foreground: "rgb(51, 65, 85)",
        },
          muted: {
            DEFAULT: "rgb(248, 250, 252)",
            foreground: "rgb(71, 85, 105)",
          },
        accent: {
          DEFAULT: "rgb(30, 58, 138)",
          foreground: "rgb(248, 250, 252)",
        },
        // Insurance Professional Theme
        "insurance-navy": "hsl(var(--insurance-navy))",
        "insurance-navy-light": "hsl(var(--insurance-navy-light))",
        "insurance-blue": "hsl(var(--insurance-blue))",
        "insurance-gray": "hsl(var(--insurance-gray))",
        "insurance-gray-light": "hsl(var(--insurance-gray-light))",
        // Status Colors - Professional
        "status-pending": "rgb(148, 163, 184)",
        "status-review": "rgb(59, 130, 246)",
        "status-approved": "rgb(34, 197, 94)",
        "status-rejected": "rgb(239, 68, 68)",
        // Sidebar
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-card": "var(--gradient-card)",
      },
      boxShadow: {
        "elegant": "var(--shadow-elegant)",
        "form": "var(--shadow-form)",
      },
      transitionProperty: {
        "smooth": "var(--transition-smooth)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
