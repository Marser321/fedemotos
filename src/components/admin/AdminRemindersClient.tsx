"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { ReminderQueueItem } from "@/lib/types";
import { RemindersTab } from "@/app/(admin)/admin/_components";
import { buildQuery, parseApiResponse, type RemindersApiResponse } from "@/app/(admin)/admin/_shared";

export function AdminRemindersClient() {
  const [reminders, setReminders] = useState<ReminderQueueItem[]>([]);
  const [remindersPagination, setRemindersPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [uiError, setUiError] = useState("");

  const [reminderFilters, setReminderFilters] = useState({
    tipo: "todos" as
      | "todos"
      | "membresia_vence_7"
      | "membresia_vence_3"
      | "membresia_vence_1"
      | "service_control_30",
    estado: "todos" as "todos" | "pendiente" | "enviado_manual" | "omitido" | "error",
    date: "",
    search: "",
    page: 1,
    pageSize: 20,
  });

  const fetchReminders = useCallback(async () => {
    setRemindersLoading(true);
    setUiError("");
    try {
      const query = buildQuery(reminderFilters);
      const response = await fetch(`/api/admin/reminders?${query}`, { cache: "no-store" });
      const data = await parseApiResponse<RemindersApiResponse>(response);
      setReminders(data.data);
      setRemindersPagination(data.pagination);
    } catch (error) {
      setUiError(error instanceof Error ? error.message : "No se pudieron cargar recordatorios");
    } finally {
      setRemindersLoading(false);
    }
  }, [reminderFilters]);

  useEffect(() => {
    void fetchReminders();
  }, [fetchReminders]);

  const handleMarkReminderSent = async (id: string) => {
    setUiError("");
    try {
      const response = await fetch(`/api/admin/reminders/${id}/mark-sent`, {
        method: "POST",
      });
      await parseApiResponse<{ ok: true; id: string }>(response);
      await fetchReminders();
    } catch (error) {
      setUiError(error instanceof Error ? error.message : "No se pudo marcar envío");
    }
  };

  const handleSkipReminder = async (id: string) => {
    setUiError("");
    try {
      const reason =
        window.prompt("Motivo para omitir (opcional). Este texto queda auditado.", "") || "";
      const response = await fetch(`/api/admin/reminders/${id}/skip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      await parseApiResponse<{ ok: true; id: string }>(response);
      await fetchReminders();
    } catch (error) {
      setUiError(error instanceof Error ? error.message : "No se pudo omitir recordatorio");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-fede-accent/20 bg-fede-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-fede-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-fede-accent shadow-[0_0_12px_rgba(172,28,29,0.8)]" />
            Notificaciones
          </p>
          <h1 className="mt-1 text-2xl font-bold">Recordatorios</h1>
          <p className="mt-1 text-sm text-fede-muted">
            Cola de recordatorios manuales por WhatsApp para vencimiento de membresía y controles.
          </p>
        </div>
        <button
          className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-sm"
          onClick={() => void fetchReminders()}
          disabled={remindersLoading}
        >
          <RefreshCw className={`h-4 w-4 ${remindersLoading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </header>

      {uiError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {uiError}
        </div>
      )}

      <section>
        <RemindersTab
          loading={remindersLoading}
          rows={reminders}
          pagination={remindersPagination}
          filters={reminderFilters}
          onFiltersChange={setReminderFilters}
          onMarkSent={handleMarkReminderSent}
          onSkip={handleSkipReminder}
        />
      </section>
    </div>
  );
}
