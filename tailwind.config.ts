import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
        // ── shadcn/ui base tokens (DO NOT REMOVE) ─────────────────────────────
        border: {
          DEFAULT: "hsl(var(--border))",
          subtle:  '#EDE8DF',
          strong:  '#B5AFA6',
          focus:   '#0F6E56',
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow:    "hsl(var(--primary-glow))",
          hover:   '#0D5E49',
          active:  '#0A4D3C',
          tint:    '#E1F3EE',
          dark:    '#085041',
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
          hover:   '#E09018',
          light:   '#FDF3E0',
          dark:    '#7A4D00',
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
        // Semantic text colors for mint/green backgrounds
        "text-on-mint": "hsl(var(--text-on-mint))",
        "text-on-mint-secondary": "hsl(var(--text-on-mint-secondary))",

        // ── New semantic token system ──────────────────────────────────────────

        // Background Layers
        surface: {
          base:     '#F7F4EE',
          section:  '#EDE8DF',
          card:     '#FFFFFF',
          elevated: '#FAFAF8',
          overlay:  'rgba(26, 23, 20, 0.48)',
        },

        // Text Scale
        content: {
          primary:   '#1A1714',
          secondary: '#3D3730',
          muted:     '#7A7168',
          disabled:  '#B5AFA6',
          inverse:   '#F7F4EE',
        },

        // Neutral / Warm Grays
        neutral: {
          900: '#1A1714',
          800: '#3D3730',
          600: '#7A7168',
          400: '#B5AFA6',
          300: '#D9D4CC',
          200: '#EDE8DF',
          100: '#F7F4EE',
        },

        // State Colors (functional)
        success: {
          DEFAULT: '#1E8A3C',
          light:   '#D4F0DC',
          dark:    '#145C28',
        },
        warning: {
          DEFAULT: '#D97706',
          light:   '#FEF3C7',
          dark:    '#925004',
        },
        danger: {
          DEFAULT: '#DC2626',
          light:   '#FEE2E2',
          dark:    '#991B1B',
        },
        info: {
          DEFAULT: '#1D6DB5',
          light:   '#DBEAFE',
          dark:    '#1E3A5F',
        },

        // Course Track Colors
        track: {
          ai:             '#2D5A8E',
          'ai-light':     '#D6E8F7',
          ds:             '#6B3D9A',
          'ds-light':     '#EDD9FF',
          career:         '#C65200',
          'career-light': '#FFE4CC',
        },

        // Tier / Plan Colors
        tier: {
          free:        '#7A7168',
          'free-light':  '#EDE8DF',
          pro:         '#F5A623',
          'pro-light':   '#FDF3E0',
          'pro-dark':    '#7A4D00',
        },
      },
      fontFamily: {
        sans:  ['DM Sans', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-subtle': 'var(--gradient-subtle)',
      },
      boxShadow: {
        'elegant': 'var(--shadow-elegant)',
        'glow': 'var(--shadow-glow)',
        'card': 'var(--shadow-card)',
      },
      transitionProperty: {
        'smooth': 'var(--transition-smooth)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "gradient-shift": {
          "0%, 100%": {
            backgroundPosition: "0% 50%",
          },
          "50%": {
            backgroundPosition: "100% 50%",
          },
        },
        "typing": {
          "0%": {
            width: "0",
            opacity: "1",
          },
          "50%": {
            width: "100%",
            opacity: "1",
          },
          "70%": {
            width: "100%",
            opacity: "1",
          },
          "85%": {
            width: "100%",
            opacity: "0",
          },
          "100%": {
            width: "0",
            opacity: "0",
          },
        },
        "typing-dot": {
          "0%, 60%, 100%": {
            opacity: "0.3",
            transform: "scale(0.8)",
          },
          "30%": {
            opacity: "1",
            transform: "scale(1)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "gradient-shift": "gradient-shift 3s ease-in-out infinite",
        "typing": "typing 4s steps(30) infinite",
        "typing-1": "typing-dot 1.4s ease-in-out infinite",
        "typing-2": "typing-dot 1.4s ease-in-out 0.2s infinite",
        "typing-3": "typing-dot 1.4s ease-in-out 0.4s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
