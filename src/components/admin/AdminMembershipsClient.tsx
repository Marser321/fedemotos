"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Upload } from "lucide-react";
import type { MembresiaEstado, MembresiaRow } from "@/lib/types";
import { NuevaMembresiaModal } from "@/components/AdminModals";
import { CargaMasivaModal } from "@/components/CargaMasivaModal";
import { MembresiasTableTab, MembershipEditModal } from "@/app/(admin)/admin/_components";
import { buildQuery, parseApiResponse, type MembresiasApiResponse } from "@/app/(admin)/admin/_shared";
import { useRouter } from "next/navigation";

export function AdminMembershipsClient() {
  const router = useRouter();
  const [membresias, setMembresias] = useState<MembresiaRow[]>([]);
  const [membresiasPagination, setMembresiasPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [membresiasResumen, setMembresiasResumen] = useState({
    total: 0,
    vencidas: 0,
    proximas: 0,
    activas: 0,
    inactivas: 0,
  });
  const [membresiasLoading, setMembresiasLoading] = useState(false);
  const [uiError, setUiError] = useState("");

  const [modalMembresia, setModalMembresia] = useState(false);
  const [modalCargaMasiva, setModalCargaMasiva] = useState(false);
  const [editingMembership, setEditingMembership] = useState<MembresiaRow | null>(null);

  const [membresiasFilters, setMembresiasFilters] = useState({
    estado: "todas" as "todas" | MembresiaEstado,
    vencimiento: "todas" as "vencida" | "proxima" | "activa" | "inactiva" | "todas",
    plan: "todas" as "todas" | "basico" | "premium",
    search: "",
    sortBy: "fecha_fin" as
      | "fecha_fin"
      | "nombre"
      | "estado"
      | "plan"
      | "auxilios_restantes"
      | "ultimo_service",
    sortDir: "asc" as "asc" | "desc",
    page: 1,
    pageSize: 20,
  });

  const fetchMembresias = useCallback(async () => {
    setMembresiasLoading(true);
    setUiError("");
    try {
      const query = buildQuery(membresiasFilters);
      const response = await fetch(`/api/admin/membresias?${query}`, { cache: "no-store" });
      const data = await parseApiResponse<MembresiasApiResponse>(response);
      setMembresias(data.data);
      setMembresiasPagination(data.pagination);
      setMembresiasResumen(data.resumen);
    } catch (error) {
      setUiError(error instanceof Error ? error.message : "No se pudieron cargar membresías");
    } finally {
      setMembresiasLoading(false);
    }
  }, [membresiasFilters]);

  useEffect(() => {
    void fetchMembresias();
  }, [fetchMembresias]);

  const handleRenovar = async (row: MembresiaRow) => {
    setUiError("");
    try {
      const response = await fetch("/api/suscripciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _action: "renew", id: row.clienteId }),
      });
      await parseApiResponse<{ ok: true; id: string }>(response);
      await fetchMembresias();
    } catch (error) {
      setUiError(error instanceof Error ? error.message : "No se pudo renovar membresía");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-fede-accent/20 bg-fede-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-fede-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-fede-accent shadow-[0_0_12px_rgba(172,28,29,0.8)]" />
            Clientes
          </p>
          <h1 className="mt-1 text-2xl font-bold">Membresías</h1>
          <p className="mt-1 text-sm text-fede-muted">
            Control de suscripciones de auxilio mecánico, pagos mensuales y renovación.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-sm"
            onClick={() => void fetchMembresias()}
            disabled={membresiasLoading}
          >
            <RefreshCw className={`h-4 w-4 ${membresiasLoading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <button
            className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-sm"
            onClick={() => setModalCargaMasiva(true)}
          >
            <Upload className="h-4 w-4" />
            Carga masiva
          </button>
          <button
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
            onClick={() => setModalMembresia(true)}
          >
            <Plus className="h-4 w-4" />
            Nueva membresía
          </button>
        </div>
      </header>

      {uiError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {uiError}
        </div>
      )}

      <section>
        <MembresiasTableTab
          loading={membresiasLoading}
          rows={membresias}
          pagination={membresiasPagination}
          resumen={membresiasResumen}
          filters={membresiasFilters}
          onFiltersChange={setMembresiasFilters}
          onOpenCreate={() => setModalMembresia(true)}
          onOpenBulk={() => setModalCargaMasiva(true)}
          onEdit={(row) => setEditingMembership(row)}
          onRenew={handleRenovar}
          onGoHistory={(row) => {
            router.push(`/admin/servicios?search=${encodeURIComponent(row.nombre)}`);
          }}
        />
      </section>

      <NuevaMembresiaModal
        isOpen={modalMembresia}
        onClose={() => setModalMembresia(false)}
        onSuccess={async () => {
          await fetchMembresias();
        }}
      />

      <CargaMasivaModal
        isOpen={modalCargaMasiva}
        onClose={() => setModalCargaMasiva(false)}
        onSuccess={async () => {
          await fetchMembresias();
        }}
      />

      <MembershipEditModal
        isOpen={Boolean(editingMembership)}
        membership={editingMembership}
        onClose={() => setEditingMembership(null)}
        onSaved={async () => {
          await fetchMembresias();
        }}
      />
    </div>
  );
}
