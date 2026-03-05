"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Loader2,
  PauseCircle,
  PlayCircle,
  Save,
  Trash2,
  RefreshCw,
} from "lucide-react";
import type {
  AgendaAvailabilitySlot,
  AgendaConfig,
  AgendaException,
  AgendaTurnoRow,
  AgendaWeeklyRule,
  TurnoEstado,
} from "@/lib/types";

interface ApiErrorResponse {
  ok?: boolean;
  error?: {
    message?: string;
  };
}

interface AgendaConfigAdminResponse {
  ok: true;
  data: AgendaConfig & {
    effectiveStatus: AgendaConfig["status"];
    acceptingBookings: boolean;
  };
}

interface AgendaWeeklyResponse {
  ok: true;
  data: AgendaWeeklyRule[];
}

interface AgendaExceptionsResponse {
  ok: true;
  data: AgendaException[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

interface AgendaAvailabilityResponse {
  ok: true;
  data: {
    fecha: string;
    slots: AgendaAvailabilitySlot[];
  };
}

interface AgendaTurnosResponse {
  ok: true;
  data: AgendaTurnoRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

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

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

const dayLabels: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

export function AdminAgendaTab() {
  const [error, setError] = useState("");

  const [config, setConfig] = useState<
    (AgendaConfig & { effectiveStatus: AgendaConfig["status"]; acceptingBookings: boolean }) | null
  >(null);
  const [configSaving, setConfigSaving] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);

  const [weeklyRules, setWeeklyRules] = useState<AgendaWeeklyRule[]>([]);
  const [weeklySaving, setWeeklySaving] = useState(false);

  const [exceptions, setExceptions] = useState<AgendaException[]>([]);
  const [exceptionSaving, setExceptionSaving] = useState(false);
  const [exceptionForm, setExceptionForm] = useState({
    fecha: tomorrowDate(),
    tipo: "bloqueo" as "bloqueo" | "habilitacion",
    horaDesde: "09:00",
    horaHasta: "10:00",
    motivo: "",
  });

  const [availabilityDate, setAvailabilityDate] = useState(tomorrowDate());
  const [availabilitySlots, setAvailabilitySlots] = useState<AgendaAvailabilitySlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const [turnos, setTurnos] = useState<AgendaTurnoRow[]>([]);
  const [turnosPagination, setTurnosPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [turnosLoading, setTurnosLoading] = useState(false);
  const [turnosFilters, setTurnosFilters] = useState({
    estado: "todos" as TurnoEstado | "todos",
    search: "",
    dateFrom: tomorrowDate(),
    dateTo: "",
    page: 1,
    pageSize: 20,
  });

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const response = await fetch("/api/admin/agenda/config", { cache: "no-store" });
      const data = await parseApiResponse<AgendaConfigAdminResponse>(response);
      setConfig(data.data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar configuración");
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const fetchWeekly = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/agenda/weekly", { cache: "no-store" });
      const data = await parseApiResponse<AgendaWeeklyResponse>(response);
      setWeeklyRules(data.data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar agenda semanal");
    }
  }, []);

  const fetchExceptions = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/agenda/excepciones?page=1&pageSize=100", {
        cache: "no-store",
      });
      const data = await parseApiResponse<AgendaExceptionsResponse>(response);
      setExceptions(data.data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar excepciones");
    }
  }, []);

  const fetchAvailability = useCallback(async () => {
    setAvailabilityLoading(true);
    try {
      const response = await fetch(`/api/agenda/disponibilidad?fecha=${availabilityDate}`, {
        cache: "no-store",
      });
      const data = await parseApiResponse<AgendaAvailabilityResponse>(response);
      setAvailabilitySlots(data.data.slots);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar ocupación");
      setAvailabilitySlots([]);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [availabilityDate]);

  const fetchTurnos = useCallback(async () => {
    setTurnosLoading(true);
    try {
      const query = buildQuery(turnosFilters);
      const response = await fetch(`/api/admin/agenda/turnos?${query}`, { cache: "no-store" });
      const data = await parseApiResponse<AgendaTurnosResponse>(response);
      setTurnos(data.data);
      setTurnosPagination(data.pagination);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar turnos");
    } finally {
      setTurnosLoading(false);
    }
  }, [turnosFilters]);

  const refreshAll = useCallback(async () => {
    setError("");
    await Promise.all([fetchConfig(), fetchWeekly(), fetchExceptions(), fetchAvailability(), fetchTurnos()]);
  }, [fetchAvailability, fetchConfig, fetchExceptions, fetchTurnos, fetchWeekly]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    void fetchAvailability();
  }, [fetchAvailability]);

  useEffect(() => {
    void fetchTurnos();
  }, [fetchTurnos]);

  const groupedRules = useMemo(() => {
    const byDay = new Map<number, AgendaWeeklyRule[]>();
    for (const rule of weeklyRules) {
      const list = byDay.get(rule.dayOfWeek) ?? [];
      list.push(rule);
      byDay.set(rule.dayOfWeek, list);
    }
    return byDay;
  }, [weeklyRules]);

  const saveConfig = async () => {
    if (!config) return;
    setConfigSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/agenda/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: config.status,
          pauseReason: config.pauseReason || null,
          pauseUntil: config.pauseUntil || null,
          minDaysAhead: config.minDaysAhead,
          maxDaysAhead: config.maxDaysAhead,
          slotDurationMinutes: config.slotDurationMinutes,
        }),
      });
      await parseApiResponse<AgendaConfigAdminResponse>(response);
      await fetchConfig();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar configuración");
    } finally {
      setConfigSaving(false);
    }
  };

  const saveWeekly = async () => {
    setWeeklySaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/agenda/weekly", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: weeklyRules.map((rule) => ({
            id: rule.id,
            dayOfWeek: rule.dayOfWeek,
            enabled: rule.enabled,
            startTime: rule.startTime,
            endTime: rule.endTime,
          })),
        }),
      });
      await parseApiResponse<AgendaWeeklyResponse>(response);
      await fetchWeekly();
      await fetchAvailability();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar agenda semanal");
    } finally {
      setWeeklySaving(false);
    }
  };

  const createException = async (event: React.FormEvent) => {
    event.preventDefault();
    setExceptionSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/agenda/excepciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exceptionForm),
      });
      await parseApiResponse<{ ok: true }>(response);
      setExceptionForm((prev) => ({ ...prev, motivo: "" }));
      await Promise.all([fetchExceptions(), fetchAvailability()]);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo crear excepción");
    } finally {
      setExceptionSaving(false);
    }
  };

  const removeException = async (id: string) => {
    setError("");
    try {
      const response = await fetch(`/api/admin/agenda/excepciones/${id}`, {
        method: "DELETE",
      });
      await parseApiResponse<{ ok: true }>(response);
      await Promise.all([fetchExceptions(), fetchAvailability()]);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar excepción");
    }
  };

  const patchTurno = async (id: string, payload: Record<string, unknown>) => {
    setError("");
    try {
      const response = await fetch(`/api/admin/agenda/turnos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await parseApiResponse<{ ok: true }>(response);
      await Promise.all([fetchTurnos(), fetchAvailability()]);
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "No se pudo actualizar turno");
    }
  };

  const statusBadge =
    config?.acceptingBookings && config?.effectiveStatus === "activa"
      ? "text-green-400 border-green-500/30 bg-green-500/10"
      : "text-yellow-300 border-yellow-500/30 bg-yellow-500/10";

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-fede-accent" />
            Agenda Operativa Modular
          </p>
          <p className="text-xs text-fede-muted mt-1">
            Control completo de horarios, pausa y excepciones por fecha.
          </p>
        </div>
        <button
          className="btn-outline text-xs py-2 px-3 inline-flex items-center gap-2"
          onClick={() => {
            void refreshAll();
          }}
        >
          <RefreshCw className="w-3 h-3" />
          Recargar agenda
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Estado de agenda</p>
            {config && (
              <span className={`text-[11px] px-2 py-1 rounded-full border ${statusBadge}`}>
                {config.acceptingBookings ? "Recibiendo turnos" : "No recibe turnos"}
              </span>
            )}
          </div>

          {configLoading || !config ? (
            <p className="text-xs text-fede-muted">Cargando configuración...</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {(["activa", "pausada", "deshabilitada"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setConfig((prev) => (prev ? { ...prev, status } : prev))}
                    className={`py-2 rounded-xl border text-xs font-medium transition-all capitalize ${
                      config.status === status
                        ? status === "activa"
                          ? "border-green-500 bg-green-500/10 text-green-400"
                          : "border-yellow-500 bg-yellow-500/10 text-yellow-300"
                        : "border-fede-border text-fede-muted hover:border-white/30"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-fede-muted mb-1 block">Min días</label>
                  <input
                    className="input-dark"
                    type="number"
                    min={0}
                    max={120}
                    value={config.minDaysAhead}
                    onChange={(event) =>
                      setConfig((prev) =>
                        prev
                          ? {
                              ...prev,
                              minDaysAhead: Number(event.target.value),
                            }
                          : prev
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-fede-muted mb-1 block">Max días</label>
                  <input
                    className="input-dark"
                    type="number"
                    min={0}
                    max={120}
                    value={config.maxDaysAhead}
                    onChange={(event) =>
                      setConfig((prev) =>
                        prev
                          ? {
                              ...prev,
                              maxDaysAhead: Number(event.target.value),
                            }
                          : prev
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-fede-muted mb-1 block">Duración slot</label>
                  <select
                    className="input-dark"
                    value={config.slotDurationMinutes}
                    onChange={(event) =>
                      setConfig((prev) =>
                        prev
                          ? {
                              ...prev,
                              slotDurationMinutes: Number(event.target.value),
                            }
                          : prev
                      )
                    }
                  >
                    <option value={30}>30 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                    <option value={120}>120 min</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-fede-muted mb-1 block">Pausa hasta</label>
                  <input
                    className="input-dark"
                    type="datetime-local"
                    value={config.pauseUntil ? config.pauseUntil.slice(0, 16) : ""}
                    onChange={(event) =>
                      setConfig((prev) =>
                        prev
                          ? {
                              ...prev,
                              pauseUntil: event.target.value
                                ? `${event.target.value}:00-03:00`
                                : null,
                            }
                          : prev
                      )
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-fede-muted mb-1 block">Motivo de pausa</label>
                <input
                  className="input-dark"
                  value={config.pauseReason ?? ""}
                  onChange={(event) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            pauseReason: event.target.value,
                          }
                        : prev
                    )
                  }
                />
              </div>

              <button
                className="btn-primary text-xs py-2 px-3 inline-flex items-center gap-2"
                disabled={configSaving}
                onClick={() => {
                  void saveConfig();
                }}
              >
                {configSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : config.status === "activa" ? (
                  <PlayCircle className="w-3 h-3" />
                ) : (
                  <PauseCircle className="w-3 h-3" />
                )}
                Guardar estado
              </button>
            </>
          )}
        </div>

        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Ocupación por día</p>
            <input
              className="input-dark text-xs max-w-[180px]"
              type="date"
              value={availabilityDate}
              onChange={(event) => setAvailabilityDate(event.target.value)}
            />
          </div>
          {availabilityLoading ? (
            <p className="text-xs text-fede-muted">Cargando disponibilidad...</p>
          ) : availabilitySlots.length === 0 ? (
            <p className="text-xs text-fede-muted">Sin slots configurados para esta fecha.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availabilitySlots.map((slot) => (
                <div
                  key={slot.hora}
                  className={`rounded-xl border px-2 py-2 text-xs ${
                    slot.available
                      ? "border-green-500/30 bg-green-500/10 text-green-300"
                      : slot.reason === "booked"
                      ? "border-red-500/30 bg-red-500/10 text-red-300"
                      : slot.reason === "blocked"
                      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                      : "border-fede-border bg-fede-black/40 text-fede-muted"
                  }`}
                >
                  <p className="font-medium">{slot.hora}</p>
                  <p className="capitalize">{slot.available ? "Libre" : slot.reason?.replace("_", " ")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Agenda semanal</p>
          <button
            className="btn-outline text-xs py-2 px-3 inline-flex items-center gap-2"
            disabled={weeklySaving}
            onClick={() => {
              void saveWeekly();
            }}
          >
            {weeklySaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Guardar franjas
          </button>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const dayRules = groupedRules.get(day) ?? [];
            return (
              <div key={day} className="rounded-xl border border-fede-border p-3">
                <p className="text-xs text-fede-muted mb-2">{dayLabels[day]}</p>
                {dayRules.length === 0 ? (
                  <p className="text-xs text-fede-muted">Sin franjas configuradas</p>
                ) : (
                  <div className="space-y-2">
                    {dayRules.map((rule) => (
                      <div key={rule.id} className="grid grid-cols-12 gap-2 items-center">
                        <label className="col-span-2 text-xs inline-flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={(event) =>
                              setWeeklyRules((prev) =>
                                prev.map((item) =>
                                  item.id === rule.id
                                    ? {
                                        ...item,
                                        enabled: event.target.checked,
                                      }
                                    : item
                                )
                              )
                            }
                          />
                          Activa
                        </label>
                        <input
                          className="input-dark col-span-5"
                          type="time"
                          value={rule.startTime}
                          onChange={(event) =>
                            setWeeklyRules((prev) =>
                              prev.map((item) =>
                                item.id === rule.id
                                  ? {
                                      ...item,
                                      startTime: event.target.value,
                                    }
                                  : item
                              )
                            )
                          }
                        />
                        <input
                          className="input-dark col-span-5"
                          type="time"
                          value={rule.endTime}
                          onChange={(event) =>
                            setWeeklyRules((prev) =>
                              prev.map((item) =>
                                item.id === rule.id
                                  ? {
                                      ...item,
                                      endTime: event.target.value,
                                    }
                                  : item
                              )
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-card p-4 space-y-3">
          <p className="text-sm font-medium">Excepciones por fecha</p>
          <form className="space-y-2" onSubmit={createException}>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input-dark"
                type="date"
                value={exceptionForm.fecha}
                onChange={(event) =>
                  setExceptionForm((prev) => ({
                    ...prev,
                    fecha: event.target.value,
                  }))
                }
                required
              />
              <select
                className="input-dark"
                value={exceptionForm.tipo}
                onChange={(event) =>
                  setExceptionForm((prev) => ({
                    ...prev,
                    tipo: event.target.value as "bloqueo" | "habilitacion",
                  }))
                }
              >
                <option value="bloqueo">Bloqueo</option>
                <option value="habilitacion">Habilitación</option>
              </select>
              <input
                className="input-dark"
                type="time"
                value={exceptionForm.horaDesde}
                onChange={(event) =>
                  setExceptionForm((prev) => ({
                    ...prev,
                    horaDesde: event.target.value,
                  }))
                }
                required
              />
              <input
                className="input-dark"
                type="time"
                value={exceptionForm.horaHasta}
                onChange={(event) =>
                  setExceptionForm((prev) => ({
                    ...prev,
                    horaHasta: event.target.value,
                  }))
                }
                required
              />
            </div>
            <input
              className="input-dark"
              value={exceptionForm.motivo}
              placeholder="Motivo (opcional)"
              onChange={(event) =>
                setExceptionForm((prev) => ({
                  ...prev,
                  motivo: event.target.value,
                }))
              }
            />
            <button
              type="submit"
              className="btn-primary text-xs py-2 px-3"
              disabled={exceptionSaving}
            >
              {exceptionSaving ? "Guardando..." : "Agregar excepción"}
            </button>
          </form>
        </div>

        <div className="glass-card p-4 space-y-2 max-h-[380px] overflow-auto">
          {exceptions.length === 0 ? (
            <p className="text-xs text-fede-muted">Sin excepciones cargadas.</p>
          ) : (
            exceptions.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-fede-border p-2 text-xs flex items-start justify-between gap-2"
              >
                <div>
                  <p className="font-medium">
                    {item.fecha} · {item.tipo}
                  </p>
                  <p className="text-fede-muted">
                    {item.horaDesde} - {item.horaHasta}
                  </p>
                  {item.motivo && <p className="text-fede-muted">{item.motivo}</p>}
                </div>
                <button
                  className="btn-outline text-[11px] px-2 py-1 inline-flex items-center gap-1"
                  onClick={() => {
                    void removeException(item.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                  Eliminar
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="glass-card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            className="input-dark md:col-span-2"
            placeholder="Buscar cliente/teléfono/servicio"
            value={turnosFilters.search}
            onChange={(event) =>
              setTurnosFilters((prev) => ({
                ...prev,
                search: event.target.value,
                page: 1,
              }))
            }
          />
          <select
            className="input-dark"
            value={turnosFilters.estado}
            onChange={(event) =>
              setTurnosFilters((prev) => ({
                ...prev,
                estado: event.target.value as TurnoEstado | "todos",
                page: 1,
              }))
            }
          >
            <option value="todos">Estado: todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En proceso</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <input
            className="input-dark"
            type="date"
            value={turnosFilters.dateFrom}
            onChange={(event) =>
              setTurnosFilters((prev) => ({
                ...prev,
                dateFrom: event.target.value,
                page: 1,
              }))
            }
          />
          <input
            className="input-dark"
            type="date"
            value={turnosFilters.dateTo}
            onChange={(event) =>
              setTurnosFilters((prev) => ({
                ...prev,
                dateTo: event.target.value,
                page: 1,
              }))
            }
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-fede-muted border-b border-fede-border">
                <th className="py-2">Cliente</th>
                <th className="py-2">Fecha/Hora</th>
                <th className="py-2">Servicio</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {turnosLoading ? (
                <tr>
                  <td colSpan={5} className="py-4 text-fede-muted">
                    Cargando turnos...
                  </td>
                </tr>
              ) : turnos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-fede-muted">
                    Sin turnos para los filtros actuales.
                  </td>
                </tr>
              ) : (
                turnos.map((item) => (
                  <tr key={item.id} className="border-b border-fede-border/40 align-top">
                    <td className="py-2">
                      <p className="font-medium">{item.clienteNombre}</p>
                      <p className="text-xs text-fede-muted">{item.telefono}</p>
                    </td>
                    <td className="py-2 text-xs">
                      {item.fecha}
                      <br />
                      {item.hora}
                    </td>
                    <td className="py-2 text-xs text-fede-muted">{item.servicio}</td>
                    <td className="py-2">
                      <select
                        className="input-dark text-xs py-1"
                        value={item.estado}
                        onChange={(event) => {
                          void patchTurno(item.id, { estado: event.target.value });
                        }}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="en_proceso">En proceso</option>
                        <option value="completado">Completado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </td>
                    <td className="py-2">
                      <button
                        className="btn-outline text-[11px] px-2 py-1"
                        onClick={() => {
                          const fecha = window.prompt("Nueva fecha (YYYY-MM-DD)", item.fecha);
                          if (!fecha) return;
                          const hora = window.prompt("Nueva hora (HH:mm)", item.hora);
                          if (!hora) return;
                          void patchTurno(item.id, { fecha, hora });
                        }}
                      >
                        Reprogramar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs text-fede-muted">
          <span>
            Página {turnosPagination.page} de {turnosPagination.totalPages} · {turnosPagination.total} turnos
          </span>
          <div className="flex gap-1">
            <button
              className="btn-outline text-[11px] px-2 py-1"
              disabled={turnosPagination.page <= 1}
              onClick={() =>
                setTurnosFilters((prev) => ({
                  ...prev,
                  page: Math.max(1, prev.page - 1),
                }))
              }
            >
              Anterior
            </button>
            <button
              className="btn-outline text-[11px] px-2 py-1"
              disabled={turnosPagination.page >= turnosPagination.totalPages}
              onClick={() =>
                setTurnosFilters((prev) => ({
                  ...prev,
                  page: Math.min(turnosPagination.totalPages, prev.page + 1),
                }))
              }
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

