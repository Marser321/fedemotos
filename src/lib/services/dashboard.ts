import { getInsforgeServiceClient } from "../insforge";
import type { DashboardStats } from "../types";
import { getPlanPrice, throwDbError, toPlanType } from "./shared";
import { getSolicitudesAuxilio } from "./auxilios";
import { getServiciosRegistro } from "./servicios";
import { getSuscriptores } from "./suscripciones";

export async function getDashboardStats(): Promise<DashboardStats> {
  const service = getInsforgeServiceClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [subs, auxilios, servicios] = await Promise.all([
    service.database.from("membresias").select("estado, plan", { count: "exact" }),
    service.database
      .from("auxilios")
      .select("id", { count: "exact" })
      .gte("solicitado_en", monthStart.toISOString()),
    service.database
      .from("turnos_taller")
      .select("id", { count: "exact" })
      .eq("estado", "completado"),
  ]);

  throwDbError(subs.error, "DASHBOARD_SUBS_FAILED", "No se pudo leer membresías");
  throwDbError(auxilios.error, "DASHBOARD_AUX_FAILED", "No se pudo leer auxilios");
  throwDbError(servicios.error, "DASHBOARD_SERV_FAILED", "No se pudo leer servicios");

  const rows = subs.data ?? [];
  const activosRows = rows.filter((row) => row.estado === "activo");
  const monthlyRevenue = activosRows.reduce((acc, row) => {
    return acc + getPlanPrice(toPlanType(row.plan));
  }, 0);

  return {
    totalSuscriptores: subs.count ?? 0,
    suscriptoresActivos: activosRows.length,
    auxiliosEsteMes: auxilios.count ?? 0,
    facturacionMensual: monthlyRevenue,
    serviciosCompletados: servicios.count ?? 0,
  };
}

export async function getAdminDashboardData() {
  const [suscriptores, solicitudes, servicios, stats] = await Promise.all([
    getSuscriptores(),
    getSolicitudesAuxilio(),
    getServiciosRegistro(),
    getDashboardStats(),
  ]);

  return { suscriptores, solicitudes, servicios, stats };
}
