"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    AlertTriangle,
    Wrench,
    Shield,
    LayoutDashboard,
    Menu,
    X,
    User,
    LogIn,
    LogOut,
} from "lucide-react";

const navItems = [
    { href: "/", label: "Auxilio", icon: AlertTriangle },
    { href: "/suscripcion", label: "Membresía", icon: Shield },
    { href: "/agendar", label: "Service", icon: Wrench },
];

interface Sesion {
    authenticated: boolean;
    role?: "cliente" | "admin";
}

export function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [sesion, setSesion] = useState<Sesion>({ authenticated: false });

    useEffect(() => {
        let active = true;
        fetch("/api/auth/sesion")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (active && data) setSesion(data);
            })
            // Error de red transitorio: mantener el estado actual en vez de forzar
            // "no autenticado", para no ocultar una sesión válida por un blip de red.
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [pathname]); // Re-check on navigation

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        setSesion({ authenticated: false });
        router.push("/");
    };

    // Links dinámicos según sesión
    const allNavItems = [
        ...navItems,
        ...(sesion.authenticated && sesion.role === "admin"
            ? [{ href: "/admin", label: "Admin", icon: LayoutDashboard }]
            : []),
    ];

    // Link de cuenta según sesión
    const cuentaLink = sesion.authenticated
        ? sesion.role === "admin"
            ? { href: "/admin", label: "Panel", icon: LayoutDashboard }
            : { href: "/mi-cuenta", label: "Mi Cuenta", icon: User }
        : { href: "/login", label: "Entrar", icon: LogIn };

    return (
        <>
            {/* Header fijo */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-fede-black/90 backdrop-blur-xl border-b border-fede-border">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-9 h-9 rounded-lg bg-white/5 border border-fede-border flex items-center justify-center overflow-hidden group-hover:shadow-[0_0_20px_rgba(172,28,29,0.35)] transition-all duration-300">
                            <Image
                                src="/branding/logo-rayo.png"
                                alt="Fede Motos"
                                width={28}
                                height={28}
                                className="object-contain"
                            />
                        </div>
                        <span className="font-poppins font-bold text-lg text-white tracking-tight">
                            Fede <span className="text-fede-accent">Motos</span>
                        </span>
                    </Link>

                    {/* Nav desktop */}
                    <nav className="hidden md:flex items-center gap-1">
                        {allNavItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${isActive
                                        ? "bg-fede-accent/15 text-fede-accent"
                                        : "text-fede-muted hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </Link>
                            );
                        })}

                        {/* Separador */}
                        <div className="w-px h-6 bg-fede-border mx-2" />

                        {/* Botón cuenta */}
                        {sesion.authenticated ? (
                            <div className="flex items-center gap-1">
                                <Link
                                    href={cuentaLink.href}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${pathname === cuentaLink.href
                                        ? "bg-fede-accent/15 text-fede-accent"
                                        : "text-fede-muted hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    <cuentaLink.icon className="w-4 h-4" />
                                    {cuentaLink.label}
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 rounded-lg text-fede-muted hover:text-red-300 hover:bg-red-500/10 transition-all"
                                    title="Cerrar sesión"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="flex items-center gap-2 btn-primary text-sm py-2 px-4"
                            >
                                <LogIn className="w-4 h-4" />
                                Entrar
                            </Link>
                        )}
                    </nav>

                    {/* Hamburger mobile */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden p-2 text-fede-muted hover:text-white transition-colors"
                        aria-label="Abrir menú"
                    >
                        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </header>

            {/* Menú mobile */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="fixed top-16 left-0 right-0 z-40 bg-fede-black/95 backdrop-blur-xl border-b border-fede-border md:hidden"
                    >
                        <nav className="flex flex-col p-4 gap-1">
                            {allNavItems.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 ${isActive
                                            ? "bg-fede-accent/15 text-fede-accent"
                                            : "text-fede-muted hover:text-white hover:bg-white/5"
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {item.label}
                                    </Link>
                                );
                            })}

                            {/* Separador */}
                            <div className="h-px bg-fede-border my-2" />

                            {sesion.authenticated ? (
                                <>
                                    <Link
                                        href={cuentaLink.href}
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-fede-muted hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        <cuentaLink.icon className="w-5 h-5" />
                                        {cuentaLink.label}
                                    </Link>
                                    <button
                                        onClick={() => { handleLogout(); setIsOpen(false); }}
                                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-red-300 hover:bg-red-500/10 transition-all"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        Cerrar Sesión
                                    </button>
                                </>
                            ) : (
                                <Link
                                    href="/login"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-fede-accent hover:bg-fede-accent/10 transition-all"
                                >
                                    <LogIn className="w-5 h-5" />
                                    Iniciar Sesión
                                </Link>
                            )}
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom nav mobile */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-fede-black/95 backdrop-blur-xl border-t border-fede-border md:hidden">
                <div className="flex items-center justify-around h-16">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-300 ${isActive
                                    ? "text-fede-accent"
                                    : "text-fede-muted hover:text-white"
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_8px_rgba(172,28,29,0.6)]" : ""}`} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                    {/* Botón Mi Cuenta / Entrar en bottom nav */}
                    <Link
                        href={cuentaLink.href}
                        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-300 ${pathname === cuentaLink.href
                            ? "text-fede-accent"
                            : "text-fede-muted hover:text-white"
                            }`}
                    >
                        <cuentaLink.icon className={`w-5 h-5 ${pathname === cuentaLink.href ? "drop-shadow-[0_0_8px_rgba(172,28,29,0.6)]" : ""}`} />
                        <span className="text-[10px] font-medium">
                            {sesion.authenticated ? (sesion.role === "admin" ? "Admin" : "Cuenta") : "Entrar"}
                        </span>
                    </Link>
                </div>
            </nav>
        </>
    );
}
