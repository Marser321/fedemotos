import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                fede: {
                    black: "#121212",
                    card: "#18181b",
                    "card-hover": "#27272a",
                    accent: "#AC1C1D",
                    "accent-glow": "#E13232",
                    "accent-dark": "#7F1415",
                    muted: "#a1a1aa",
                    border: "rgba(255, 255, 255, 0.1)",
                },
            },
            fontFamily: {
                poppins: ["var(--font-poppins)", "sans-serif"],
            },
            animation: {
                "pulse-emergency": "pulseEmergency 2s ease-in-out infinite",
                "glow": "glow 2s ease-in-out infinite alternate",
                "slide-up": "slideUp 0.5s ease-out",
                "fade-in": "fadeIn 0.6s ease-out",
            },
            keyframes: {
                pulseEmergency: {
                    "0%, 100%": {
                        transform: "scale(1)",
                        boxShadow: "0 0 0 0 rgba(172, 28, 29, 0.7)",
                    },
                    "50%": {
                        transform: "scale(1.05)",
                        boxShadow: "0 0 0 20px rgba(172, 28, 29, 0)",
                    },
                },
                glow: {
                    "0%": { boxShadow: "0 0 20px rgba(172, 28, 29, 0.32)" },
                    "100%": { boxShadow: "0 0 40px rgba(172, 28, 29, 0.58)" },
                },
                slideUp: {
                    "0%": { transform: "translateY(20px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
            },
        },
    },
    plugins: [],
};

export default config;
