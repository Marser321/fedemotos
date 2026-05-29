import { listarTurnosAgendaAdmin } from "../agenda";
import type { AdminWorkdaySummary } from "../types";
import { getTodayUyDate } from "./shared";
import { listarOperacionesAuxilioAdmin } from "./auxilios";
import { getDashboardStats } from "./dashboard";
import { activeOrdenEstados, listarOrdenesTallerAdmin } from "./ordenes";
import { listarComunicacionesAdmin, listarRecordatoriosAdmin } from "./comunicaciones";

export async function getAdminWorkdayData(): Promise<AdminWorkdaySummary> {
  const today = getTodayUyDate();
  const [stats, operaciones, turnos, ordenes, recordatorios, comunicaciones] = await Promise.all([
    getDashboardStats(),
    listarOperacionesAuxilioAdmin({
      sortBy: "prioridad",
      sortDir: "desc",
      pageSize: 100,
    }),
    listarTurnosAgendaAdmin({
      estado: "todos",
      dateFrom: today,
      dateTo: today,
      pageSize: 12,
    }),
    listarOrdenesTallerAdmin({
      estado: "todas",
      sortBy: "fecha_ingreso",
      sortDir: "desc",
      pageSize: 100,
    }),
    listarRecordatoriosAdmin({
      estado: "pendiente",
      pageSize: 12,
    }),
    listarComunicacionesAdmin({
      estado: "pendiente",
      pageSize: 12,
    }),
  ]);

  const operacionesAbiertas = operaciones.data
    .filter((item) => item.estado !== "completado")
    .slice(0, 8);
  const ordenesActivas = ordenes.data
    .filter((item) => activeOrdenEstados.includes(item.estado))
    .slice(0, 8);

  const alertas: AdminWorkdaySummary["alertas"] = [];
  if (operacionesAbiertas.some((item) => item.prioridad === "urgente")) {
    alertas.push({
      id: "ops-urgentes",
      level: "critical",
      title: "Auxilios urgentes abiertos",
      detail: "Hay solicitudes con prioridad urgente esperando gestion.",
      href: "/admin/operaciones",
    });
  }
  if (ordenesActivas.some((item) => item.estado === "listo")) {
    alertas.push({
      id: "ordenes-listas",
      level: "info",
      title: "Motos listas para entrega",
      detail: "Revisá las órdenes listas y avisá al cliente por WhatsApp.",
      href: "/admin/ordenes?estado=listo",
    });
  }
  if (comunicaciones.pagination.total > 0) {
    alertas.push({
      id: "comunicaciones-pendientes",
      level: "warning",
      title: "Comunicaciones pendientes",
      detail: "La bandeja asistida de WhatsApp tiene mensajes por gestionar.",
      href: "/admin/comunicaciones",
    });
  }

  return {
    stats,
    operacionesAbiertas,
    turnosHoy: turnos.data,
    ordenesActivas,
    recordatoriosPendientes: recordatorios.data,
    comunicacionesPendientes: comunicaciones.data,
    alertas,
  };
}
