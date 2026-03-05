"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, MapPin, CheckCircle, Loader2, Phone } from "lucide-react";
import { getCurrentPosition, type GeoPosition } from "@/lib/geolocation";

type EmergencyState = "idle" | "requesting" | "located" | "sent" | "error";

interface EmergencyButtonProps {
    onLocationCapture?: (position: GeoPosition) => void;
}

export function EmergencyButton({ onLocationCapture }: EmergencyButtonProps) {
    const supportWhatsapp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER || "59899123456";
    const [state, setState] = useState<EmergencyState>("idle");
    const [position, setPosition] = useState<GeoPosition | null>(null);
    const [error, setError] = useState<string>("");

    const handleEmergency = useCallback(async () => {
        if (state === "sent") return;

        setState("requesting");
        setError("");

        try {
            const pos = await getCurrentPosition();
            setPosition(pos);
            setState("located");
            onLocationCapture?.(pos);

            const response = await fetch("/api/auxilios", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lat: pos.lat, lng: pos.lng }),
            });
            const data = await response.json();
            if (!response.ok || data?.ok === false) {
                throw new Error(data?.error?.message || "No se pudo enviar la solicitud de auxilio");
            }

            setState("sent");
        } catch (err) {
            setState("error");
            setError(err instanceof Error ? err.message : "Error desconocido");
        }
    }, [state, onLocationCapture]);

    const resetState = () => {
        setState("idle");
        setPosition(null);
        setError("");
    };

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Botón principal */}
            <motion.button
                onClick={state === "error" || state === "sent" ? resetState : handleEmergency}
                disabled={state === "requesting" || state === "located"}
                whileTap={{ scale: 0.95 }}
                className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-full flex items-center justify-center transition-all duration-500 ${state === "idle"
                    ? "bg-gradient-to-br from-fede-accent to-fede-accent-dark animate-pulse-emergency cursor-pointer hover:shadow-[0_0_60px_rgba(239,68,68,0.5)]"
                    : state === "requesting"
                        ? "bg-gradient-to-br from-yellow-600 to-yellow-800 cursor-wait"
                        : state === "located"
                            ? "bg-gradient-to-br from-blue-600 to-blue-800"
                            : state === "sent"
                                ? "bg-gradient-to-br from-green-600 to-green-800 cursor-pointer"
                                : "bg-gradient-to-br from-red-900 to-red-950 cursor-pointer"
                    }`}
            >
                {/* Anillos de pulso */}
                {state === "idle" && (
                    <>
                        <span className="absolute inset-0 rounded-full animate-ping bg-fede-accent/20" />
                        <span className="absolute inset-[-8px] rounded-full border-2 border-fede-accent/30 animate-pulse" />
                        <span className="absolute inset-[-16px] rounded-full border border-fede-accent/15 animate-pulse" style={{ animationDelay: "0.5s" }} />
                    </>
                )}

                {/* Icono central */}
                <div className="relative z-10 flex flex-col items-center gap-2">
                    {state === "idle" && (
                        <>
                            <AlertTriangle className="w-16 h-16 sm:w-20 sm:h-20 text-white drop-shadow-lg" />
                            <span className="text-white font-bold text-sm sm:text-base tracking-wider uppercase">
                                Auxilio
                            </span>
                        </>
                    )}

                    {state === "requesting" && (
                        <>
                            <Loader2 className="w-16 h-16 sm:w-20 sm:h-20 text-white animate-spin" />
                            <span className="text-white font-medium text-sm">
                                Localizando...
                            </span>
                        </>
                    )}

                    {state === "located" && (
                        <>
                            <MapPin className="w-16 h-16 sm:w-20 sm:h-20 text-white" />
                            <span className="text-white font-medium text-sm">
                                Enviando...
                            </span>
                        </>
                    )}

                    {state === "sent" && (
                        <>
                            <CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 text-white" />
                            <span className="text-white font-bold text-sm text-center leading-tight">
                                ¡Auxilio<br />en camino!
                            </span>
                        </>
                    )}

                    {state === "error" && (
                        <>
                            <AlertTriangle className="w-16 h-16 sm:w-20 sm:h-20 text-white" />
                            <span className="text-white font-medium text-xs text-center">
                                Reintentar
                            </span>
                        </>
                    )}
                </div>
            </motion.button>

            {/* Mensajes de estado */}
            <AnimatePresence mode="wait">
                {state === "idle" && (
                    <motion.p
                        key="idle"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-fede-muted text-sm text-center max-w-xs"
                    >
                        Tocá el botón para enviar tu ubicación y solicitar un auxilio inmediato
                    </motion.p>
                )}

                {position && state !== "idle" && (
                    <motion.div
                        key="position"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="glass-card px-4 py-3 flex items-center gap-3"
                    >
                        <MapPin className="w-4 h-4 text-fede-accent flex-shrink-0" />
                        <div>
                            <p className="text-xs text-fede-muted">Ubicación capturada</p>
                            <p className="text-sm font-mono text-white">
                                {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                            </p>
                        </div>
                    </motion.div>
                )}

                {state === "sent" && (
                    <motion.div
                        key="sent"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-3"
                    >
                        <p className="text-green-400 font-medium text-center">
                            Tu ubicación fue enviada al taller. <br />
                            Estamos yendo a buscarte.
                        </p>
                        <a
                            href={`tel:+${supportWhatsapp.replace(/\D/g, "")}`}
                            className="btn-outline flex items-center gap-2 text-sm"
                        >
                            <Phone className="w-4 h-4" />
                            Llamar al taller
                        </a>
                    </motion.div>
                )}

                {state === "error" && (
                    <motion.p
                        key="error"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-sm text-center max-w-xs"
                    >
                        {error}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}
