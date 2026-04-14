/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Override neutral colors to use our theme variables
        neutral: {
          50: 'var(--color-neutral-50, oklch(98.4% 0.004 247))',
          100: 'var(--color-neutral-100, oklch(96.8% 0.006 247))',
          200: 'var(--color-neutral-200, oklch(93.8% 0.012 251))',
          300: 'var(--color-neutral-300, oklch(88.1% 0.017 252))',
          400: 'var(--color-neutral-400, oklch(80.6% 0.019 252))',
          500: 'var(--color-neutral-500, oklch(63.5% 0.02 255))',
          600: 'var(--color-neutral-600, oklch(50.2% 0.021 257))',
          700: 'var(--color-neutral-700, oklch(38.6% 0.021 257))',
          800: 'var(--color-neutral-800, oklch(28.7% 0.019 257))',
          900: 'var(--color-neutral-900, oklch(20.8% 0.014 257))',
          950: 'var(--color-neutral-950, oklch(15% 0.01 257))',
        },
        // Override gray colors to use our theme variables
        gray: {
          50: 'var(--color-gray-50, oklch(98.4% 0.004 247))',
          100: 'var(--color-gray-100, oklch(96.8% 0.006 247))',
          200: 'var(--color-gray-200, oklch(93.8% 0.012 251))',
          300: 'var(--color-gray-300, oklch(88.1% 0.017 252))',
          400: 'var(--color-gray-400, oklch(80.6% 0.019 252))',
          500: 'var(--color-gray-500, oklch(63.5% 0.02 255))',
          600: 'var(--color-gray-600, oklch(50.2% 0.021 257))',
          700: 'var(--color-gray-700, oklch(38.6% 0.021 257))',
          800: 'var(--color-gray-800, oklch(28.7% 0.019 257))',
          900: 'var(--color-gray-900, oklch(20.8% 0.014 257))',
          950: 'var(--color-gray-950, oklch(15% 0.01 257))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}

export default config