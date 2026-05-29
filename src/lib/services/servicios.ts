import { AppError } from "../errors";
import { getInsforgeServiceClient } from "../insforge";
import { buildAgendaSlotNowForManualService } from "../agenda";
import type { ServicioRegistro } from "../types";
import {
  type DbResponse,
  findOrCreateCliente,
  findOrCreateVehiculo,
  throwDbError,
} from "./shared";

interface TurnoRow {
  id: string;
  servicio_solicitado: string;
  estado: string | null;
  creado_en: string | null;
  costo: number | null;
  clientes: { nombre_completo: string } | null;
  vehiculos: { marca: string; modelo: string; kilometraje_historico: number | null } | null;
}

export async function getServiciosRegistro(): Promise<ServicioRegistro[]> {
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("turnos_taller")
    .select(`
      id,
      servicio_solicitado,
      estado,
      creado_en,
      costo,
      clientes (nombre_completo),
      vehiculos (marca, modelo, kilometraje_historico)
    `)
    .order("creado_en", { ascending: false })) as DbResponse<TurnoRow[]>;

  throwDbError(
    response.error,
    "SERVICES_LIST_FAILED",
    "No se pudo obtener el historial de servicios"
  );

  return (response.data ?? [])
    .filter((row) => row.estado !== "cancelado")
    .map((row) => ({
      id: row.id,
      clienteNombre: row.clientes?.nombre_completo ?? "Cliente",
      moto: row.vehiculos
        ? `${row.vehiculos.marca} ${row.vehiculos.modelo}`
        : "No registrada",
      servicio: row.servicio_solicitado,
      kilometraje: row.vehiculos?.kilometraje_historico ?? 0,
      fecha: row.creado_en ?? new Date().toISOString(),
      estado:
        row.estado === "en_proceso" || row.estado === "pendiente"
          ? row.estado
          : "completado",
      costo: row.costo ?? 0,
    }));
}

export async function crearServicioManual(data: {
  clienteNombre: string;
  telefono: string;
  marca: string;
  modelo: string;
  servicio: string;
  costo: number;
  kilometraje: number;
}) {
  const cliente = await findOrCreateCliente({
    nombre: data.clienteNombre,
    telefono: data.telefono,
  });

  const vehiculo = await findOrCreateVehiculo({
    clienteId: cliente.id,
    marca: data.marca,
    modelo: data.modelo,
    kilometraje: data.kilometraje || 0,
  });

  const service = getInsforgeServiceClient();
  const slot = buildAgendaSlotNowForManualService();
  const response = (await service.database
    .from("turnos_taller")
    .insert([
      {
        cliente_id: cliente.id,
        vehiculo_id: vehiculo.id,
        servicio_solicitado: data.servicio.trim(),
        estado: "completado",
        costo: data.costo,
        fecha_turno: slot.fechaTurnoIso,
        fecha_slot: slot.fechaSlot,
        hora_slot: slot.horaSlot,
        creado_en: new Date().toISOString(),
      },
    ])
    .select("id")
    .maybeSingle()) as DbResponse<{ id: string }>;

  throwDbError(response.error, "SERVICE_CREATE_FAILED", "No se pudo registrar el servicio");
  if (!response.data?.id) {
    throw new AppError("SERVICE_CREATE_EMPTY", "No se pudo registrar el servicio", 500);
  }

  return { id: response.data.id };
}
