"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  SkipForward,
} from "lucide-react";
import type {
  CommunicationEventType,
  CommunicationQueueItem,
  CommunicationSourceType,
  CommunicationStatus,
} from "@/lib/types";

interface ApiErrorResponse {
  ok?: boolean;
  error?: { message?: string };
}

interface CommunicationsResponse {
  ok: true;
  data: CommunicationQueueItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  counters: { total: number; pendientes: number; enviados: number; omitidos: number };
}

const sourceOptions: Array<{ value: CommunicationSourceType | "todos"; label: string }> = [
  { value: "todos", label: "Todas las fuentes" },
  { value: "orden", label: "Ordenes" },
  { value: "turno", label: "Agenda" },
  { value: "auxilio", label: "Auxilios" },
  { value: "traslado", label: "Traslados" },
  { value: "membresia", label: "Membresias" },
  { value: "servicio", label: "Servicios" },
  { value: "legacy_recordatorio", label: "Legacy" },
];

const eventOptions: Array<{ value: CommunicationEventType | "todos"; label: string }> = [
  { value: "todos", label: "Todos los eventos" },
  { value: "orden_lista", label: "Moto lista" },
  { value: "orden_espera_repuestos", label: "Espera repuestos" },
  { value: "turno_creado", label: "Turno creado" },
  { value: "turno_reprogramado", label: "Turno reprogramado" },
  { value: "turno_cancelado", label: "Turno cancelado" },
  { value: "auxilio_recibido", label: "Auxilio recibido" },
  { value: "auxilio_en_camino", label: "Auxilio en camino" },
  { value: "auxilio_completado", label: "Auxilio completado" },
  { value: "traslado_recibido", label: "Traslado recibido" },
  { value: "traslado_en_camino", label: "Traslado en camino" },
  { value: "traslado_completado", label: "Traslado completado" },
  { value: "membresia_vence_7", label: "Membresia 7 dias" },
  { value: "membresia_vence_3", label: "Membresia 3 dias" },
  { value: "membresia_vence_1", label: "Membresia 1 dia" },
  { value: "service_control_30", label: "Control 30 dias" },
];

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

async function parseApiResponse<T>(response: Response): Promise<T> {
  const json = (await response.json()) as T & ApiErrorResponse;
  if (!response.ok || json.ok === false) {
    throw new Error(json.error?.message || "No se pudo completar la accion");
  }
  return json as T;
}

function statusTone(status: CommunicationStatus) {
  if (status === "pendiente") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-100";
  if (status === "enviado_manual") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  if (status === "omitido") return "border-white/15 bg-white/5 text-zinc-300";
  return "border-red-500/30 bg-red-500/10 text-red-200";
}

