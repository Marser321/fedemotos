"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, Calendar, CheckCircle, ChevronDown, Loader2, MessageCircle } from "lucide-react";

const marcas = [
    "Honda",
    "Yamaha",
    "Zanella",
    "Motomel",
    "Suzuki",
    "Kawasaki",
    "Bajaj",
    "Corven",
    "Gilera",
    "Otra",
];

const horariosDisponibles = [
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
];

interface FormData {
    nombre: string;
    telefono: string;
    marca: string;
    modelo: string;
    kilometraje: string;
    fecha: string;
    horario: string;
    notas: string;
}

export default function AgendarPage() {
    const supportWhatsapp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER || "59899123456";
    const [formData, setFormData] = useState<FormData>({
        nombre: "",
        telefono: "",
        marca: "",
        modelo: "",
        kilometraje: "",
        fecha: "",
        horario: "",
        notas: "",
    });
    const [enviado, setEnviado] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (field: keyof FormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCargando(true);
        setError("");

        try {
            const response = await fetch("/api/turnos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (!response.ok || data?.ok === false) {
                throw new Error(data?.error?.message || "No se pudo reservar el turno");
            }

            setEnviado(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudo reservar el turno");
        } finally {
            setCargando(false);
        }
    };

    // Genera URL de WhatsApp con datos del turno
    const generarWhatsAppUrl = () => {
        const fechaFormateada = formData.fecha
            ? new Date(formData.fecha + "T12:00:00").toLocaleDateString("es-UY", {
                weekday: "long",
                day: "numeric",
                month: "long",
            })
            : "";
        const mensaje = encodeURIComponent(
            `Hola Fede Motos 🏍️\n\nReservé un turno desde la app:\n\n` +
            `👤 ${formData.nombre}\n` +
            `📱 ${formData.telefono}\n` +
            `🏍️ ${formData.marca} ${formData.modelo}\n` +
            `📏 ${Number(formData.kilometraje).toLocaleString()} km\n` +
            `📅 ${fechaFormateada} a las ${formData.horario} hs\n` +
            (formData.notas ? `📝 ${formData.notas}\n` : "") +
            `\n¡Espero confirmación!`
        );
        return `https://wa.me/${supportWhatsapp}?text=${mensaje}`;
    };

    // Fecha mínima: mañana
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split("T")[0];

    return (
        <div className="min-h-screen pb-20 md:pb-0">
            {/* Header */}
            <section className="relative px-4 pt-12 pb-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.06),transparent_50%)]" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 max-w-lg mx-auto text-center"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-fede-accent/10 border border-fede-accent/20 text-fede-accent text-xs font-medium mb-4">
                        <Calendar className="w-3.5 h-3.5" />
                        Reservá tu turno
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                        Agendá tu <span className="text-fede-accent">Service</span>
                    </h1>
                    <p className="text-fede-muted text-sm">
                        Completá el formulario y te confirmamos tu turno por WhatsApp
                    </p>
                </motion.div>
            </section>

            {/* Formulario / Confirmación */}
            <section className="px-4 pb-12 max-w-lg mx-auto">
                <AnimatePresence mode="wait">
                    {!enviado ? (
                        <motion.form
                            key="form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            onSubmit={handleSubmit}
                            className="glass-card p-6 space-y-5"
                        >
                            {/* Nombre */}
                            <div>
                                <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                                    Tu nombre
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Juan Pérez"
                                    value={formData.nombre}
                                    onChange={(e) => handleChange("nombre", e.target.value)}
                                    className="input-dark"
                                />
                            </div>

                            {/* Teléfono */}
                            <div>
                                <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                                    Teléfono / WhatsApp
                                </label>
                                <input
                                    type="tel"
                                    required
                                    placeholder="099 123 456"
                                    value={formData.telefono}
                                    onChange={(e) => handleChange("telefono", e.target.value)}
                                    className="input-dark"
                                />
                            </div>

                            {/* Marca y Modelo */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                                        Marca
                                    </label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={formData.marca}
                                            onChange={(e) => handleChange("marca", e.target.value)}
                                            className="input-dark appearance-none pr-8"
                                        >
                                            <option value="">Seleccioná</option>
                                            {marcas.map((m) => (
                                                <option key={m} value={m}>
                                                    {m}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fede-muted pointer-events-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                                        Modelo
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="CG 150 Titan"
                                        value={formData.modelo}
                                        onChange={(e) => handleChange("modelo", e.target.value)}
                                        className="input-dark"
                                    />
                                </div>
                            </div>

                            {/* Kilometraje */}
                            <div>
                                <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                                    Kilometraje actual
                                </label>
                                <input
                                    type="number"
                                    required
                                    placeholder="Ej: 12500"
                                    value={formData.kilometraje}
                                    onChange={(e) => handleChange("kilometraje", e.target.value)}
                                    className="input-dark"
                                />
                            </div>

                            {/* Fecha y Horario */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                                        Fecha
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        min={minDate}
                                        value={formData.fecha}
                                        onChange={(e) => handleChange("fecha", e.target.value)}
                                        className="input-dark"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                                        Horario
                                    </label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={formData.horario}
                                            onChange={(e) => handleChange("horario", e.target.value)}
                                            className="input-dark appearance-none pr-8"
                                        >
                                            <option value="">Elegí hora</option>
                                            {horariosDisponibles.map((h) => (
                                                <option key={h} value={h}>
                                                    {h}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fede-muted pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Notas */}
                            <div>
                                <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                                    Notas adicionales (opcional)
                                </label>
                                <textarea
                                    placeholder="Ej: Hace un ruido raro al frenar..."
                                    rows={3}
                                    value={formData.notas}
                                    onChange={(e) => handleChange("notas", e.target.value)}
                                    className="input-dark resize-none"
                                />
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={cargando}
                                className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {cargando ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Reservando...
                                    </>
                                ) : (
                                    <>
                                        <Wrench className="w-5 h-5" />
                                        Reservar Turno
                                    </>
                                )}
                            </button>

                            {error && (
                                <p className="text-sm rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300">
                                    {error}
                                </p>
                            )}
                        </motion.form>
                    ) : (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-card p-8 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: 0.2 }}
                            >
                                <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
                            </motion.div>

                            <h2 className="text-2xl font-bold mb-2">¡Turno Reservado!</h2>
                            <p className="text-fede-muted text-sm mb-6">
                                Te confirmamos por WhatsApp al{" "}
                                <span className="text-white font-medium">{formData.telefono}</span>
                            </p>

                            <div className="glass-card p-4 text-left space-y-2 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-fede-muted">Moto</span>
                                    <span className="font-medium">{formData.marca} {formData.modelo}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-fede-muted">Kilometraje</span>
                                    <span className="font-medium">{Number(formData.kilometraje).toLocaleString()} km</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-fede-muted">Fecha</span>
                                    <span className="font-medium">
                                        {new Date(formData.fecha + "T12:00:00").toLocaleDateString("es-UY", {
                                            weekday: "long",
                                            day: "numeric",
                                            month: "long",
                                        })}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-fede-muted">Horario</span>
                                    <span className="font-medium">{formData.horario} hs</span>
                                </div>
                            </div>

                            {/* Botón WhatsApp para confirmar */}
                            <a
                                href={generarWhatsAppUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 mb-4"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Confirmar por WhatsApp
                            </a>

                            <button
                                onClick={() => {
                                    setEnviado(false);
                                    setFormData({
                                        nombre: "",
                                        telefono: "",
                                        marca: "",
                                        modelo: "",
                                        kilometraje: "",
                                        fecha: "",
                                        horario: "",
                                        notas: "",
                                    });
                                }}
                                className="btn-outline text-sm"
                            >
                                Reservar otro turno
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>
        </div>
    );
}
