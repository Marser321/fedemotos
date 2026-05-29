"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import type { ServicioRegistro } from "@/lib/types";
import { CargarServicioModal } from "@/components/AdminModals";
import { ServiciosTab } from "@/app/(admin)/admin/_components";
import { parseApiResponse } from "@/app/(admin)/admin/_shared";
import { useSearchParams } from "next/navigation";
import { ReceiptModal } from "@/components/ReceiptModal";


export function AdminServiciosClient() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [servicios, setServicios] = useState<ServicioRegistro[]>([]);
  const [serviciosSearch, setServiciosSearch] = useState(initialSearch);
  const [loading, setLoading] = useState(false);
  const [uiError, setUiError] = useState("");
  const [modalServicio, setModalServicio] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceiptServicio, setSelectedReceiptServicio] = useState<ServicioRegistro | null>(null);


  const fetchServicios = useCallback(async () => {
    setLoading(true);
    setUiError("");
    try {
      const response = await fetch("/api/admin/servicios", { cache: "no-store" });
      const data = await parseApiResponse<{ ok: true; data: ServicioRegistro[] }>(response);
      setServicios(data.data);
    } catch (error) {
      setUiError(error instanceof Error ? error.message : "No se pudieron cargar servicios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchServicios();
  }, [fetchServicios]);

  const filteredServicios = useMemo(() => {
    const search = serviciosSearch.trim().toLowerCase();
    if (!search) return servicios;
    return servicios.filter((item) =>
      [item.clienteNombre, item.moto, item.servicio].join(" ").toLowerCase().includes(search)
    );
  }, [servicios, serviciosSearch]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-fede-accent/20 bg-fede-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-fede-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-fede-accent shadow-[0_0_12px_rgba(172,28,29,0.8)]" />
            Historial
          </p>
          <h1 className="mt-1 text-2xl font-bold">Servicios completados</h1>
          <p className="mt-1 text-sm text-fede-muted">
            Registro histórico de reparaciones, mantenimiento y control del taller.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-sm"
            onClick={() => void fetchServicios()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <button
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
            onClick={() => setModalServicio(true)}
          >
            <Plus className="h-4 w-4" />
            Cargar servicio
          </button>
        </div>
      </header>

      {uiError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {uiError}
        </div>
      )}

      {loading && servicios.length === 0 ? (
        <div className="flex justify-center py-10 text-sm text-fede-muted">
          Cargando historial de servicios...
        </div>
      ) : (
        <section>
          <ServiciosTab
            servicios={filteredServicios}
            search={serviciosSearch}
            onSearchChange={setServiciosSearch}
            onNuevo={() => setModalServicio(true)}
            onGenerarRecibo={(item) => {
              setSelectedReceiptServicio(item);
              setReceiptModalOpen(true);
            }}
          />
        </section>
      )}

      <CargarServicioModal
        isOpen={modalServicio}
        onClose={() => setModalServicio(false)}
        onSuccess={async () => {
          await fetchServicios();
        }}
      />

      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false);
          setSelectedReceiptServicio(null);
        }}
        servicio={selectedReceiptServicio}
      />
    </div>
  );
}
