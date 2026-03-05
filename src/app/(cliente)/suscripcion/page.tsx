"use client";

import { motion } from "framer-motion";
import {
    Shield,
    Check,
    AlertTriangle,
    Wrench,
    Phone,
    Star,
    ArrowRight,
} from "lucide-react";
import Link from "next/link";

const painPoints = [
    {
        dolor: "Quedarte varado a las 11 de la noche sin un peso para la grúa",
        solucion: "Tocás un botón y te buscamos. Sin cobro extra.",
    },
    {
        dolor: "Pagar $4,000 de imprevisto por un remolque de emergencia",
        solucion: "Cuota mensual fija. Sin sorpresas en tu bolsillo.",
    },
    {
        dolor: "Llevar la moto a un mecánico desconocido que te cobra de más",
        solucion: "La traemos directo a nuestro taller. Confianza garantizada.",
    },
];

const beneficios = [
    "3 auxilios mecánicos o traslados por mes",
    "Respuesta en menos de 30 minutos",
    "Sin costo adicional por el rescate",
    "Diagnóstico gratuito al llegar al taller",
    "Recordatorios de mantenimiento preventivo",
    "Atención prioritaria en reparaciones",
];

export default function SuscripcionPage() {
    const supportWhatsapp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER || "59899123456";
    return (
        <div className="min-h-screen pb-20 md:pb-0">
            {/* Hero */}
            <section className="relative px-4 pt-12 pb-16 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.12),transparent_50%)]" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative z-10 max-w-2xl mx-auto text-center"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-fede-accent/10 border border-fede-accent/20 text-fede-accent text-xs font-medium mb-6">
                        <Shield className="w-3.5 h-3.5" />
                        Membresía de Asistencia Vial
                    </div>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
                        ¿Quedaste varado <br />
                        <span className="text-fede-accent">sin plata para la grúa?</span>
                    </h1>

                    <p className="text-fede-muted text-base sm:text-lg max-w-lg mx-auto mb-8">
                        La rotura de la moto nunca avisa y siempre cae en el peor momento del mes.
                        Con nuestra membresía, te buscamos sin costo extra.
                    </p>
                </motion.div>
            </section>

            {/* Tabla de dolor vs solución */}
            <section className="px-4 pb-12 max-w-2xl mx-auto">
                <motion.h2
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-xl font-bold text-center mb-6"
                >
                    Dejá de <span className="text-fede-accent">sufrir</span> cada vez que se te rompe la moto
                </motion.h2>

                <div className="space-y-4">
                    {painPoints.map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.15 }}
                            className="glass-card p-4"
                        >
                            <div className="flex items-start gap-3 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                </div>
                                <p className="text-sm text-fede-muted leading-relaxed">
                                    {item.dolor}
                                </p>
                            </div>
                            <div className="flex items-start gap-3 pl-0 sm:pl-11">
                                <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0 mt-0.5 sm:hidden">
                                    <Check className="w-4 h-4 text-green-400" />
                                </div>
                                <p className="text-sm text-green-400 font-medium leading-relaxed">
                                    → {item.solucion}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Card principal del plan */}
            <section className="px-4 pb-12 max-w-lg mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative glass-card p-6 sm:p-8 border-fede-accent/30"
                >
                    {/* Etiqueta popular */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-fede-accent rounded-full text-xs font-bold text-white flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        MÁS ELEGIDO
                    </div>

                    <div className="text-center mb-6 pt-2">
                        <h3 className="text-lg font-bold mb-1">Membresía Auxilio</h3>
                        <p className="text-fede-muted text-sm">Todo lo que necesitás por una cuota fija</p>
                    </div>

                    <div className="text-center mb-6">
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-fede-muted text-lg">$</span>
                            <span className="text-5xl sm:text-6xl font-bold text-white">990</span>
                            <span className="text-fede-muted text-sm">/mes</span>
                        </div>
                        <p className="text-fede-muted text-xs mt-2">
                            Menos de lo que cuesta UN remolque
                        </p>
                    </div>

                    {/* Lista de beneficios */}
                    <ul className="space-y-3 mb-8">
                        {beneficios.map((beneficio, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-fede-accent flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-white/90">{beneficio}</span>
                            </li>
                        ))}
                    </ul>

                    {/* CTA */}
                    <a
                        href={`https://wa.me/${supportWhatsapp}?text=Hola%20Fede%20Motos%20%F0%9F%8F%8D%EF%B8%8F%0A%0AQuiero%20suscribirme%20a%20la%20Membres%C3%ADa%20Auxilio%20de%20%24990%2Fmes.%20%C2%BFC%C3%B3mo%20hago%3F`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary w-full text-center py-4 text-base flex items-center justify-center gap-2"
                    >
                        Suscribirme Ahora
                        <ArrowRight className="w-5 h-5" />
                    </a>

                    <p className="text-center text-fede-muted text-xs mt-4">
                        Pagá con Mercado Pago • Cancelá cuando quieras
                    </p>
                </motion.div>
            </section>

            {/* Sección de confianza */}
            <section className="px-4 pb-12 max-w-2xl mx-auto">
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="glass-card p-6 text-center"
                >
                    <Wrench className="w-10 h-10 text-fede-accent mx-auto mb-4" />
                    <h3 className="font-bold text-lg mb-2">
                        No solo te rescatamos — te cuidamos la moto
                    </h3>
                    <p className="text-fede-muted text-sm max-w-md mx-auto mb-4">
                        Al ser miembro, tu moto siempre vuelve a nuestro taller de confianza.
                        Nada de mecánicos desconocidos. Transparencia total en cada reparación.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                        <Link href="/" className="btn-outline text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Solicitar Auxilio
                        </Link>
                        <Link href="/agendar" className="btn-outline text-sm flex items-center gap-2">
                            <Wrench className="w-4 h-4" />
                            Agendar Service
                        </Link>
                    </div>
                </motion.div>
            </section>

            {/* Contacto directo */}
            <section className="px-4 pb-16 max-w-2xl mx-auto text-center">
                <p className="text-fede-muted text-sm mb-3">
                    ¿Tenés dudas? Hablá directo con nosotros
                </p>
                <a
                    href={`https://wa.me/${supportWhatsapp}?text=Hola%20Fede%20Motos%2C%20quiero%20info%20de%20la%20membres%C3%ADa`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 btn-primary text-sm"
                >
                    <Phone className="w-4 h-4" />
                    Escribinos por WhatsApp
                </a>
            </section>
        </div>
    );
}
