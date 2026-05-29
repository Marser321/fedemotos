import { AppError } from "../errors";
import { getInsforgeServiceClient } from "../insforge";
import { validarSlotAgendaReserva } from "../agenda";
import {
  type DbResponse,
  findOrCreateCliente,
  findOrCreateVehiculo,
  throwDbError,
} from "./shared";
import { crearComunicacionOperativa } from "./comunicaciones";

export async function crearTurnoTaller(data: {
  nombre: string;
  telefono: string;
  email?: string;
  marca: string;
  modelo: string;
  kilometraje: string;
  fecha: string;
  horario: string;
  notas?: string;
}) {
  const slot = await validarSlotAgendaReserva({
    fecha: data.fecha,
    hora: data.horario,
  });

  const cliente = await findOrCreateCliente({
    nombre: data.nombre,
    telefono: data.telefono,
    email: data.email,
  });

  const vehiculo = await findOrCreateVehiculo({
    clienteId: cliente.id,
    marca: data.marca,
    modelo: data.modelo,
    kilometraje: Number.parseInt(data.kilometraje, 10) || 0,
  });

  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("turnos_taller")
    .insert([
      {
        cliente_id: cliente.id,
        vehiculo_id: vehiculo.id,
        servicio_solicitado: data.notas?.trim() || "Mantenimiento general",
        fecha_turno: slot.fechaTurnoIso,
        fecha_slot: slot.fechaSlot,
        hora_slot: slot.horaSlot,
        estado: "pendiente",
        notas: data.notas?.trim() || null,
        costo: 0,
      },
    ])
    .select("id")
    .maybeSingle()) as DbResponse<{ id: string }>;

  if (response.error?.code === "23505") {
    throw new AppError("SLOT_UNAVAILABLE", "Ese horario ya fue reservado", 409);
  }
  throwDbError(response.error, "TURNO_CREATE_FAILED", "No se pudo crear el turno");

  if (!response.data?.id) {
    throw new AppError("TURNO_CREATE_EMPTY", "No se pudo crear el turno", 500);
  }

  const fechaTexto = `${slot.fechaSlot} ${slot.horaSlot}`;
  await crearComunicacionOperativa({
    sourceType: "turno",
    sourceId: response.data.id,
    clienteId: cliente.id,
    eventType: "turno_creado",
    recipientPhone: cliente.telefono,
    message: `Hola ${cliente.nombre_completo}, tu turno en Fede Moto Servicios quedo reservado para el ${fechaTexto}. Servicio: ${data.notas?.trim() || "Mantenimiento general"}.`,
    scheduledFor: new Date().toISOString(),
    payload: {
      turnoId: response.data.id,
      fecha: slot.fechaSlot,
      hora: slot.horaSlot,
      vehiculo: `${vehiculo.marca} ${vehiculo.modelo}`,
      servicio: data.notas?.trim() || "Mantenimiento general",
    },
  });

  return { id: response.data.id };
}
