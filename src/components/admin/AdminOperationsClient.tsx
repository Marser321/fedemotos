"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import type {
  AuxilioEstado,
  AuxilioPrioridad,
  AuxilioTipo,
  OperacionAuxilioItem,
} from "@/lib/types";
import { NuevaOperacionModal } from "@/components/AdminModals";
import { AuxiliosOperativosTab } from "@/app/(admin)/admin/_components";
import { buildQuery, parseApiResponse, type OperacionesApiResponse } from "@/app/(admin)/admin/_shared";

export function AdminOperationsClient() {
  const [operaciones, setOperaciones] = useState<OperacionAuxilioItem[]>([]);
  const [opsPagination, setOpsPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [opsCounters, setOpsCounters] = useState({
    total: 0,
    pendientes: 0,
    enCamino: 0,
    completados: 0,
    auxilios: 0,
    traslados: 0,
  });
  const [opsLoading, setOpsLoading] = useState(false);
  const [uiError, setUiError] = useState("");
  const [modalOperacion, setModalOperacion] = useState(false);

  const [opsFilters, setOpsFilters] = useState({
    tipo: "" as "" | AuxilioTipo,
    estado: "" as "" | AuxilioEstado,
    prioridad: "" as "" | AuxilioPrioridad,
    search: "",
    dateFrom: "",
    dateTo: "",
    sortBy: "solicitado_en" as "solicitado_en" | "prioridad" | "estado" | "cliente",
    sortDir: "desc" as "asc" | "desc",
    page: 1,
    pageSize: 20,
  });

  const fetchOperaciones = useCallback(async () => {
    setOpsLoading(true);
    setUiError("");
    try {
      const query = buildQuery({
        ...opsFilters,
        tipo: opsFilters.tipo || undefined,
        estado: opsFilters.estado || undefined,
        prioridad: opsFilters.prioridad || undefined,
      });
      const response = await fetch(`/api/admin/auxilios?${query}`, { cache: "no-store" });
      const data = await parseApiResponse<OperacionesApiResponse>(response);
      setOperaciones(data.data);
      setOpsPagination(data.pagination);
      setOpsCounters(data.counters);
    } catch (error) {
      setUiError(error instanceof Error ? error.message : "No se pudieron cargar operaciones");
    } finally {
      setOpsLoading(false);
    }
  }, [opsFilters]);

  useEffect(() => {
    void fetchOperaciones();
  }, [fetchOperaciones]);

  const handlePatchOperacion = async (
    id: string,
    patch: Partial<{ estado: AuxilioEstado; prioridad: AuxilioPrioridad; notasInternas: string }>
  ) => {
    setUiError("");
    try {
      const response = await fetch(`/api/admin/auxilios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await parseApiResponse<{ ok: true; id: string }>(response);
      await fetchOperaciones();
    } catch (error) {
      setUiError(error instanceof Error ? error.message : "No se pudo actualizar operación");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-fede-accent/20 bg-fede-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-fede-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-fede-accent shadow-[0_0_12px_rgba(172,28,29,0.8)]" />
            Auxilios y Traslados
          </p>
          <h1 className="mt-1 text-2xl font-bold">Operaciones</h1>
          <p className="mt-1 text-sm text-fede-muted">
            Monitoreo y despacho de auxilios mecánicos e in-situ y traslados contratados.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-sm"
            onClick={() => void fetchOperaciones()}
            disabled={opsLoading}
          >
            <RefreshCw className={`h-4 w-4 ${opsLoading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <button
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
            onClick={() => setModalOperacion(true)}
          >
            <Plus className="h-4 w-4" />
            Nueva solicitud
          </button>
        </div>
      </header>

      {uiError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {uiError}
        </div>
      )}

      <section>
        <AuxiliosOperativosTab
          loading={opsLoading}
          data={operaciones}
          counters={opsCounters}
          pagination={opsPagination}
          filters={opsFilters}
          onFiltersChange={setOpsFilters}
          onOpenCreate={() => setModalOperacion(true)}
          onPatch={handlePatchOperacion}
        />
      </section>

      <NuevaOperacionModal
        isOpen={modalOperacion}
        onClose={() => setModalOperacion(false)}
        onSuccess={async () => {
          await fetchOperaciones();
        }}
      />
    </div>
  );
}
