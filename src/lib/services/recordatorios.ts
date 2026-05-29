import { getInsforgeServiceClient } from "../insforge";
import type { PlanType, ReminderTipoEvento } from "../types";
import {
  addDaysDateOnly,
  type DbResponse,
  diffDaysFromDateOnly,
  getTodayUyDate,
  throwDbError,
  toPlanType,
} from "./shared";
import {
  crearComunicacionOperativa,
  scheduledForTodayAtNineUy,
} from "./comunicaciones";

function buildMembershipReminderMessage(
  nombre: string,
  plan: PlanType,
  fechaFin: string
): string {
  return `Hola ${nombre}, tu membresia ${plan} vence el ${fechaFin}. Si queres, te ayudamos a renovarla hoy por este medio.`;
}

function buildServiceReminderMessage(nombre: string): string {
  return `Hola ${nombre}, ya pasaron 30 dias desde tu ultimo service. Te recomendamos revisar kilometraje para anticipar el proximo control.`;
}

export async function generarRecordatoriosOperativos() {
  const service = getInsforgeServiceClient();
  const hoyUy = getTodayUyDate();
  const scheduledFor = scheduledForTodayAtNineUy();
  let created = 0;
  let skipped = 0;

  const membershipsResp = (await service.database
    .from("membresias")
    .select(
      `
      id,
      cliente_id,
      plan,
      estado,
      fecha_inicio,
      fecha_fin,
      clientes (nombre_completo, telefono)
    `
    )
    .eq("estado", "activo")) as DbResponse<
    Array<{
      id: string;
      cliente_id: string;
      plan: string;
      estado: string;
      fecha_inicio: string;
      fecha_fin: string | null;
      clientes: { nombre_completo: string; telefono: string } | null;
    }>
  >;
  throwDbError(
    membershipsResp.error,
    "REMINDER_MEMBERSHIPS_FETCH_FAILED",
    "No se pudieron leer membresias activas"
  );

  for (const membership of membershipsResp.data ?? []) {
    const cliente = membership.clientes;
    if (!cliente) continue;
    const fechaFin = membership.fecha_fin ?? addDaysDateOnly(membership.fecha_inicio, 30);
    const dias = diffDaysFromDateOnly(fechaFin, hoyUy);
    const mapping: Record<number, ReminderTipoEvento> = {
      7: "membresia_vence_7",
      3: "membresia_vence_3",
      1: "membresia_vence_1",
    };
    const tipoEvento = mapping[dias];
    if (!tipoEvento) continue;

    const plan = toPlanType(membership.plan);
    const message = buildMembershipReminderMessage(
      cliente.nombre_completo,
      plan,
      fechaFin
    );
    const row = await crearComunicacionOperativa({
      sourceType: "membresia",
      sourceId: membership.id,
      clienteId: membership.cliente_id,
      eventType: tipoEvento,
      recipientPhone: cliente.telefono,
      message,
      scheduledFor,
      payload: {
        nombre: cliente.nombre_completo,
        telefono: cliente.telefono,
        plan,
        fechaFin,
        legacyTipoEvento: tipoEvento,
      },
    });

    if (row.created) created += 1;
    else skipped += 1;
  }

  const completedServicesResp = (await service.database
    .from("turnos_taller")
    .select(
      `
      id,
      cliente_id,
      vehiculo_id,
      fecha_turno,
      clientes (nombre_completo, telefono)
    `
    )
    .eq("estado", "completado")
    .order("fecha_turno", { ascending: false })) as DbResponse<
    Array<{
      id: string;
      cliente_id: string;
      vehiculo_id: string | null;
      fecha_turno: string;
      clientes: { nombre_completo: string; telefono: string } | null;
    }>
  >;
  throwDbError(
    completedServicesResp.error,
    "REMINDER_SERVICES_FETCH_FAILED",
    "No se pudieron leer servicios completados"
  );

  const latestServiceByClient = new Map<
    string,
    {
      turnoId: string;
      vehiculoId: string | null;
      fechaTurno: string;
      clienteNombre: string;
      telefono: string;
    }
  >();

  for (const row of completedServicesResp.data ?? []) {
    if (latestServiceByClient.has(row.cliente_id) || !row.clientes) continue;
    latestServiceByClient.set(row.cliente_id, {
      turnoId: row.id,
      vehiculoId: row.vehiculo_id,
      fechaTurno: row.fecha_turno,
      clienteNombre: row.clientes.nombre_completo,
      telefono: row.clientes.telefono,
    });
  }

  for (const [clienteId, row] of latestServiceByClient) {
    const fechaService = row.fechaTurno.slice(0, 10);
    const dias = diffDaysFromDateOnly(hoyUy, fechaService);
    if (dias !== 30) continue;

    const message = buildServiceReminderMessage(row.clienteNombre);
    const reminder = await crearComunicacionOperativa({
      sourceType: "servicio",
      sourceId: row.turnoId,
      clienteId,
      eventType: "service_control_30",
      recipientPhone: row.telefono,
      message,
      scheduledFor,
      payload: {
        nombre: row.clienteNombre,
        telefono: row.telefono,
        fechaService,
        vehiculoId: row.vehiculoId,
        legacyTipoEvento: "service_control_30",
      },
    });

    if (reminder.created) created += 1;
    else skipped += 1;
  }

  return { created, skipped };
}
