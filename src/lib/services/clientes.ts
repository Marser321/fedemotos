import { AppError } from "../errors";
import { getInsforgeServiceClient } from "../insforge";
import { normalizePhone } from "../phone";
import type {
  AuxilioEstado,
  AuxilioTipo,
  ClienteCuenta,
  ClienteOperacionPrefill,
  OrdenEstado,
  TurnoEstado,
} from "../types";
import {
  type DbResponse,
  findClienteByPhone,
  findOrCreateCliente,
  findOrCreateVehiculo,
  firstArrayItem,
  listVehiculosByCliente,
  throwDbError,
  toMembresiaEstado,
  toAuxilioEstado,
  toAuxilioTipo,
  toOrdenEstado,
  toPlanType,
} from "./shared";

interface MembresiaCuentaRow {
  id: string;
  plan: string | null;
  estado: string | null;
  auxilios_restantes: number | null;
  fecha_inicio: string | null;
  fecha_fin?: string | null;
}

function toTurnoEstado(value: string | null | undefined): TurnoEstado {
  if (
    value === "pendiente" ||
    value === "en_proceso" ||
    value === "completado" ||
    value === "cancelado"
  ) {
    return value;
  }
  return "pendiente";
}

export interface ContactoCarga {
  nombre: string;
  telefono: string;
  email?: string;
  marca?: string;
  modelo?: string;
}

export interface ResultadoCarga {
  nuevos: number;
  duplicados: number;
  errores: number;
  detalles: {
    nombre: string;
    telefono: string;
    estado: "nuevo" | "duplicado" | "error";
    mensaje?: string;
  }[];
}

