/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
        // Colores específicos para la app
        parking: {
          street: "#3b82f6", // blue-500
          garage: "#6366f1", // indigo-500
          lot: "#8b5cf6", // violet-500
          other: "#06b6d4", // cyan-500
        },
        timer: {
          active: "#22c55e", // green-500
          warning: "#eab308", // yellow-500
          expired: "#ef4444", // red-500
        },
        location: {
          primary: "#667eea",
          secondary: "#764ba2",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // AÑADIDO: Z-INDEX para componentes
      zIndex: {
        map: "1",
        "map-controls": "10",
        dropdown: "1000",
        "modal-overlay": "5000",
        modal: "5001",
        notification: "9000",
        emergency: "10000",
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
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-gentle": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.02)" },
        },
        "bounce-gentle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        // AÑADIDO: Animaciones específicas para modales
        "modal-overlay-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "modal-content-in": {
          "0%": { opacity: "0", transform: "translate(-50%, -50%) scale(0.95)" },
          "100%": { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "pulse-gentle": "pulse-gentle 3s infinite",
        "bounce-gentle": "bounce-gentle 2s infinite",
        shimmer: "shimmer 2s infinite",
        // AÑADIDO: Animaciones para modales
        "modal-overlay-in": "modal-overlay-in 0.2s ease-out",
        "modal-content-in": "modal-content-in 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
      },
      boxShadow: {
        custom: "0 2px 8px rgba(0, 0, 0, 0.05)",
        "custom-hover": "0 4px 12px rgba(0, 0, 0, 0.1)",
        "custom-focus": "0 0 0 3px rgba(102, 126, 234, 0.1)",
        // AÑADIDO: Sombras para modales por encima del mapa
        modal: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        "modal-strong": "0 35px 60px -12px rgba(0, 0, 0, 0.4)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
