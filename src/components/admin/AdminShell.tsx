"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  Home,
  LogOut,
  Menu,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/admin", label: "Día", icon: Home },
  { href: "/admin/operaciones", label: "Operaciones", icon: AlertTriangle },
  { href: "/admin/ordenes", label: "Órdenes", icon: ClipboardList },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/admin/membresias", label: "Membresías", icon: Users },
  { href: "/admin/comunicaciones", label: "Comunicaciones", icon: Bell },
  { href: "/admin/servicios", label: "Servicios", icon: Wrench },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login?mode=admin");
  };

  return (
    <div className="min-h-screen bg-fede-black text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-fede-border bg-zinc-950/95 px-3 py-4 shadow-[18px_0_60px_rgba(0,0,0,0.22)] backdrop-blur-xl lg:block">
        <Link href="/admin" className="mb-6 flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03]">
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-fede-accent/25 bg-fede-accent/10 shadow-[0_0_28px_rgba(172,28,29,0.18)]">
            <Image src="/branding/logo-rayo.png" alt="Fede Moto Servicios" width={28} height={28} className="object-contain" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Fede Moto</span>
            <span className="block text-[11px] uppercase tracking-[0.16em] text-fede-muted">Sistema operativo</span>
          </span>
        </Link>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-fede-accent/15 text-white shadow-[0_0_18px_rgba(172,28,29,0.2)]"
                    : "text-fede-muted hover:bg-white/5 hover:text-white"
                }`}
              >
                {active ? <span className="absolute left-0 h-5 w-0.5 rounded-full bg-fede-accent" /> : null}
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-3 right-3 space-y-2">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-lg border border-fede-border px-3 py-2 text-xs font-semibold text-fede-muted transition-colors hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Sitio público
          </Link>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Salir
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-fede-border bg-zinc-950/95 backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-fede-accent/25 bg-fede-accent/10">
              <Image src="/branding/logo-rayo.png" alt="Fede Moto Servicios" width={22} height={22} className="object-contain" />
            </span>
            Fede <span className="text-fede-accent">Moto</span>
          </Link>
          <button
            className="rounded-lg border border-fede-border p-2 text-fede-muted"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label="Abrir navegación admin"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileOpen && (
          <nav className="grid gap-1 border-t border-fede-border p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    active ? "bg-fede-accent/15 text-white" : "text-fede-muted hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <main className="px-4 py-5 lg:ml-64 lg:px-8 lg:py-7">{children}</main>
    </div>
  );
}
