"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  AlertTriangle,
  Wrench,
  DollarSign,
  Clock,
  MapPin,
  Download,
  Bell,
  Search,
  MessageCircle,
  SkipForward,
  CheckCircle2,
  Plus,
} from "lucide-react";
import type {
  AuxilioEstado,
  AuxilioPrioridad,
  AuxilioTipo,
  DashboardStats,
  MembresiaEstado,
  MembresiaRow,
  OperacionAuxilioItem,
  ReminderQueueItem,
  ServicioRegistro,
  SolicitudAuxilio,
} from "@/lib/types";
import { MapView } from "@/components/MapView";
import { generateOperationalReceiptPdf } from "@/lib/invoice/receipt";
import {
  buildOperationMapsLink,
  buildWhatsAppDispatchLink,
  normalizeReminderType,
  parseApiResponse,
} from "./_shared";

function StatMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card p-3">
      <p className="text-xs text-fede-muted">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between pt-2 text-xs text-fede-muted">
      <span>
        Página {pagination.page} de {pagination.totalPages} · {pagination.total} registros
      </span>
      <div className="flex gap-2">
        <button
          className="btn-outline text-[11px] px-2 py-1"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          Anterior
        </button>
        <button
          className="btn-outline text-[11px] px-2 py-1"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

export function MembershipEditModal({
  isOpen,
  onClose,
  membership,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  membership: MembresiaRow | null;
  onSaved: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
    plan: "basico" as "basico" | "premium",
    estado: "activo" as MembresiaEstado,
    auxiliosRestantes: 0,
    fechaInicio: "",
    fechaFin: "",
  });

  useEffect(() => {
    if (!membership || !isOpen) return;
    setForm({
      nombre: membership.nombre,
      telefono: membership.telefono,
      email: membership.email,
      plan: membership.plan,
      estado: membership.estado,
      auxiliosRestantes: membership.auxiliosRestantes,
      fechaInicio: membership.fechaInicio,
      fechaFin: membership.fechaFin,
    });
    setError("");
  }, [membership, isOpen]);

  if (!isOpen || !membership) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/membresias/${membership.membresiaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: form.estado,
          plan: form.plan,
          auxiliosRestantes: Number(form.auxiliosRestantes),
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
          contacto: {
            nombre: form.nombre,
            telefono: form.telefono,
            email: form.email,
          },
        }),
      });
      await parseApiResponse<{ ok: true; id: string }>(response);
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg glass-card p-5 max-h-[90vh] overflow-auto">
        <h3 className="font-bold mb-4">Editar membresía</h3>
        <form className="space-y-3" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="input-dark"
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              placeholder="Nombre"
              required
            />
            <input
              className="input-dark"
              value={form.telefono}
              onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))}
              placeholder="Teléfono"
              required
            />
            <input
              className="input-dark col-span-2"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select
              className="input-dark"
              value={form.plan}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, plan: e.target.value as "basico" | "premium" }))
              }
            >
              <option value="basico">Básico</option>
              <option value="premium">Premium</option>
            </select>
            <select
              className="input-dark"
              value={form.estado}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, estado: e.target.value as MembresiaEstado }))
              }
            >
              <option value="activo">Activo</option>
              <option value="pendiente">Pendiente</option>
              <option value="inactivo">Inactivo</option>
            </select>
            <input
              className="input-dark"
              type="number"
              min={0}
              value={form.auxiliosRestantes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, auxiliosRestantes: Number(e.target.value) }))
              }
              placeholder="Cupos"
            />
            <input
              className="input-dark"
              type="date"
              value={form.fechaInicio}
              onChange={(e) => setForm((prev) => ({ ...prev, fechaInicio: e.target.value }))}
            />
            <input
              className="input-dark col-span-2"
              type="date"
              value={form.fechaFin}
              onChange={(e) => setForm((prev) => ({ ...prev, fechaFin: e.target.value }))}
            />
          </div>

          {error && (
            <p className="text-sm rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300">
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-outline px-4 py-2 text-xs" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary px-4 py-2 text-xs"
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function OverviewTab({
  stats,
  auxilios,
  servicios,
}: {
  stats: DashboardStats;
  auxilios: SolicitudAuxilio[];
  servicios: ServicioRegistro[];
}) {
  const statsList = [
    {
      label: "Suscriptores Activos",
      value: stats.suscriptoresActivos,
      total: stats.totalSuscriptores,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/15",
    },
    {
      label: "Auxilios este mes",
      value: stats.auxiliosEsteMes,
      icon: AlertTriangle,
      color: "text-yellow-400",
      bg: "bg-yellow-500/15",
    },
    {
      label: "Servicios completados",
      value: stats.serviciosCompletados,
      icon: Wrench,
      color: "text-green-400",
      bg: "bg-green-500/15",
    },
    {
      label: "Facturación mensual",
      value: `$${stats.facturacionMensual.toLocaleString()}`,
      icon: DollarSign,
      color: "text-fede-accent",
      bg: "bg-fede-accent/15",
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statsList.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="stat-card"
            >
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-fede-muted">
                  {stat.label}
                  {"total" in stat && stat.total !== undefined ? (
                    <span className="text-fede-muted/60"> / {stat.total} total</span>
                  ) : null}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="glass-card p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-fede-accent" /> Solicitudes Activas
        </h3>
        <MapView
          center={[-34.8833, -56.1667]}
          zoom={12}
          height="h-64 sm:h-80"
          pins={auxilios
            .filter((a) => a.estado !== "completado")
            .map((a) => ({
              id: a.id,
              lat: a.latitud,
              lng: a.longitud,
              label: a.clienteNombre,
              description: a.descripcion,
              type: "emergency" as const,
            }))}
        />
      </div>

      <div className="glass-card p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-fede-accent" /> Últimos servicios
        </h3>
        <div className="space-y-2">
          {servicios.slice(0, 5).map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-3 rounded-xl bg-fede-black/50 border border-fede-border/50"
            >
              <div>
                <p className="text-sm font-medium">{s.clienteNombre}</p>
                <p className="text-xs text-fede-muted">{s.servicio}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">${s.costo.toLocaleString()}</p>
                <span className="text-xs text-fede-muted">{new Date(s.fecha).toLocaleDateString("es-UY")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function AuxiliosOperativosTab({
  loading,
  data,
  counters,
  pagination,
  filters,
  onFiltersChange,
  onOpenCreate,
  onPatch,
}: {
  loading: boolean;
  data: OperacionAuxilioItem[];
  counters: {
    total: number;
    pendientes: number;
    enCamino: number;
    completados: number;
    auxilios: number;
    traslados: number;
  };
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  filters: {
    tipo: "" | AuxilioTipo;
    estado: "" | AuxilioEstado;
    prioridad: "" | AuxilioPrioridad;
    search: string;
    dateFrom: string;
    dateTo: string;
    sortBy: "solicitado_en" | "prioridad" | "estado" | "cliente";
    sortDir: "asc" | "desc";
    page: number;
    pageSize: number;
  };
  onFiltersChange: React.Dispatch<
    React.SetStateAction<{
      tipo: "" | AuxilioTipo;
      estado: "" | AuxilioEstado;
      prioridad: "" | AuxilioPrioridad;
      search: string;
      dateFrom: string;
      dateTo: string;
      sortBy: "solicitado_en" | "prioridad" | "estado" | "cliente";
      sortDir: "asc" | "desc";
      page: number;
      pageSize: number;
    }>
  >;
  onOpenCreate: () => void;
  onPatch: (
    id: string,
    patch: Partial<{ estado: AuxilioEstado; prioridad: AuxilioPrioridad; notasInternas: string }>
  ) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatMini label="Total" value={counters.total} />
        <StatMini label="Pendientes" value={counters.pendientes} />
        <StatMini label="En camino" value={counters.enCamino} />
        <StatMini label="Completados" value={counters.completados} />
        <StatMini label="Auxilios" value={counters.auxilios} />
        <StatMini label="Traslados" value={counters.traslados} />
      </div>

      <div className="glass-card p-4 space-y-3">
        <div className="flex gap-2 flex-wrap items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 text-fede-accent" />
            Operaciones de auxilio y traslado
          </div>
          <button
            className="btn-primary text-xs py-2 px-3 flex items-center gap-1"
            onClick={onOpenCreate}
            data-help-id="auxilios-new-request"
          >
            <Plus className="w-3 h-3" /> Nueva solicitud
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-8 gap-2">
          <div className="md:col-span-2 relative">
            <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-fede-muted" />
            <input
              className="input-dark pl-8"
              placeholder="Buscar cliente/teléfono"
              value={filters.search}
              onChange={(e) => onFiltersChange((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
            />
          </div>

          <select
            className="input-dark"
            value={filters.tipo}
            onChange={(e) =>
              onFiltersChange((prev) => ({ ...prev, tipo: e.target.value as "" | AuxilioTipo, page: 1 }))
            }
          >
            <option value="">Tipo: todos</option>
            <option value="auxilio">Auxilio</option>
            <option value="traslado">Traslado</option>
          </select>

          <select
            className="input-dark"
            value={filters.estado}
            onChange={(e) =>
              onFiltersChange((prev) => ({ ...prev, estado: e.target.value as "" | AuxilioEstado, page: 1 }))
            }
          >
            <option value="">Estado: todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_camino">En camino</option>
            <option value="completado">Completado</option>
          </select>

          <select
            className="input-dark"
            value={filters.prioridad}
            onChange={(e) =>
              onFiltersChange((prev) => ({
                ...prev,
                prioridad: e.target.value as "" | AuxilioPrioridad,
                page: 1,
              }))
            }
          >
            <option value="">Prioridad: todas</option>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>

          <input
            className="input-dark"
            type="date"
            value={filters.dateFrom}
            onChange={(e) =>
              onFiltersChange((prev) => ({ ...prev, dateFrom: e.target.value, page: 1 }))
            }
            title="Desde fecha"
          />

          <input
            className="input-dark"
            type="date"
            value={filters.dateTo}
            onChange={(e) =>
              onFiltersChange((prev) => ({ ...prev, dateTo: e.target.value, page: 1 }))
            }
            title="Hasta fecha"
          />

          <select
            className="input-dark"
            value={`${filters.sortBy}:${filters.sortDir}`}
            onChange={(e) => {
              const [sortBy, sortDir] = e.target.value.split(":") as [
                "solicitado_en" | "prioridad" | "estado" | "cliente",
                "asc" | "desc",
              ];
              onFiltersChange((prev) => ({ ...prev, sortBy, sortDir }));
            }}
          >
            <option value="solicitado_en:desc">Fecha (reciente)</option>
            <option value="solicitado_en:asc">Fecha (antigua)</option>
            <option value="prioridad:desc">Prioridad (alta)</option>
            <option value="prioridad:asc">Prioridad (baja)</option>
            <option value="cliente:asc">Cliente (A-Z)</option>
          </select>
        </div>

        <div className="overflow-x-auto" data-help-id="auxilios-table">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-fede-muted border-b border-fede-border">
                <th className="py-2">Cliente</th>
                <th className="py-2">Tipo</th>
                <th className="py-2">Prioridad</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Ubicación</th>
                <th className="py-2">Fecha</th>
                <th className="py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-4 text-fede-muted" colSpan={7}>
                    Cargando operaciones...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td className="py-4 text-fede-muted" colSpan={7}>
                    Sin resultados con los filtros actuales.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="border-b border-fede-border/40 align-top">
                    <td className="py-2">
                      <p className="font-medium">{item.clienteNombre}</p>
                      <p className="text-xs text-fede-muted">{item.telefono}</p>
                      {item.vehiculo && <p className="text-xs text-fede-muted">{item.vehiculo}</p>}
                    </td>
                    <td className="py-2 capitalize">{item.tipo}</td>
                    <td className="py-2">
                      <select
                        className="input-dark text-xs py-1"
                        value={item.prioridad}
                        onChange={(e) => {
                          void onPatch(item.id, {
                            prioridad: e.target.value as AuxilioPrioridad,
                          });
                        }}
                      >
                        <option value="baja">Baja</option>
                        <option value="media">Media</option>
                        <option value="alta">Alta</option>
                        <option value="urgente">Urgente</option>
                      </select>
                    </td>
                    <td className="py-2 capitalize">{item.estado.replace("_", " ")}</td>
                    <td className="py-2 text-xs text-fede-muted">
                      {item.origen.lat.toFixed(4)}, {item.origen.lng.toFixed(4)}
                      {item.tipo === "traslado" && item.destino ? (
                        <>
                          <br />
                          ➜ {item.destino.lat.toFixed(4)}, {item.destino.lng.toFixed(4)}
                        </>
                      ) : null}
                    </td>
                    <td className="py-2 text-xs text-fede-muted">
                      {new Date(item.solicitadoEn).toLocaleString("es-UY")}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1 flex-wrap">
                        {item.estado === "pendiente" && (
                          <button
                            className="btn-outline text-[11px] px-2 py-1"
                            onClick={() => {
                              void onPatch(item.id, { estado: "en_camino" });
                            }}
                          >
                            Enviar
                          </button>
                        )}
                        {item.estado !== "completado" && (
                          <button
                            className="btn-outline text-[11px] px-2 py-1"
                            onClick={() => {
                              void onPatch(item.id, { estado: "completado" });
                            }}
                          >
                            Completar
                          </button>
                        )}
                        <a
                          className="btn-outline text-[11px] px-2 py-1"
                          href={`tel:${item.telefono.replace(/\s/g, "")}`}
                        >
                          Llamar
                        </a>
                        <a
                          className="btn-outline text-[11px] px-2 py-1"
                          href={buildOperationMapsLink(item)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver mapa
                        </a>
                        <a
                          className="btn-outline text-[11px] px-2 py-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                          href={buildWhatsAppDispatchLink(item)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Despachar
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          pagination={pagination}
          onPageChange={(nextPage) => onFiltersChange((prev) => ({ ...prev, page: nextPage }))}
        />
      </div>
    </div>
  );
}

export function MembresiasTableTab({
  loading,
  rows,
  pagination,
  resumen,
  filters,
  onFiltersChange,
  onOpenCreate,
  onOpenBulk,
  onEdit,
  onRenew,
  onGoHistory,
}: {
  loading: boolean;
  rows: MembresiaRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  resumen: { total: number; vencidas: number; proximas: number; activas: number; inactivas: number };
  filters: {
    estado: "todas" | MembresiaEstado;
    vencimiento: "vencida" | "proxima" | "activa" | "inactiva" | "todas";
    plan: "todas" | "basico" | "premium";
    search: string;
    sortBy:
      | "fecha_fin"
      | "nombre"
      | "estado"
      | "plan"
      | "auxilios_restantes"
      | "ultimo_service";
    sortDir: "asc" | "desc";
    page: number;
    pageSize: number;
  };
  onFiltersChange: React.Dispatch<
    React.SetStateAction<{
      estado: "todas" | MembresiaEstado;
      vencimiento: "vencida" | "proxima" | "activa" | "inactiva" | "todas";
      plan: "todas" | "basico" | "premium";
      search: string;
      sortBy:
        | "fecha_fin"
        | "nombre"
        | "estado"
        | "plan"
        | "auxilios_restantes"
        | "ultimo_service";
      sortDir: "asc" | "desc";
      page: number;
      pageSize: number;
    }>
  >;
  onOpenCreate: () => void;
  onOpenBulk: () => void;
  onEdit: (row: MembresiaRow) => void;
  onRenew: (row: MembresiaRow) => Promise<void>;
  onGoHistory: (row: MembresiaRow) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatMini label="Total" value={resumen.total} />
        <StatMini label="Vencidas" value={resumen.vencidas} />
        <StatMini label="Próximas" value={resumen.proximas} />
        <StatMini label="Activas" value={resumen.activas} />
        <StatMini label="Inactivas" value={resumen.inactivas} />
      </div>

      <div className="glass-card p-4 space-y-3">
        <div className="flex gap-2 flex-wrap items-center justify-between">
          <div className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-fede-accent" />
            Membresías (tabla avanzada)
          </div>
          <div className="flex gap-2">
            <button className="btn-outline text-xs py-2 px-3" onClick={onOpenBulk}>
              Carga masiva
            </button>
            <button className="btn-primary text-xs py-2 px-3" onClick={onOpenCreate}>
              + Nueva membresía
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <div className="md:col-span-2 relative">
            <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-fede-muted" />
            <input
              className="input-dark pl-8"
              placeholder="Buscar nombre/teléfono"
              value={filters.search}
              onChange={(e) => onFiltersChange((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
            />
          </div>

          <select
            className="input-dark"
            value={filters.estado}
            onChange={(e) =>
              onFiltersChange((prev) => ({
                ...prev,
                estado: e.target.value as "todas" | MembresiaEstado,
                page: 1,
              }))
            }
          >
            <option value="todas">Estado: todos</option>
            <option value="activo">Activo</option>
            <option value="pendiente">Pendiente</option>
            <option value="inactivo">Inactivo</option>
          </select>

          <select
            className="input-dark"
            value={filters.vencimiento}
            onChange={(e) =>
              onFiltersChange((prev) => ({
                ...prev,
                vencimiento: e.target.value as
                  | "vencida"
                  | "proxima"
                  | "activa"
                  | "inactiva"
                  | "todas",
                page: 1,
              }))
            }
          >
            <option value="todas">Vencimiento: todos</option>
            <option value="vencida">Vencidas</option>
            <option value="proxima">Próximas (&lt;=7)</option>
            <option value="activa">Activas</option>
            <option value="inactiva">Inactivas</option>
          </select>

          <select
            className="input-dark"
            value={filters.plan}
            onChange={(e) =>
              onFiltersChange((prev) => ({
                ...prev,
                plan: e.target.value as "todas" | "basico" | "premium",
                page: 1,
              }))
            }
          >
            <option value="todas">Plan: todos</option>
            <option value="basico">Básico</option>
            <option value="premium">Premium</option>
          </select>

          <select
            className="input-dark"
            value={`${filters.sortBy}:${filters.sortDir}`}
            onChange={(e) => {
              const [sortBy, sortDir] = e.target.value.split(":") as [
                | "fecha_fin"
                | "nombre"
                | "estado"
                | "plan"
                | "auxilios_restantes"
                | "ultimo_service",
                "asc" | "desc",
              ];
              onFiltersChange((prev) => ({ ...prev, sortBy, sortDir }));
            }}
          >
            <option value="fecha_fin:asc">Vencimiento (cercano)</option>
            <option value="fecha_fin:desc">Vencimiento (lejano)</option>
            <option value="nombre:asc">Cliente (A-Z)</option>
            <option value="estado:asc">Estado</option>
            <option value="ultimo_service:desc">Último service</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1050px]">
            <thead>
              <tr className="text-left text-fede-muted border-b border-fede-border">
                <th className="py-2">Cliente</th>
                <th className="py-2">Plan/Estado</th>
                <th className="py-2">Inicio</th>
                <th className="py-2">Fin</th>
                <th className="py-2">Días</th>
                <th className="py-2">Cupos</th>
                <th className="py-2">Último auxilio</th>
                <th className="py-2">Último service</th>
                <th className="py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-4 text-fede-muted" colSpan={9}>
                    Cargando membresías...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="py-4 text-fede-muted" colSpan={9}>
                    No hay resultados para estos filtros.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const statusColor =
                    row.diasParaVencer < 0
                      ? "text-red-400"
                      : row.diasParaVencer <= 7
                      ? "text-yellow-400"
                      : "text-green-400";
                  return (
                    <tr key={row.membresiaId} className="border-b border-fede-border/40 align-top">
                      <td className="py-2">
                        <p className="font-medium">{row.nombre}</p>
                        <p className="text-xs text-fede-muted">{row.telefono}</p>
                        <p className="text-xs text-fede-muted">{row.moto}</p>
                      </td>
                      <td className="py-2">
                        <p className="capitalize">{row.plan}</p>
                        <p className="text-xs text-fede-muted capitalize">{row.estado}</p>
                      </td>
                      <td className="py-2 text-xs text-fede-muted">{row.fechaInicio}</td>
                      <td className="py-2 text-xs text-fede-muted">{row.fechaFin}</td>
                      <td className={`py-2 font-medium ${statusColor}`}>{row.diasParaVencer}</td>
                      <td className="py-2">{row.auxiliosRestantes}</td>
                      <td className="py-2 text-xs text-fede-muted">
                        {row.ultimoAuxilioAt
                          ? new Date(row.ultimoAuxilioAt).toLocaleDateString("es-UY")
                          : "-"}
                      </td>
                      <td className="py-2 text-xs text-fede-muted">
                        {row.ultimoServiceAt
                          ? `${new Date(row.ultimoServiceAt).toLocaleDateString("es-UY")}${
                              typeof row.ultimoServiceKm === "number"
                                ? ` (${row.ultimoServiceKm.toLocaleString()} km)`
                                : ""
                            }`
                          : "-"}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1 flex-wrap">
                          <button className="btn-outline text-[11px] px-2 py-1" onClick={() => onEdit(row)}>
                            Editar
                          </button>
                          <button
                            className="btn-outline text-[11px] px-2 py-1"
                            onClick={() => {
                              void onRenew(row);
                            }}
                          >
                            Renovar
                          </button>
                          <a
                            className="btn-outline text-[11px] px-2 py-1"
                            href={`https://wa.me/${row.telefono.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            WhatsApp
                          </a>
                          <button
                            className="btn-outline text-[11px] px-2 py-1"
                            onClick={() => onGoHistory(row)}
                          >
                            Historial
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          pagination={pagination}
          onPageChange={(nextPage) => onFiltersChange((prev) => ({ ...prev, page: nextPage }))}
        />
      </div>
    </div>
  );
}

export function RemindersTab({
  loading,
  rows,
  pagination,
  filters,
  onFiltersChange,
  onMarkSent,
  onSkip,
}: {
  loading: boolean;
  rows: ReminderQueueItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  filters: {
    tipo:
      | "todos"
      | "membresia_vence_7"
      | "membresia_vence_3"
      | "membresia_vence_1"
      | "service_control_30";
    estado: "todos" | "pendiente" | "enviado_manual" | "omitido" | "error";
    date: string;
    search: string;
    page: number;
    pageSize: number;
  };
  onFiltersChange: React.Dispatch<
    React.SetStateAction<{
      tipo:
        | "todos"
        | "membresia_vence_7"
        | "membresia_vence_3"
        | "membresia_vence_1"
        | "service_control_30";
      estado: "todos" | "pendiente" | "enviado_manual" | "omitido" | "error";
      date: string;
      search: string;
      page: number;
      pageSize: number;
    }>
  >;
  onMarkSent: (id: string) => Promise<void>;
  onSkip: (id: string) => Promise<void>;
}) {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="text-sm font-medium flex items-center gap-2">
        <Bell className="w-4 h-4 text-fede-accent" />
        Cola de recordatorios (WhatsApp manual)
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          className={`btn-outline text-xs px-3 py-1.5 ${
            filters.estado === "pendiente" ? "border-white text-white" : ""
          }`}
          onClick={() => onFiltersChange((prev) => ({ ...prev, estado: "pendiente", page: 1 }))}
        >
          Pendientes
        </button>
        <button
          className={`btn-outline text-xs px-3 py-1.5 ${
            filters.estado === "enviado_manual" ? "border-white text-white" : ""
          }`}
          onClick={() =>
            onFiltersChange((prev) => ({ ...prev, estado: "enviado_manual", page: 1 }))
          }
        >
          Enviados
        </button>
        <button
          className={`btn-outline text-xs px-3 py-1.5 ${
            filters.estado === "omitido" ? "border-white text-white" : ""
          }`}
          onClick={() => onFiltersChange((prev) => ({ ...prev, estado: "omitido", page: 1 }))}
        >
          Omitidos
        </button>
        <button
          className={`btn-outline text-xs px-3 py-1.5 ${
            filters.estado === "todos" ? "border-white text-white" : ""
          }`}
          onClick={() => onFiltersChange((prev) => ({ ...prev, estado: "todos", page: 1 }))}
        >
          Todos
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <div className="md:col-span-2 relative">
          <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-fede-muted" />
          <input
            className="input-dark pl-8"
            placeholder="Buscar cliente"
            value={filters.search}
            onChange={(e) => onFiltersChange((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
          />
        </div>

        <select
          className="input-dark"
          value={filters.tipo}
          onChange={(e) =>
            onFiltersChange((prev) => ({
              ...prev,
              tipo: e.target.value as
                | "todos"
                | "membresia_vence_7"
                | "membresia_vence_3"
                | "membresia_vence_1"
                | "service_control_30",
              page: 1,
            }))
          }
        >
          <option value="todos">Tipo: todos</option>
          <option value="membresia_vence_7">Membresía - 7 días</option>
          <option value="membresia_vence_3">Membresía - 3 días</option>
          <option value="membresia_vence_1">Membresía - 1 día</option>
          <option value="service_control_30">Service - 30 días</option>
        </select>

        <select
          className="input-dark"
          value={filters.estado}
          onChange={(e) =>
            onFiltersChange((prev) => ({
              ...prev,
              estado: e.target.value as "todos" | "pendiente" | "enviado_manual" | "omitido" | "error",
              page: 1,
            }))
          }
        >
          <option value="todos">Estado: todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="enviado_manual">Enviado</option>
          <option value="omitido">Omitido</option>
          <option value="error">Error</option>
        </select>

        <input
          className="input-dark"
          type="date"
          value={filters.date}
          onChange={(e) => onFiltersChange((prev) => ({ ...prev, date: e.target.value, page: 1 }))}
        />
      </div>

      <div className="space-y-2" data-help-id="reminders-list">
        {loading ? (
          <p className="text-sm text-fede-muted">Cargando recordatorios...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-fede-muted">Sin recordatorios para esta vista.</p>
        ) : (
          rows.map((item) => {
            const isPending = item.status === "pendiente";
            return (
              <div key={item.id} className="rounded-xl border border-fede-border p-3 bg-fede-black/40">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.clienteNombre}</p>
                    <p className="text-xs text-fede-muted">{item.telefono}</p>
                    <p className="text-xs text-fede-muted">{normalizeReminderType(item.tipoEvento)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-fede-muted">
                      {new Date(item.scheduledDate).toLocaleDateString("es-UY")}
                    </p>
                    <p className="text-xs capitalize">{item.status.replace("_", " ")}</p>
                  </div>
                </div>
                <p className="text-xs mt-2 text-fede-muted">{item.messagePreview}</p>
                {(item.sentAt || item.sentBy || item.skipReason) && (
                  <div className="mt-2 rounded-lg border border-fede-border/60 bg-fede-black/30 px-2 py-1.5 text-[11px] text-fede-muted">
                    {item.sentAt && (
                      <p>Gestionado: {new Date(item.sentAt).toLocaleString("es-UY")}</p>
                    )}
                    {item.sentBy && <p>Operador: {item.sentBy}</p>}
                    {item.skipReason && <p>Motivo omitido: {item.skipReason}</p>}
                  </div>
                )}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <a
                    href={item.waLink}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!isPending}
                    onClick={(event) => {
                      if (!isPending) {
                        event.preventDefault();
                      }
                    }}
                    className={`text-[11px] px-2 py-1 inline-flex items-center gap-1 ${
                      isPending ? "btn-primary" : "btn-outline opacity-50 pointer-events-none"
                    }`}
                  >
                    <MessageCircle className="w-3 h-3" />
                    Enviar por WhatsApp
                  </a>
                  <button
                    className="btn-outline text-[11px] px-2 py-1 inline-flex items-center gap-1"
                    disabled={!isPending}
                    onClick={() => {
                      void onMarkSent(item.id);
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Marcar enviado
                  </button>
                  <button
                    className="btn-outline text-[11px] px-2 py-1 inline-flex items-center gap-1"
                    disabled={!isPending}
                    onClick={() => {
                      void onSkip(item.id);
                    }}
                  >
                    <SkipForward className="w-3 h-3" />
                    Omitir
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Pagination
        pagination={pagination}
        onPageChange={(nextPage) => onFiltersChange((prev) => ({ ...prev, page: nextPage }))}
      />
    </div>
  );
}

export function ServiciosTab({
  servicios,
  search,
  onSearchChange,
  onNuevo,
  onGenerarRecibo,
}: {
  servicios: ServicioRegistro[];
  search: string;
  onSearchChange: (value: string) => void;
  onNuevo: () => void;
  onGenerarRecibo?: (servicio: ServicioRegistro) => void;
}) {
  const handleGenerarRecibo = async (servicio: ServicioRegistro) => {
    if (onGenerarRecibo) {
      onGenerarRecibo(servicio);
      return;
    }
    try {
      await generateOperationalReceiptPdf(servicio);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "No se pudo generar el recibo. Reintentá en unos segundos."
      );
    }
  };

  const handleExportCSV = () => {
    const headers = "Fecha,Cliente,Moto,Servicio,Km,Costo,Estado\n";
    const rows = servicios
      .map(
        (item) =>
          `${item.fecha},${item.clienteNombre},${item.moto},${item.servicio},${item.kilometraje},${item.costo},${item.estado}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "servicios_fede_motos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Wrench className="w-5 h-5 text-fede-accent" /> Historial de servicios
          </h3>
          <p className="text-sm text-fede-muted">Mantenimientos, diagnósticos y reparaciones.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline text-xs py-2 px-3" onClick={handleExportCSV}>
            <Download className="w-3 h-3 inline mr-1" /> CSV
          </button>
          <button onClick={onNuevo} className="btn-primary text-xs py-2 px-3">
            + Cargar servicio
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-fede-muted" />
        <input
          className="input-dark pl-8"
          placeholder="Buscar por cliente/moto/servicio"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {servicios.map((item) => (
          <div key={item.id} className="rounded-xl border border-fede-border p-3 bg-fede-black/40">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-medium">{item.servicio}</p>
                <p className="text-xs text-fede-muted">{item.clienteNombre} - {item.moto}</p>
                <p className="text-xs text-fede-muted">{new Date(item.fecha).toLocaleDateString("es-UY")}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">$ {item.costo.toLocaleString()}</p>
                <p className="text-xs text-fede-muted">{item.kilometraje.toLocaleString()} km</p>
              </div>
            </div>
            {item.estado === "completado" && (
              <div className="mt-2">
                <button
                  className="btn-outline text-[11px] px-2 py-1"
                  onClick={() => {
                    void handleGenerarRecibo(item);
                  }}
                  data-help-id="servicios-receipt-button"
                >
                  Generar recibo PDF
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
