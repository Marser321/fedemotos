"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  MapPin,
  TrendingUp,
  Users,
  Wrench,
  RefreshCw,
} from "lucide-react";
import type { AdminWorkdaySummary } from "@/lib/types";

function money(value: number) {
  return `$${value.toLocaleString("es-UY")}`;
}

function statusLabel(value: string) {
  return value.split("_").join(" ");
}

function HubSection({
  title,
  href,
  icon: Icon,
  children,
}: {
  title: string;
  href: string;
  icon: typeof AlertTriangle;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-fede-border bg-zinc-900/50 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition-colors hover:border-fede-border/80">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-fede-accent/20 bg-fede-accent/10">
            <Icon className="h-4 w-4 text-fede-accent" />
          </span>
          {title}
        </h2>
        <Link href={href} className="rounded-md px-2 py-1 text-xs font-semibold text-fede-accent transition-colors hover:bg-fede-accent/10 hover:text-white">
          Abrir
        </Link>
      </div>
      {children}
    </section>
  );
}

export function AdminWorkdayHub({
  data,
  error,
}: {
  data: AdminWorkdaySummary;
  error?: string;
}) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  const stats = [
    { label: "Activos", value: data.stats.suscriptoresActivos, icon: Users },
    { label: "Auxilios mes", value: data.stats.auxiliosEsteMes, icon: AlertTriangle },
    { label: "Servicios", value: data.stats.serviciosCompletados, icon: Wrench },
    { label: "Facturación", value: money(data.stats.facturacionMensual), icon: DollarSign },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-fede-accent/20 bg-fede-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-fede-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-fede-accent shadow-[0_0_12px_rgba(172,28,29,0.8)]" />
            Día de trabajo
          </p>
          <h1 className="mt-1 text-2xl font-bold">Panel operativo</h1>
          <p className="mt-1 text-sm text-fede-muted">
            Urgencias, turnos, órdenes y comunicaciones en una sola vista.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-outline inline-flex items-center justify-center p-2 rounded-lg transition-all duration-300 disabled:opacity-50"
            title="Actualizar datos"
          >
            <RefreshCw className={`h-4 w-4 text-fede-accent ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <Link href="/admin/ordenes" className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm">
            <ClipboardList className="h-4 w-4" />
            Nueva orden
          </Link>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-lg border border-fede-border bg-zinc-900/50 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.16)]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-fede-muted">{item.label}</span>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-fede-accent/10">
                  <Icon className="h-4 w-4 text-fede-accent" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold">{item.value}</p>
            </div>
          );
        })}
      </div>

      {data.alertas.length > 0 && (
        <section className="grid gap-2">
          {data.alertas.map((alerta) => (
            <Link
              key={alerta.id}
              href={alerta.href || "/admin"}
              className={`rounded-lg border px-4 py-3 text-sm transition-colors ${
                alerta.level === "critical"
                  ? "border-red-500/30 bg-red-500/10 text-red-100"
                  : alerta.level === "warning"
                  ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-100"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              }`}
            >
              <span className="font-semibold">{alerta.title}</span>
              <span className="ml-2 text-white/70">{alerta.detail}</span>
            </Link>
          ))}
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <HubSection title="Auxilios abiertos" href="/admin/operaciones" icon={MapPin}>
          <div className="space-y-2">
            {data.operacionesAbiertas.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/20 px-3 py-6 text-center text-sm text-fede-muted">
                <CheckCircle2 className="h-6 w-6 text-emerald-500/80 mb-2 animate-pulse" />
                <p className="font-semibold text-white/90">¡Todo al día!</p>
                <p className="text-xs text-fede-muted mt-0.5">No hay auxilios pendientes en este momento.</p>
              </div>
            ) : (
              data.operacionesAbiertas.map((item) => (
                <div key={item.id} className="rounded-lg border border-fede-border/60 bg-black/25 p-3 transition-colors hover:border-fede-accent/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.clienteNombre}</p>
                      <p className="text-xs text-fede-muted">{item.vehiculo || item.telefono}</p>
                    </div>
                    <span className="rounded-full border border-fede-border px-2 py-1 text-[11px] capitalize text-fede-muted">
                      {item.prioridad}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-fede-muted">{item.motivo || "Sin detalle"}</p>
                </div>
              ))
            )}
          </div>
        </HubSection>

        <HubSection title="Turnos de hoy" href="/admin/agenda" icon={CalendarClock}>
          <div className="space-y-2">
            {data.turnosHoy.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/20 px-3 py-6 text-center text-sm text-fede-muted">
                <CalendarClock className="h-6 w-6 text-fede-accent/80 mb-2" />
                <p className="font-semibold text-white/90">Sin turnos agendados</p>
                <p className="text-xs text-fede-muted mt-0.5">No hay reservas de mantenimiento para hoy.</p>
              </div>
            ) : (
              data.turnosHoy.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-fede-border/60 bg-black/25 p-3 transition-colors hover:border-fede-accent/30">
                  <div>
                    <p className="text-sm font-semibold">{item.clienteNombre}</p>
                    <p className="text-xs text-fede-muted">{item.servicio}</p>
                  </div>
                  <span className="font-mono text-sm text-fede-accent">{item.hora}</span>
                </div>
              ))
            )}
          </div>
        </HubSection>

        <HubSection title="Órdenes activas" href="/admin/ordenes" icon={ClipboardList}>
          <div className="space-y-2">
            {data.ordenesActivas.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/20 px-3 py-6 text-center text-sm text-fede-muted">
                <ClipboardList className="h-6 w-6 text-fede-accent/80 mb-2" />
                <p className="font-semibold text-white/90">Taller libre</p>
                <p className="text-xs text-fede-muted mt-0.5">No hay motos en proceso de reparación hoy.</p>
              </div>
            ) : (
              data.ordenesActivas.map((item) => (
                <div key={item.id} className="rounded-lg border border-fede-border/60 bg-black/25 p-3 transition-colors hover:border-fede-accent/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.titulo}</p>
                      <p className="text-xs text-fede-muted">
                        {item.clienteNombre} · {item.vehiculo || "Moto sin registrar"}
                      </p>
                    </div>
                    <span className="rounded-full bg-fede-accent/15 px-2 py-1 text-[11px] capitalize text-fede-accent">
                      {statusLabel(item.estado)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </HubSection>

        <HubSection title="Comunicaciones pendientes" href="/admin/comunicaciones" icon={Bell}>
          <div className="space-y-2">
            {(data.comunicacionesPendientes ?? data.recordatoriosPendientes).length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/20 px-3 py-6 text-center text-sm text-fede-muted">
                <CheckCircle2 className="h-6 w-6 text-emerald-500/80 mb-2" />
                <p className="font-semibold text-white/90">Cola limpia</p>
                <p className="text-xs text-fede-muted mt-0.5">No hay mensajes pendientes por enviar.</p>
              </div>
            ) : (
              (data.comunicacionesPendientes ?? data.recordatoriosPendientes).map((item) => (
                <div key={item.id} className="rounded-lg border border-fede-border/60 bg-black/25 p-3 transition-colors hover:border-fede-accent/30">
                  <p className="text-sm font-semibold">{item.clienteNombre}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-fede-muted">{item.messagePreview}</p>
                </div>
              ))
            )}
          </div>
        </HubSection>
      </div>

      <section className="rounded-lg border border-fede-border bg-zinc-900/50 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-fede-accent" />
          Próximas mejoras modulares
        </h2>
        <div className="grid gap-2 text-sm text-fede-muted md:grid-cols-3">
          <p className="rounded-lg border border-white/10 bg-black/20 p-3">Ficha Cliente 360 con historial completo.</p>
          <p className="rounded-lg border border-white/10 bg-black/20 p-3">Presupuestos y repuestos dentro de órdenes.</p>
          <p className="rounded-lg border border-white/10 bg-black/20 p-3">Proveedor WhatsApp real sobre la cola asistida.</p>
        </div>
      </section>
    </div>
  );
}
