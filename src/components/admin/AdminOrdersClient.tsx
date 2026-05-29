"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Wrench,
} from "lucide-react";
import type { OrdenEstado, OrdenTaller } from "@/lib/types";
import { EditOrderModal } from "./EditOrderModal";
import { ReceiptModal } from "@/components/ReceiptModal";

interface ApiErrorResponse {
  ok?: boolean;
  error?: { message?: string };
}

interface OrdenesResponse {
  ok: true;
  data: OrdenTaller[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  counters: {
    total: number;
    activas: number;
    listas: number;
    entregadas: number;
    canceladas: number;
  };
}

const estados: Array<{ value: OrdenEstado | "todas"; label: string }> = [
  { value: "todas", label: "Todas" },
  { value: "ingresado", label: "Ingresado" },
  { value: "diagnostico", label: "Diagnóstico" },
  { value: "espera_repuestos", label: "Espera repuestos" },
  { value: "reparacion", label: "Reparación" },
  { value: "listo", label: "Listo" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
];

async function parseApiResponse<T>(response: Response): Promise<T> {
  const json = (await response.json()) as T & ApiErrorResponse;
  if (!response.ok || json.ok === false) {
    throw new Error(json.error?.message || "No se pudo completar la acción");
  }
  return json as T;
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    const text = String(value).trim();
    if (!text) continue;
    search.set(key, text);
  }
  return search.toString();
}

function estadoLabel(value: OrdenEstado) {
  return estados.find((item) => item.value === value)?.label ?? value;
}

function estadoTone(value: OrdenEstado) {
  const tones: Record<OrdenEstado, string> = {
    ingresado: "border-fede-accent/30 bg-fede-accent/10 text-fede-accent",
    diagnostico: "border-blue-500/30 bg-blue-500/10 text-blue-200",
    espera_repuestos: "border-yellow-500/30 bg-yellow-500/10 text-yellow-200",
    reparacion: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
    listo: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    entregado: "border-white/15 bg-white/5 text-zinc-200",
    cancelado: "border-red-500/30 bg-red-500/10 text-red-200",
  };
  return tones[value];
}

function whatsappLink(row: OrdenTaller) {
  const phone = row.telefono.replace(/\D/g, "");
  const message = `Hola ${row.clienteNombre}, te escribimos de Fede Moto Servicios. Tu moto ${row.vehiculo || ""} está ${estadoLabel(row.estado).toLowerCase()} por la orden "${row.titulo}".`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function AdminOrdersClient({ initialEstado }: { initialEstado?: OrdenEstado | "todas" }) {
  const [rows, setRows] = useState<OrdenTaller[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [counters, setCounters] = useState({
    total: 0,
    activas: 0,
    listas: 0,
    entregadas: 0,
    canceladas: 0,
  });
  const [filters, setFilters] = useState({
    estado: initialEstado ?? "todas",
    search: "",
    page: 1,
    pageSize: 20,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<OrdenTaller | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
    marca: "",
    modelo: "",
    titulo: "",
    descripcion: "",
    costoEstimado: "",
    fechaPrometida: "",
  });

  const fetchOrdenes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = buildQuery({
        ...filters,
        estado: filters.estado === "todas" ? undefined : filters.estado,
      });
      const response = await fetch(`/api/admin/ordenes?${query}`, { cache: "no-store" });
      const data = await parseApiResponse<OrdenesResponse>(response);
      setRows(data.data);
      setPagination(data.pagination);
      setCounters(data.counters);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar órdenes");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchOrdenes();
  }, [fetchOrdenes]);

  const activeCards = useMemo(
    () => [
      { label: "Total", value: counters.total },
      { label: "Activas", value: counters.activas },
      { label: "Listas", value: counters.listas },
      { label: "Entregadas", value: counters.entregadas },
      { label: "Canceladas", value: counters.canceladas },
    ],
    [counters]
  );

  const createOrden = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente: {
            nombre: form.nombre,
            telefono: form.telefono,
            email: form.email || undefined,
          },
          vehiculo: {
            marca: form.marca,
            modelo: form.modelo,
          },
          titulo: form.titulo,
          descripcion: form.descripcion || undefined,
          costoEstimado: form.costoEstimado ? Number(form.costoEstimado) : undefined,
          fechaPrometida: form.fechaPrometida || undefined,
        }),
      });
      await parseApiResponse<{ ok: true; id: string }>(response);
      setForm({
        nombre: "",
        telefono: "",
        email: "",
        marca: "",
        modelo: "",
        titulo: "",
        descripcion: "",
        costoEstimado: "",
        fechaPrometida: "",
      });
      setFormOpen(false);
      await fetchOrdenes();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear la orden");
    } finally {
      setSaving(false);
    }
  };

  const updateEstado = async (id: string, estado: OrdenEstado) => {
    setError("");
    try {
      const response = await fetch(`/api/admin/ordenes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      await parseApiResponse<{ ok: true; id: string }>(response);
      await fetchOrdenes();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar la orden");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-fede-accent/20 bg-fede-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-fede-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-fede-accent shadow-[0_0_12px_rgba(172,28,29,0.8)]" />
            Taller
          </p>
          <h1 className="mt-1 text-2xl font-bold">Órdenes de taller</h1>
          <p className="mt-1 text-sm text-fede-muted">
            Flujo independiente para diagnóstico, reparación, repuestos y entrega.
          </p>
        </div>
        <button
          className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
          onClick={() => setFormOpen((value) => !value)}
        >
          <Plus className="h-4 w-4" />
          Nueva orden
        </button>
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {formOpen && (
        <form onSubmit={createOrden} className="rounded-lg border border-fede-accent/25 bg-zinc-900/60 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-lg border border-fede-accent/20 bg-fede-accent/10">
              <Wrench className="h-4 w-4 text-fede-accent" />
            </span>
            Nueva orden operativa
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <input className="input-dark" placeholder="Cliente" value={form.nombre} onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))} required />
            <input className="input-dark" placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))} required />
            <input className="input-dark" type="email" placeholder="Email opcional" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
            <input className="input-dark" placeholder="Trabajo a realizar" value={form.titulo} onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))} required />
            <input className="input-dark" placeholder="Marca" value={form.marca} onChange={(e) => setForm((prev) => ({ ...prev, marca: e.target.value }))} required />
            <input className="input-dark" placeholder="Modelo" value={form.modelo} onChange={(e) => setForm((prev) => ({ ...prev, modelo: e.target.value }))} required />
            <input className="input-dark" type="number" min={0} placeholder="Costo estimado" value={form.costoEstimado} onChange={(e) => setForm((prev) => ({ ...prev, costoEstimado: e.target.value }))} />
            <input className="input-dark" type="date" value={form.fechaPrometida} onChange={(e) => setForm((prev) => ({ ...prev, fechaPrometida: e.target.value }))} />
            <textarea className="input-dark md:col-span-4" rows={3} placeholder="Descripción o síntoma" value={form.descripcion} onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="btn-outline px-4 py-2 text-xs" onClick={() => setFormOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs" disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5" />}
              Guardar orden
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {activeCards.map((item) => (
          <div key={item.label} className="rounded-lg border border-fede-border bg-zinc-900/50 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.16)]">
            <p className="text-xs text-fede-muted">{item.label}</p>
            <p className="mt-2 text-2xl font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-fede-border bg-zinc-900/50 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
        <div className="mb-3 grid gap-2 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fede-muted" />
            <input
              className="input-dark pl-9"
              placeholder="Buscar cliente, moto o trabajo"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
            />
          </div>
          <select
            className="input-dark"
            value={filters.estado}
            onChange={(e) => setFilters((prev) => ({ ...prev, estado: e.target.value as OrdenEstado | "todas", page: 1 }))}
          >
            {estados.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button className="btn-outline inline-flex items-center justify-center gap-2 px-4 py-2 text-xs" onClick={() => void fetchOrdenes()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-fede-border/60">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-black/25">
              <tr className="border-b border-fede-border text-left text-xs uppercase tracking-[0.12em] text-fede-muted">
                <th className="px-3 py-2">Orden</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Moto</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Prometida</th>
                <th className="px-3 py-2">Costo</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-5 text-fede-muted" colSpan={7}>
                    Cargando órdenes...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-5 text-fede-muted" colSpan={7}>
                    No hay órdenes con estos filtros.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-fede-border/40 align-top transition-colors hover:bg-white/5">
                    <td className="px-3 py-3">
                      <p className="font-semibold">{row.titulo}</p>
                      <p className="line-clamp-2 text-xs text-fede-muted">{row.descripcion || "Sin descripción"}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p>{row.clienteNombre}</p>
                      <p className="text-xs text-fede-muted">{row.telefono}</p>
                    </td>
                    <td className="px-3 py-3 text-fede-muted">{row.vehiculo || "-"}</td>
                    <td className="px-3 py-3">
                      <span className={`mb-2 inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold capitalize ${estadoTone(row.estado)}`}>
                        {estadoLabel(row.estado)}
                      </span>
                      <select
                        className="input-dark py-2 text-xs"
                        value={row.estado}
                        onChange={(e) => {
                          void updateEstado(row.id, e.target.value as OrdenEstado);
                        }}
                      >
                        {estados
                          .filter((item) => item.value !== "todas")
                          .map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-xs text-fede-muted">{row.fechaPrometida || "-"}</td>
                    <td className="px-3 py-3">
                      <p>${row.costoFinal || row.costoEstimado || 0}</p>
                      {row.costoFinal ? <p className="text-xs text-fede-muted">final</p> : null}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="btn-outline inline-flex items-center gap-1 px-2 py-1 text-[11px]"
                          onClick={() => {
                            setSelectedOrderId(row.id);
                            setEditModalOpen(true);
                          }}
                        >
                          <Wrench className="h-3 w-3" />
                          Ficha / Editar
                        </button>
                        {(row.estado === "listo" || row.estado === "entregado") && (
                          <button
                            type="button"
                            className="btn-outline inline-flex items-center gap-1 px-2 py-1 text-[11px] text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                            onClick={() => {
                              setSelectedReceiptOrder(row);
                              setReceiptModalOpen(true);
                            }}
                          >
                            <ClipboardList className="h-3 w-3" />
                            Recibo
                          </button>
                        )}
                        <a
                          className="btn-outline inline-flex items-center gap-1 px-2 py-1 text-[11px]"
                          href={whatsappLink(row)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageCircle className="h-3 w-3" />
                          WhatsApp
                        </a>
                      </div>
                    </td>
                  </tr>

                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-fede-muted">
          <span>
            Página {pagination.page} de {pagination.totalPages} · {pagination.total} órdenes
          </span>
          <div className="flex gap-2">
            <button
              className="btn-outline px-3 py-1 text-xs disabled:opacity-40"
              disabled={pagination.page <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            >
              Anterior
            </button>
            <button
              className="btn-outline px-3 py-1 text-xs disabled:opacity-40"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>

      <EditOrderModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedOrderId(null);
        }}
        orderId={selectedOrderId}
        onSaved={async () => {
          await fetchOrdenes();
        }}
      />

      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false);
          setSelectedReceiptOrder(null);
        }}
        orden={selectedReceiptOrder}
      />
    </div>
  );
}
