"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    User,
    Shield,
    AlertTriangle,
    Wrench,
    LogOut,
    Loader2,
    Phone,
    Gift,
    Clock,
    ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface Sesion {
    role: string;
    telefono?: string;
    sub?: string;
}

interface MisDatos {
    nombre: string;
    telefono: string;
    moto: string;
    plan: string;
    estado: string;
    cuposRestantes: number;
    fechaInicio: string;
}

// Promociones hardcodeadas (se podrían traer de la BD en el futuro)
const promociones = [
    {
        titulo: "10% OFF en Service Completo",
        descripcion: "Válido para miembros activos hasta fin de mes",
        icono: Wrench,
        color: "text-green-400",
        bg: "bg-green-500/10",
    },
    {
        titulo: "Diagnóstico Electrónico GRATIS",
        descripcion: "En tu próximo service de más de $3.000",
        icono: Gift,
        color: "text-blue-400",
        bg: "bg-blue-500/10",
    },
    {
        titulo: "Referí un amigo → 1 auxilio extra",
        descripcion: "Cada amigo que se suscribe te suma 1 cupo",
        icono: User,
        color: "text-purple-400",
        bg: "bg-purple-500/10",
    },
];

export default function MiCuentaPage() {
    const router = useRouter();
    const supportWhatsapp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER || "59899123456";
    const [sesion, setSesion] = useState<Sesion | null>(null);
    const [datos, setDatos] = useState<MisDatos | null>(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [sessionRes, cuentaRes] = await Promise.all([
                    fetch("/api/auth/sesion"),
                    fetch("/api/cliente/me"),
                ]);

                const sessionData = await sessionRes.json();
                if (!sessionData.authenticated || sessionData.role !== "cliente") {
                    router.push("/login");
                    return;
                }

                if (!cuentaRes.ok) {
                    const err = await cuentaRes.json();
                    throw new Error(err?.error?.message || "No se pudo cargar tu cuenta");
                }

                const cuentaData = await cuentaRes.json();
                setSesion(sessionData);
                setDatos(cuentaData.data);
            } catch {
                router.push("/login");
            } finally {
                setCargando(false);
            }
        };

        loadData();
    }, [router]);

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    if (cargando) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-fede-accent" />
            </div>
        );
    }

    if (!datos || !sesion) return null;

    return (
        <div className="min-h-screen pb-20 md:pb-0">
            {/* Header */}
            <section className="relative px-4 pt-12 pb-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.08),transparent_50%)]" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 max-w-lg mx-auto"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-fede-accent/15 border border-fede-accent/30 flex items-center justify-center">
                                <User className="w-6 h-6 text-fede-accent" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold">Hola, {datos.nombre.split(" ")[0]}</h1>
                                <p className="text-fede-muted text-xs flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {datos.telefono}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg hover:bg-white/5 text-fede-muted hover:text-white transition-colors"
                            title="Cerrar sesión"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
            </section>

            <div className="px-4 max-w-lg mx-auto space-y-4">
                {/* Estado de Membresía */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-5 border-fede-accent/20"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-fede-accent" />
                            <h2 className="font-bold text-sm">Membresía Auxilio</h2>
                        </div>
                        <span className={datos.estado === "activo" ? "badge-active" : datos.estado === "pendiente" ? "badge-pending" : "badge-inactive"}>
                            {datos.estado.toUpperCase()}
                        </span>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-fede-muted">Plan</span>
                            <span className="font-medium capitalize">{datos.plan}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-fede-muted">Moto</span>
                            <span className="font-medium">{datos.moto}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-fede-muted">Miembro desde</span>
                            <span className="font-medium">
                                {new Date(datos.fechaInicio + "T12:00:00").toLocaleDateString("es-UY", {
                                    month: "long",
                                    year: "numeric",
                                })}
                            </span>
                        </div>

                        {/* Cupos de auxilio */}
                        <div className="pt-3 mt-3 border-t border-fede-border/50">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-fede-muted">Auxilios disponibles</span>
                                <span className="text-lg font-bold text-white">
                                    {datos.cuposRestantes} <span className="text-fede-muted text-sm font-normal">/ 3</span>
                                </span>
                            </div>
                            <div className="w-full bg-fede-card rounded-full h-2.5 border border-fede-border/50">
                                <div
                                    className="bg-gradient-to-r from-fede-accent to-red-400 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${(datos.cuposRestantes / 3) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Acciones rápidas */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-2 gap-3"
                >
                    <Link href="/" className="glass-card p-4 flex flex-col items-center gap-2 hover:border-fede-accent/30 transition-colors group">
                        <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center group-hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all">
                            <AlertTriangle className="w-5 h-5 text-fede-accent" />
                        </div>
                        <span className="text-xs font-medium text-center">Pedir Auxilio</span>
                    </Link>
                    <Link href="/agendar" className="glass-card p-4 flex flex-col items-center gap-2 hover:border-fede-accent/30 transition-colors group">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all">
                            <Clock className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-xs font-medium text-center">Agendar Service</span>
                    </Link>
                </motion.div>

                {/* Promociones */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                        <Gift className="w-4 h-4 text-fede-accent" />
                        Promociones para vos
                    </h3>
                    <div className="space-y-3">
                        {promociones.map((promo, i) => {
                            const Icon = promo.icono;
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 + i * 0.1 }}
                                    className="glass-card p-4 flex items-center gap-4 group hover:border-fede-border/80 transition-colors"
                                >
                                    <div className={`w-10 h-10 rounded-xl ${promo.bg} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className={`w-5 h-5 ${promo.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{promo.titulo}</p>
                                        <p className="text-xs text-fede-muted mt-0.5">{promo.descripcion}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-fede-muted flex-shrink-0 group-hover:text-white transition-colors" />
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Soporte WhatsApp */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="pt-4"
                >
                    <a
                        href={`https://wa.me/${supportWhatsapp}?text=${encodeURIComponent(`Hola Fede Motos, soy ${datos.nombre} (${datos.telefono}). Necesito ayuda con mi cuenta.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline w-full text-sm flex items-center justify-center gap-2"
                    >
                        <Phone className="w-4 h-4" />
                        Contactar Soporte
                    </a>
                </motion.div>
            </div>
        </div>
    );
}
