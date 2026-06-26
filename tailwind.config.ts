import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
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
      screens: {
        xs: "480px",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Inter", "Segoe UI", "Roboto", "Helvetica Neue", "sans-serif"],
        display: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Inter", "Segoe UI", "Roboto", "Helvetica Neue", "sans-serif"],
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
        // TerraFusion Liquid Glass Colors
        tf: {
          substrate: "hsl(var(--tf-substrate))",
          surface: "hsl(var(--tf-surface))",
          elevated: "hsl(var(--tf-elevated))",
          glass: "hsl(var(--tf-glass))",
          cyan: "hsl(var(--tf-transcend-cyan))",
          "bright-cyan": "hsl(var(--tf-bright-cyan))",
          green: "hsl(var(--tf-optimized-green))",
          gold: "hsl(var(--tf-sacred-gold))",
          amber: "hsl(var(--tf-anomaly-amber))",
          red: "hsl(var(--tf-warning-red))",
          purple: "hsl(var(--tf-muse-purple))",
        },
        // Suite Identity Colors
        suite: {
          forge: "hsl(var(--suite-forge))",
          atlas: "hsl(var(--suite-atlas))",
          dais: "hsl(var(--suite-dais))",
          dossier: "hsl(var(--suite-dossier))",
        },
        // Work Mode Colors
        mode: {
          overview: "hsl(var(--mode-overview))",
          valuation: "hsl(var(--mode-valuation))",
          mapping: "hsl(var(--mode-mapping))",
          admin: "hsl(var(--mode-admin))",
          case: "hsl(var(--mode-case))",
        },
        // VEI Status Colors
        vei: {
          excellent: "hsl(var(--vei-excellent))",
          good: "hsl(var(--vei-good))",
          caution: "hsl(var(--vei-caution))",
          concern: "hsl(var(--vei-concern))",
        },
        // Tier Colors
        tier: {
          q1: "hsl(var(--tier-q1))",
          q2: "hsl(var(--tier-q2))",
          q3: "hsl(var(--tier-q3))",
          q4: "hsl(var(--tier-q4))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
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
        "quantum-pulse": {
          "0%, 100%": { opacity: "0.85" },
          "50%": { opacity: "1" },
        },
        "orb-float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "0.8" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "quantum-pulse": "quantum-pulse 3s ease-in-out infinite",
        "orb-float": "orb-float 4s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "sovereign-gradient": "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--tf-bright-cyan)) 100%)",
        "glass-gradient": "linear-gradient(180deg, hsl(var(--tf-surface) / 0.8) 0%, hsl(var(--tf-substrate) / 0.9) 100%)",
      },
      boxShadow: {
        sovereign: "0 2px 8px hsl(0 0% 0% / 0.1)",
        "sovereign-lg": "0 8px 30px hsl(0 0% 0% / 0.12), 0 2px 8px hsl(0 0% 0% / 0.06)",
        glass: "0 1px 3px hsl(0 0% 0% / 0.08)",
        tahoe: "0 1px 3px hsl(0 0% 0% / 0.08)",
        "tahoe-md": "0 4px 12px hsl(0 0% 0% / 0.1)",
        "tahoe-lg": "0 8px 30px hsl(0 0% 0% / 0.12), 0 2px 8px hsl(0 0% 0% / 0.06)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