export function AdminCommunicationsClient() {
  const [rows, setRows] = useState<CommunicationQueueItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [counters, setCounters] = useState({ total: 0, pendientes: 0, enviados: 0, omitidos: 0 });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filters, setFilters] = useState({
    estado: "pendiente" as CommunicationStatus | "todos",
    sourceType: "todos" as CommunicationSourceType | "todos",
    eventType: "todos" as CommunicationEventType | "todos",
    date: "",
    search: "",
    page: 1,
    pageSize: 20,
  });

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = buildQuery({
        ...filters,
        estado: filters.estado === "todos" ? undefined : filters.estado,
        sourceType: filters.sourceType === "todos" ? undefined : filters.sourceType,
        eventType: filters.eventType === "todos" ? undefined : filters.eventType,
      });
      const response = await fetch(`/api/admin/communications?${query}`, { cache: "no-store" });
      const data = await parseApiResponse<CommunicationsResponse>(response);
      setRows(data.data);
      setPagination(data.pagination);
      setCounters(data.counters);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar comunicaciones");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const cards = useMemo(
    () => [
      { label: "Total", value: counters.total },
      { label: "Pendientes", value: counters.pendientes },
      { label: "Enviadas", value: counters.enviados },
      { label: "Omitidas", value: counters.omitidos },
    ],
    [counters]
  );

  const markSent = async (id: string) => {
    setError("");
    try {
      const response = await fetch(`/api/admin/communications/${id}/mark-sent`, { method: "POST" });
      await parseApiResponse<{ ok: true; id: string }>(response);
      await fetchRows();
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "No se pudo marcar envio");
    }
  };

  const skip = async (id: string) => {
    setError("");
    try {
      const reason = window.prompt("Motivo para omitir (opcional). Este texto queda auditado.", "") || "";
      const response = await fetch(`/api/admin/communications/${id}/skip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      await parseApiResponse<{ ok: true; id: string }>(response);
      await fetchRows();
    } catch (skipError) {
      setError(skipError instanceof Error ? skipError.message : "No se pudo omitir comunicacion");
    }
  };

  const generate = async () => {
    setGenerating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/communications/generate", { method: "POST" });
      const data = await parseApiResponse<{ ok: true; created: number; skipped: number }>(response);
      setNotice(`Generacion lista: ${data.created} nuevas, ${data.skipped} ya existentes.`);
      await fetchRows();
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "No se pudo generar cola");
    } finally {
      setGenerating(false);
    }
  };

  const copyMessage = async (message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setNotice("Mensaje copiado.");
    } catch {
      setNotice("No se pudo copiar automaticamente.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-fede-accent/20 bg-fede-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-fede-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-fede-accent shadow-[0_0_12px_rgba(172,28,29,0.8)]" />
            Bandeja asistida
          </p>
          <h1 className="mt-1 text-2xl font-bold">Comunicaciones</h1>
          <p className="mt-1 text-sm text-fede-muted">
            Mensajes WhatsApp preparados por eventos operativos, listos para aprobacion humana.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-sm"
            onClick={() => void fetchRows()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <button
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
            onClick={() => void generate()}
            disabled={generating}
          >
            <Send className="h-4 w-4" />
            Generar recordatorios
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {notice}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <div key={item.label} className="rounded-lg border border-fede-border bg-zinc-900/50 p-4">
            <p className="text-xs text-fede-muted">{item.label}</p>
            <p className="mt-2 text-2xl font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-fede-border bg-zinc-900/50 p-4">
        <div className="mb-3 grid gap-2 lg:grid-cols-7">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fede-muted" />
            <input
              className="input-dark pl-9"
              placeholder="Buscar cliente, telefono o mensaje"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value, page: 1 }))}
            />
          </div>
          <select
            className="input-dark"
            value={filters.estado}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, estado: event.target.value as CommunicationStatus | "todos", page: 1 }))
            }
          >
            <option value="pendiente">Pendientes</option>
            <option value="enviado_manual">Enviadas</option>
            <option value="omitido">Omitidas</option>
            <option value="error">Error</option>
            <option value="todos">Todas</option>
          </select>
          <select
            className="input-dark"
            value={filters.sourceType}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, sourceType: event.target.value as CommunicationSourceType | "todos", page: 1 }))
            }
          >
            {sourceOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            className="input-dark lg:col-span-2"
            value={filters.eventType}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, eventType: event.target.value as CommunicationEventType | "todos", page: 1 }))
            }
          >
            {eventOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            className="input-dark"
            type="date"
            value={filters.date}
            onChange={(event) => setFilters((prev) => ({ ...prev, date: event.target.value, page: 1 }))}
          />
        </div>

        <div className="space-y-2">
          {loading ? (
            <p className="rounded-lg border border-dashed border-white/10 bg-black/20 p-4 text-sm text-fede-muted">
              Cargando comunicaciones...
            </p>
          ) : rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/10 bg-black/20 p-4 text-sm text-fede-muted">
              No hay comunicaciones para esta vista.
            </p>
          ) : (
            rows.map((item) => {
              const isPending = item.status === "pendiente";
              return (
                <article key={item.id} className="rounded-lg border border-fede-border/70 bg-black/25 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{item.clienteNombre}</p>
                        <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${statusTone(item.status)}`}>
                          {item.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-fede-muted">
                        {item.telefono} · {item.sourceLabel} · {item.eventLabel}
                      </p>
                    </div>
                    <p className="text-xs text-fede-muted">
                      {new Date(item.scheduledDate).toLocaleString("es-UY")}
                    </p>
                  </div>
                  <p className="mt-3 rounded-lg border border-white/10 bg-zinc-950/50 p-3 text-sm text-zinc-200">
                    {item.messagePreview}
                  </p>
                  {(item.sentAt || item.sentBy || item.skipReason) && (
                    <div className="mt-2 rounded-lg border border-fede-border/60 bg-fede-black/30 px-2 py-1.5 text-[11px] text-fede-muted">
                      {item.sentAt && <p>Gestionado: {new Date(item.sentAt).toLocaleString("es-UY")}</p>}
                      {item.sentBy && <p>Operador: {item.sentBy}</p>}
                      {item.skipReason && <p>Motivo omitido: {item.skipReason}</p>}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={item.waLink}
                      target="_blank"
                      rel="noreferrer"
                      aria-disabled={!isPending}
                      onClick={(event) => {
                        if (!isPending) event.preventDefault();
                      }}
                      className={`inline-flex items-center gap-1 px-3 py-2 text-xs ${isPending ? "btn-primary" : "btn-outline opacity-50 pointer-events-none"}`}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Abrir WhatsApp
                    </a>
                    <button
                      className="btn-outline inline-flex items-center gap-1 px-3 py-2 text-xs"
                      onClick={() => void copyMessage(item.messagePreview)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copiar
                    </button>
                    <button
                      className="btn-outline inline-flex items-center gap-1 px-3 py-2 text-xs"
                      disabled={!isPending}
                      onClick={() => void markSent(item.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Marcar enviado
                    </button>
                    <button
                      className="btn-outline inline-flex items-center gap-1 px-3 py-2 text-xs"
                      disabled={!isPending}
                      onClick={() => void skip(item.id)}
                    >
                      <SkipForward className="h-3.5 w-3.5" />
                      Omitir
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-fede-muted">
          <span>
            Pagina {pagination.page} de {pagination.totalPages} · {pagination.total} comunicaciones
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
    </div>
  );
}