export async function cargarClientesMasivo(contactos: ContactoCarga[]): Promise<ResultadoCarga> {
  const resultado: ResultadoCarga = { nuevos: 0, duplicados: 0, errores: 0, detalles: [] };

  for (const contacto of contactos) {
    try {
      if (!contacto.nombre?.trim() || !contacto.telefono?.trim()) {
        resultado.errores += 1;
        resultado.detalles.push({
          nombre: contacto.nombre || "Sin nombre",
          telefono: contacto.telefono || "Sin teléfono",
          estado: "error",
          mensaje: "Nombre y teléfono son obligatorios",
        });
        continue;
      }

      const telefono = normalizePhone(contacto.telefono);
      const existing = await findClienteByPhone(telefono);
      if (existing) {
        resultado.duplicados += 1;
        resultado.detalles.push({
          nombre: contacto.nombre,
          telefono,
          estado: "duplicado",
          mensaje: "Ya existe en la base de datos",
        });
        continue;
      }

      const cliente = await findOrCreateCliente({
        nombre: contacto.nombre,
        telefono,
        email: contacto.email,
      });

      if (contacto.marca?.trim() && contacto.modelo?.trim()) {
        await findOrCreateVehiculo({
          clienteId: cliente.id,
          marca: contacto.marca,
          modelo: contacto.modelo,
        });
      }

      resultado.nuevos += 1;
      resultado.detalles.push({
        nombre: contacto.nombre,
        telefono,
        estado: "nuevo",
      });
    } catch (error) {
      resultado.errores += 1;
      resultado.detalles.push({
        nombre: contacto.nombre || "Desconocido",
        telefono: contacto.telefono || "",
        estado: "error",
        mensaje: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  return resultado;
}

export async function getClientes() {
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("clientes")
    .select("id, nombre_completo, telefono, email, created_at")
    .order("created_at", { ascending: false })) as DbResponse<
    Array<{
      id: string;
      nombre_completo: string;
      telefono: string;
      email: string | null;
      created_at: string;
    }>
  >;

  throwDbError(response.error, "CLIENTS_LIST_FAILED", "No se pudo obtener clientes");
  return response.data ?? [];
}

export async function obtenerClientePorTelefono(telefono: string) {
  const normalized = normalizePhone(telefono);
  const cliente = await findClienteByPhone(normalized);
  if (!cliente) {
    throw new AppError("CLIENT_NOT_FOUND", "No existe un cliente con ese teléfono", 404);
  }
  return cliente;
}

export async function buscarClientePorTelefono(telefono: string) {
  const normalized = normalizePhone(telefono);
  return findClienteByPhone(normalized);
}

export async function buscarClienteOperacionPorTelefono(
  telefono: string
): Promise<ClienteOperacionPrefill> {
  const normalized = normalizePhone(telefono);
  const cliente = await findClienteByPhone(normalized);
  if (!cliente) {
    return { found: false };
  }

  const vehiculos = await listVehiculosByCliente(cliente.id);
  return {
    found: true,
    clienteId: cliente.id,
    nombre: cliente.nombre_completo,
    telefono: cliente.telefono,
    email: cliente.email ?? "",
    vehiculos: vehiculos.map((vehiculo) => ({
      id: vehiculo.id,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      label: `${vehiculo.marca} ${vehiculo.modelo}`,
    })),
  };
}

export async function registrarClienteConVehiculo(input: {
  nombre: string;
  telefono: string;
  email: string;
  marca: string;
  modelo: string;
}) {
  const normalizedPhone = normalizePhone(input.telefono);
  const existing = await findClienteByPhone(normalizedPhone);
  if (existing) {
    throw new AppError(
      "PHONE_ALREADY_REGISTERED",
      "Este número ya está registrado. Usá iniciar sesión.",
      409
    );
  }

  const cliente = await findOrCreateCliente({
    nombre: input.nombre,
    telefono: normalizedPhone,
    email: input.email,
  });

  await findOrCreateVehiculo({
    clienteId: cliente.id,
    marca: input.marca,
    modelo: input.modelo,
  });

  return cliente;
}

export async function getCuentaClienteById(clienteId: string): Promise<ClienteCuenta> {
  const service = getInsforgeServiceClient();
  const [response, ordenesResp, turnosResp, auxiliosResp] = await Promise.all([
    service.database
      .from("clientes")
      .select(`
        id,
        nombre_completo,
        telefono,
        email,
        vehiculos (marca, modelo),
        membresias (plan, estado, auxilios_restantes, fecha_inicio)
      `)
      .eq("id", clienteId)
      .maybeSingle(),
    service.database
      .from("ordenes_taller")
      .select("id, estado, titulo, fecha_prometida, vehiculos (marca, modelo)")
      .eq("cliente_id", clienteId)
      .order("fecha_ingreso", { ascending: false }),
    service.database
      .from("turnos_taller")
      .select("id, estado, servicio_solicitado, fecha_turno, fecha_slot, hora_slot")
      .eq("cliente_id", clienteId)
      .order("fecha_turno", { ascending: true }),
    service.database
      .from("auxilios")
      .select("id, tipo, estado, descripcion_problema, solicitado_en")
      .eq("cliente_id", clienteId)
      .neq("estado", "completado")
      .order("solicitado_en", { ascending: false }),
  ]) as [
    DbResponse<
    {
      id: string;
      nombre_completo: string;
      telefono: string;
      email: string | null;
      vehiculos:
        | { marca: string; modelo: string }
        | Array<{ marca: string; modelo: string }>
        | null;
      membresias:
        | MembresiaCuentaRow
        | Array<MembresiaCuentaRow>
        | null;
    }
    >,
    DbResponse<
      Array<{
        id: string;
        estado: string;
        titulo: string;
        fecha_prometida: string | null;
        vehiculos: { marca: string; modelo: string } | null;
      }>
    >,
    DbResponse<
      Array<{
        id: string;
        estado: string;
        servicio_solicitado: string;
        fecha_turno: string;
        fecha_slot: string | null;
        hora_slot: string | null;
      }>
    >,
    DbResponse<
      Array<{
        id: string;
        tipo: string | null;
        estado: string | null;
        descripcion_problema: string | null;
        solicitado_en: string;
      }>
    >,
  ];

  throwDbError(response.error, "ACCOUNT_FETCH_FAILED", "No se pudo obtener la cuenta");
  throwDbError(ordenesResp.error, "ACCOUNT_ORDERS_FETCH_FAILED", "No se pudieron obtener ordenes");
  throwDbError(turnosResp.error, "ACCOUNT_TURNOS_FETCH_FAILED", "No se pudieron obtener turnos");
  throwDbError(auxiliosResp.error, "ACCOUNT_AUXILIOS_FETCH_FAILED", "No se pudieron obtener auxilios");

  if (!response.data) {
    throw new AppError("ACCOUNT_NOT_FOUND", "No se encontró la cuenta del cliente", 404);
  }

  const vehiculo = firstArrayItem(response.data.vehiculos);
  const membresia = firstArrayItem(response.data.membresias);
  const ordenesActivas: NonNullable<ClienteCuenta["ordenesActivas"]> = (ordenesResp.data ?? [])
    .filter((row) =>
      ["ingresado", "diagnostico", "espera_repuestos", "reparacion", "listo"].includes(row.estado)
    )
    .slice(0, 5)
    .map((row) => ({
      id: row.id,
      titulo: row.titulo,
      estado: toOrdenEstado(row.estado) as OrdenEstado,
      vehiculo: row.vehiculos ? `${row.vehiculos.marca} ${row.vehiculos.modelo}` : null,
      fechaPrometida: row.fecha_prometida,
    }));
  const turnosProximos: NonNullable<ClienteCuenta["turnosProximos"]> = (turnosResp.data ?? [])
    .filter((row) => row.estado === "pendiente" || row.estado === "en_proceso")
    .slice(0, 5)
    .map((row) => ({
      id: row.id,
      fecha: row.fecha_slot ?? row.fecha_turno.slice(0, 10),
      hora: row.hora_slot ?? row.fecha_turno.slice(11, 16),
      estado: toTurnoEstado(row.estado),
      servicio: row.servicio_solicitado,
    }));
  const auxiliosActivos: NonNullable<ClienteCuenta["auxiliosActivos"]> = (auxiliosResp.data ?? [])
    .slice(0, 5)
    .map((row) => ({
      id: row.id,
      tipo: toAuxilioTipo(row.tipo) as AuxilioTipo,
      estado: toAuxilioEstado(row.estado) as AuxilioEstado,
      solicitadoEn: row.solicitado_en,
      motivo: row.descripcion_problema,
    }));

  return {
    id: response.data.id,
    nombre: response.data.nombre_completo,
    telefono: response.data.telefono,
    email: response.data.email ?? "",
    moto: vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : "No registrada",
    plan: toPlanType(membresia?.plan),
    estado: toMembresiaEstado(membresia?.estado),
    cuposRestantes: membresia?.auxilios_restantes ?? 0,
    fechaInicio: membresia?.fecha_inicio ?? new Date().toISOString().slice(0, 10),
    ordenesActivas,
    turnosProximos,
    auxiliosActivos,
  };
}
