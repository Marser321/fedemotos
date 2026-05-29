"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ClipboardList,
  DollarSign,
  Loader2,
  Wrench,
  X,
  History,
} from "lucide-react";
import type { OrdenEstado, OrdenTaller } from "@/lib/types";
import { ReceiptModal } from "@/components/ReceiptModal";

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  onSaved: () => Promise<void>;
}

const estados: Array<{ value: OrdenEstado; label: string; tone: string }> = [
  { value: "ingresado", label: "Ingresado", tone: "border-fede-accent/30 bg-fede-accent/10 text-fede-accent" },
  { value: "diagnostico", label: "Diagnóstico", tone: "border-blue-500/30 bg-blue-500/10 text-blue-200" },
  { value: "espera_repuestos", label: "Espera repuestos", tone: "border-yellow-500/30 bg-yellow-500/10 text-yellow-200" },
  { value: "reparacion", label: "Reparación", tone: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200" },
  { value: "listo", label: "Listo", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" },
  { value: "entregado", label: "Entregado", tone: "border-white/15 bg-white/5 text-zinc-200" },
  { value: "cancelado", label: "Cancelado", tone: "border-red-500/30 bg-red-500/10 text-red-200" },
];

function getEstadoLabel(value: OrdenEstado) {
  return estados.find((item) => item.value === value)?.label ?? value;
}

function getEstadoTone(value: OrdenEstado) {
  return estados.find((item) => item.value === value)?.tone ?? "";
}

export function EditOrderModal({ isOpen, onClose, orderId, onSaved }: EditOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<OrdenTaller | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const [form, setForm] = useState({
    titulo: "",
    estado: "ingresado" as OrdenEstado,
    costoEstimado: 0,
    costoFinal: 0,
    fechaPrometida: "",
    descripcion: "",
    diagnostico: "",
    notasInternas: "",
  });

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/ordenes/${orderId}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || json.ok === false) {
        throw new Error(json.error?.message || "No se pudo obtener detalles de la orden");
      }
      const data = json.data as OrdenTaller;
      setOrder(data);
      setForm({
        titulo: data.titulo,
        estado: data.estado,
        costoEstimado: data.costoEstimado || 0,
        costoFinal: data.costoFinal || 0,
        fechaPrometida: data.fechaPrometida || "",
        descripcion: data.descripcion || "",
        diagnostico: data.diagnostico || "",
        notasInternas: data.notasInternas || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar la orden");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (isOpen && orderId) {
      void fetchOrderDetails();
    } else {
      setOrder(null);
    }
  }, [isOpen, orderId, fetchOrderDetails]);

  if (!isOpen || !orderId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/ordenes/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: form.estado,
          titulo: form.titulo.trim(),
          costoEstimado: Number(form.costoEstimado),
          costoFinal: Number(form.costoFinal),
          fechaPrometida: form.fechaPrometida || null,
          descripcion: form.descripcion.trim() || null,
          diagnostico: form.diagnostico.trim() || null,
          notasInternas: form.notasInternas.trim() || null,
        }),
      });

      const json = await response.json();
      if (!response.ok || json.ok === false) {
        throw new Error(json.error?.message || "No se pudo guardar la orden");
      }

      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const getTimelineIcon = (tipo: string) => {
    switch (tipo) {
      case "creacion":
        return <ClipboardList className="h-4.5 w-4.5 text-fede-accent" />;
      case "estado":
        return <Wrench className="h-4.5 w-4.5 text-cyan-400" />;
      default:
        return <History className="h-4.5 w-4.5 text-zinc-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-5xl rounded-xl border border-fede-border bg-zinc-950 px-5 py-6 shadow-[0_24px_70px_rgba(0,0,0,0.5)] max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg border border-fede-accent/25 bg-fede-accent/10">
                <Wrench className="h-4 w-4 text-fede-accent" />
              </span>
              <h3 className="font-bold text-lg text-white">Editar Orden de Taller</h3>
            </div>
            {order && (
              <p className="text-xs text-fede-muted mt-1">
                Cliente: <span className="text-white font-medium">{order.clienteNombre}</span> ({order.telefono}) · Vehículo: <span className="text-white font-medium">{order.vehiculo || "No registrado"}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-fede-border p-1.5 text-fede-muted hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-fede-muted">
            <Loader2 className="w-8 h-8 animate-spin text-fede-accent" />
            <span>Cargando ficha de orden...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 grid gap-6 md:grid-cols-5">
            
            {/* Form Column */}
            <form onSubmit={handleSubmit} className="md:col-span-3 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-fede-muted mb-1">Trabajo a realizar</label>
                  <input
                    className="input-dark"
                    value={form.titulo}
                    onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fede-muted mb-1">Estado de reparación</label>
                  <select
                    className="input-dark capitalize"
                    value={form.estado}
                    onChange={(e) => setForm((prev) => ({ ...prev, estado: e.target.value as OrdenEstado }))}
                  >
                    {estados.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fede-muted mb-1">Fecha prometida de entrega</label>
                  <input
                    className="input-dark"
                    type="date"
                    value={form.fechaPrometida}
                    onChange={(e) => setForm((prev) => ({ ...prev, fechaPrometida: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fede-muted mb-1">Costo estimado ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fede-muted" />
                    <input
                      className="input-dark pl-8"
                      type="number"
                      min={0}
                      value={form.costoEstimado}
                      onChange={(e) => setForm((prev) => ({ ...prev, costoEstimado: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fede-muted mb-1">Costo final de entrega ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fede-muted" />
                    <input
                      className="input-dark pl-8"
                      type="number"
                      min={0}
                      value={form.costoFinal}
                      onChange={(e) => setForm((prev) => ({ ...prev, costoFinal: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fede-muted mb-1">Síntoma o Descripción de ingreso</label>
                <textarea
                  className="input-dark text-xs"
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Detalle de fallas reportadas por el cliente..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fede-muted mb-1">Diagnóstico técnico</label>
                <textarea
                  className="input-dark text-xs border-cyan-500/20"
                  rows={3}
                  value={form.diagnostico}
                  onChange={(e) => setForm((prev) => ({ ...prev, diagnostico: e.target.value }))}
                  placeholder="Diagnóstico, fallas encontradas y repuestos necesarios..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fede-muted mb-1">Notas internas y comentarios de estado</label>
                <textarea
                  className="input-dark text-xs border-fede-accent/20"
                  rows={2}
                  value={form.notasInternas}
                  onChange={(e) => setForm((prev) => ({ ...prev, notasInternas: e.target.value }))}
                  placeholder="Comentario técnico privado..."
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-between border-t border-white/10 pt-3">
                <div>
                  {(form.estado === "listo" || form.estado === "entregado") && order && (
                    <button
                      type="button"
                      className="btn-outline inline-flex items-center gap-1.5 px-4 py-2 text-xs text-emerald-400 border-emerald-500/35 hover:bg-emerald-500/10"
                      onClick={() => setReceiptModalOpen(true)}
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      Ver Recibo
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-outline px-4 py-2 text-xs"
                    onClick={onClose}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold"
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {saving ? "Guardando..." : "Guardar Ficha"}
                  </button>
                </div>
              </div>

            </form>

            {/* Timeline Column */}
            <div className="md:col-span-2 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-5 flex flex-col max-h-[70vh]">
              <h4 className="font-bold text-sm text-white flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-fede-accent" />
                Historial de la Orden
              </h4>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
                {order?.timeline && order.timeline.length > 0 ? (
                  order.timeline.map((event, idx) => (
                    <div key={event.id} className="relative flex gap-3">
                      {/* Left line decorator */}
                      {idx < order.timeline!.length - 1 && (
                        <span className="absolute left-[15px] top-[26px] bottom-[-22px] w-[1px] bg-zinc-800" />
                      )}
                      
                      {/* Circle wrapper for icon */}
                      <div className="relative z-10 grid h-8 w-8 place-items-center rounded-lg border border-zinc-800 bg-zinc-900 flex-shrink-0">
                        {getTimelineIcon(event.tipo)}
                      </div>

                      {/* Event description */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-xs font-semibold text-white">
                            {event.tipo === "creacion" ? (
                              "Orden Ingresada"
                            ) : event.tipo === "estado" ? (
                              <span>
                                Cambió a{" "}
                                <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${getEstadoTone(event.estadoHasta!)}`}>
                                  {getEstadoLabel(event.estadoHasta!)}
                                </span>
                              </span>
                            ) : (
                              "Nota agregada"
                            )}
                          </p>
                          <span className="text-[10px] text-fede-muted">
                            {new Date(event.createdAt).toLocaleDateString("es-UY", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {event.nota && (
                          <p className="mt-1 text-xs text-neutral-300 bg-zinc-950 p-2 rounded border border-white/5 whitespace-pre-wrap leading-relaxed">
                            {event.nota}
                          </p>
                        )}
                        <p className="text-[10px] text-fede-muted mt-0.5">
                          Por: {event.createdBy === "admin" ? "Operador" : event.createdBy}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-fede-muted italic py-5 text-center">
                    Cargando historial de eventos...
                  </p>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
      
      {order && (
        <ReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          orden={order}
        />
      )}
    </div>
  );
}
