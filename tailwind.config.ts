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
                    black: "#0a0a0a",
                    card: "#141414",
                    "card-hover": "#1a1a1a",
                    accent: "#ef4444",
                    "accent-glow": "#dc2626",
                    "accent-dark": "#991b1b",
                    muted: "#a3a3a3",
                    border: "#262626",
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
                        boxShadow: "0 0 0 0 rgba(239, 68, 68, 0.7)",
                    },
                    "50%": {
                        transform: "scale(1.05)",
                        boxShadow: "0 0 0 20px rgba(239, 68, 68, 0)",
                    },
                },
                glow: {
                    "0%": { boxShadow: "0 0 20px rgba(239, 68, 68, 0.3)" },
                    "100%": { boxShadow: "0 0 40px rgba(239, 68, 68, 0.6)" },
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
