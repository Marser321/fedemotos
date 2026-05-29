import { AppError } from "../errors";
import { getInsforgeServiceClient } from "../insforge";
import { normalizePhone } from "../phone";
import type { OrdenEstado, OrdenTaller, OrdenTimelineEvent } from "../types";
import {
  type DbResponse,
  findClienteByPhone,
  findOrCreateCliente,
  findOrCreateVehiculo,
  findVehiculoById,
  normalizePagination,
  numberFromDb,
  sortByDirection,
  syncClienteFromOperacion,
  throwDbError,
  toOrdenEstado,
} from "./shared";
import { crearComunicacionOperativa } from "./comunicaciones";

interface OrdenTallerRow {
  id: string;
  cliente_id: string;
  vehiculo_id: string | null;
  turno_id: string | null;
  estado: string;
  titulo: string;
  descripcion: string | null;
  diagnostico: string | null;
  notas_internas: string | null;
  costo_estimado: number | string | null;
  costo_final: number | string | null;
  fecha_ingreso: string;
  fecha_prometida: string | null;
  ingresado_at: string | null;
  diagnostico_at: string | null;
  espera_repuestos_at: string | null;
  reparacion_at: string | null;
  listo_at: string | null;
  entregado_at: string | null;
  cancelado_at: string | null;
  created_at: string;
  updated_at: string;
  clientes: { nombre_completo: string; telefono: string } | null;
  vehiculos: { marca: string; modelo: string } | null;
}

interface OrdenTimelineEventRow {
  id: string;
  orden_id: string;
  tipo: string;
  estado_desde: string | null;
  estado_hasta: string | null;
  nota: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AdminOrdenesQuery {
  estado?: OrdenEstado | "todas";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "fecha_ingreso" | "estado" | "cliente" | "fecha_prometida";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export const activeOrdenEstados: OrdenEstado[] = [
  "ingresado",
  "diagnostico",
  "espera_repuestos",
  "reparacion",
  "listo",
];

function mapOrdenRow(row: OrdenTallerRow, timeline?: OrdenTimelineEvent[]): OrdenTaller {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    clienteNombre: row.clientes?.nombre_completo ?? "Cliente",
    telefono: row.clientes?.telefono ?? "",
    vehiculoId: row.vehiculo_id,
    vehiculo: row.vehiculos ? `${row.vehiculos.marca} ${row.vehiculos.modelo}` : null,
    turnoId: row.turno_id,
    estado: toOrdenEstado(row.estado),
    titulo: row.titulo,
    descripcion: row.descripcion,
    diagnostico: row.diagnostico,
    notasInternas: row.notas_internas,
    costoEstimado: numberFromDb(row.costo_estimado),
    costoFinal: numberFromDb(row.costo_final),
    fechaIngreso: row.fecha_ingreso,
    fechaPrometida: row.fecha_prometida,
    ingresadoAt: row.ingresado_at,
    diagnosticoAt: row.diagnostico_at,
    esperaRepuestosAt: row.espera_repuestos_at,
    reparacionAt: row.reparacion_at,
    listoAt: row.listo_at,
    entregadoAt: row.entregado_at,
    canceladoAt: row.cancelado_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    timeline,
  };
}

function mapOrdenTimelineRow(row: OrdenTimelineEventRow): OrdenTimelineEvent {
  return {
    id: row.id,
    ordenId: row.orden_id,
    tipo:
      row.tipo === "nota" || row.tipo === "creacion" || row.tipo === "estado"
        ? row.tipo
        : "estado",
    estadoDesde: row.estado_desde ? toOrdenEstado(row.estado_desde) : null,
    estadoHasta: row.estado_hasta ? toOrdenEstado(row.estado_hasta) : null,
    nota: row.nota,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function ordenEstadoTimestampField(estado: OrdenEstado): string {
  if (estado === "espera_repuestos") return "espera_repuestos_at";
  return `${estado}_at`;
}

export async function crearOrdenTallerAdmin(input: {
  cliente: { nombre: string; telefono: string; email?: string };
  vehiculo: { id?: string; marca?: string; modelo?: string; kilometraje?: number };
  turnoId?: string;
  titulo: string;
  descripcion?: string;
  diagnostico?: string;
  notasInternas?: string;
  costoEstimado?: number;
  fechaPrometida?: string;
  createdBy?: string;
}) {
  const normalizedPhone = normalizePhone(input.cliente.telefono);
  const existingCliente = await findClienteByPhone(normalizedPhone);
  const cliente = existingCliente
    ? await syncClienteFromOperacion(existingCliente, {
        nombre: input.cliente.nombre,
        email: input.cliente.email,
      })
    : await findOrCreateCliente({
        nombre: input.cliente.nombre,
        telefono: normalizedPhone,
        email: input.cliente.email,
      });

  let vehiculoId: string | null = null;
  if (input.vehiculo.id) {
    const existingVehiculo = await findVehiculoById(input.vehiculo.id);
    if (!existingVehiculo?.id) {
      throw new AppError("VEHICLE_NOT_FOUND", "Vehículo no encontrado", 404);
    }
    if (existingVehiculo.cliente_id !== cliente.id) {
      throw new AppError(
        "VEHICLE_CLIENT_MISMATCH",
        "El vehículo seleccionado no pertenece al cliente",
        400
      );
    }
    vehiculoId = existingVehiculo.id;
  } else {
    const marca = input.vehiculo.marca?.trim() ?? "";
    const modelo = input.vehiculo.modelo?.trim() ?? "";
    if (!marca || !modelo) {
      throw new AppError(
        "VEHICLE_REQUIRED",
        "Seleccioná un vehículo existente o ingresá marca y modelo",
        400
      );
    }
    const vehiculo = await findOrCreateVehiculo({
      clienteId: cliente.id,
      marca,
      modelo,
      kilometraje: input.vehiculo.kilometraje ?? 0,
    });
    vehiculoId = vehiculo.id;
  }

  const service = getInsforgeServiceClient();
  const now = new Date().toISOString();
  const response = (await service.database
    .from("ordenes_taller")
    .insert([
      {
        cliente_id: cliente.id,
        vehiculo_id: vehiculoId,
        turno_id: input.turnoId || null,
        estado: "ingresado",
        titulo: input.titulo.trim(),
        descripcion: input.descripcion?.trim() || null,
        diagnostico: input.diagnostico?.trim() || null,
        notas_internas: input.notasInternas?.trim() || null,
        costo_estimado: input.costoEstimado ?? 0,
        costo_final: 0,
        fecha_ingreso: now,
        fecha_prometida: input.fechaPrometida || null,
        ingresado_at: now,
        created_by: input.createdBy || "admin",
      },
    ])
    .select("id, estado")
    .maybeSingle()) as DbResponse<{ id: string; estado: string }>;

  throwDbError(response.error, "ORDER_CREATE_FAILED", "No se pudo crear la orden");
  if (!response.data?.id) {
    throw new AppError("ORDER_CREATE_EMPTY", "No se pudo crear la orden", 500);
  }

  await service.database.from("ordenes_taller_eventos").insert([
    {
      orden_id: response.data.id,
      tipo: "creacion",
      estado_hasta: "ingresado",
      nota: "Orden creada",
      created_by: input.createdBy || "admin",
    },
  ]);

  return { id: response.data.id, estado: toOrdenEstado(response.data.estado) };
}

export async function listarOrdenesTallerAdmin(query: AdminOrdenesQuery) {
  const service = getInsforgeServiceClient();
  const sortBy = query.sortBy ?? "fecha_ingreso";
  const sortDir = query.sortDir ?? "desc";
  const { page, pageSize } = normalizePagination(query);

  let request = service.database.from("ordenes_taller").select(
    `
      id,
      cliente_id,
      vehiculo_id,
      turno_id,
      estado,
      titulo,
      descripcion,
      diagnostico,
      notas_internas,
      costo_estimado,
      costo_final,
      fecha_ingreso,
      fecha_prometida,
      ingresado_at,
      diagnostico_at,
      espera_repuestos_at,
      reparacion_at,
      listo_at,
      entregado_at,
      cancelado_at,
      created_at,
      updated_at,
      clientes (nombre_completo, telefono),
      vehiculos (marca, modelo)
    `,
    { count: "exact" }
  );

  if (query.estado && query.estado !== "todas") request = request.eq("estado", query.estado);
  if (query.dateFrom) request = request.gte("fecha_ingreso", `${query.dateFrom}T00:00:00Z`);
  if (query.dateTo) request = request.lte("fecha_ingreso", `${query.dateTo}T23:59:59Z`);

  const response = (await request.order("fecha_ingreso", {
    ascending: sortBy === "fecha_ingreso" ? sortDir === "asc" : false,
  })) as DbResponse<OrdenTallerRow[]> & { count?: number | null };

  throwDbError(response.error, "ORDERS_LIST_FAILED", "No se pudieron obtener órdenes");

  const mapped = (response.data ?? []).map((row) => mapOrdenRow(row));
  const search = query.search?.trim().toLowerCase();
  const searched = search
    ? mapped.filter((item) =>
        [
          item.clienteNombre,
          item.telefono,
          item.vehiculo ?? "",
          item.titulo,
          item.descripcion ?? "",
          item.diagnostico ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search)
      )
    : mapped;

  let sorted = searched;
  if (sortBy === "cliente") {
    sorted = sortByDirection(searched, sortDir, (item) => item.clienteNombre.toLowerCase());
  }
  if (sortBy === "estado") {
    sorted = sortByDirection(searched, sortDir, (item) => item.estado);
  }
  if (sortBy === "fecha_prometida") {
    sorted = sortByDirection(searched, sortDir, (item) => item.fechaPrometida ?? "9999-12-31");
  }

  const start = (page - 1) * pageSize;
  const data = sorted.slice(start, start + pageSize);
  return {
    data,
    pagination: {
      page,
      pageSize,
      total: sorted.length,
      totalPages: Math.max(1, Math.ceil(sorted.length / pageSize)),
    },
    counters: {
      total: sorted.length,
      activas: sorted.filter((item) => activeOrdenEstados.includes(item.estado)).length,
      listas: sorted.filter((item) => item.estado === "listo").length,
      entregadas: sorted.filter((item) => item.estado === "entregado").length,
      canceladas: sorted.filter((item) => item.estado === "cancelado").length,
    },
  };
}

export async function obtenerOrdenTallerAdmin(id: string): Promise<OrdenTaller> {
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("ordenes_taller")
    .select(
      `
        id,
        cliente_id,
        vehiculo_id,
        turno_id,
        estado,
        titulo,
        descripcion,
        diagnostico,
        notas_internas,
        costo_estimado,
        costo_final,
        fecha_ingreso,
        fecha_prometida,
        ingresado_at,
        diagnostico_at,
        espera_repuestos_at,
        reparacion_at,
        listo_at,
        entregado_at,
        cancelado_at,
        created_at,
        updated_at,
        clientes (nombre_completo, telefono),
        vehiculos (marca, modelo)
      `
    )
    .eq("id", id)
    .maybeSingle()) as DbResponse<OrdenTallerRow>;

  throwDbError(response.error, "ORDER_LOOKUP_FAILED", "No se pudo buscar la orden");
  if (!response.data?.id) {
    throw new AppError("ORDER_NOT_FOUND", "Orden no encontrada", 404);
  }

  const timelineResponse = (await service.database
    .from("ordenes_taller_eventos")
    .select("id, orden_id, tipo, estado_desde, estado_hasta, nota, created_by, created_at")
    .eq("orden_id", id)
    .order("created_at", { ascending: false })) as DbResponse<OrdenTimelineEventRow[]>;

  throwDbError(
    timelineResponse.error,
    "ORDER_TIMELINE_FAILED",
    "No se pudo obtener historial de la orden"
  );

  return mapOrdenRow(response.data, (timelineResponse.data ?? []).map(mapOrdenTimelineRow));
}

export async function actualizarOrdenTallerAdmin(
  id: string,
  patch: {
    estado?: OrdenEstado;
    titulo?: string;
    descripcion?: string | null;
    diagnostico?: string | null;
    notasInternas?: string | null;
    costoEstimado?: number;
    costoFinal?: number;
    fechaPrometida?: string | null;
    handledBy?: string;
  }
) {
  const service = getInsforgeServiceClient();
  const lookup = (await service.database
    .from("ordenes_taller")
    .select(
      `
        id,
        cliente_id,
        estado,
        titulo,
        fecha_prometida,
        clientes (nombre_completo, telefono),
        vehiculos (marca, modelo)
      `
    )
    .eq("id", id)
    .maybeSingle()) as DbResponse<{
    id: string;
    cliente_id: string;
    estado: string;
    titulo: string;
    fecha_prometida: string | null;
    clientes: { nombre_completo: string; telefono: string } | null;
    vehiculos: { marca: string; modelo: string } | null;
  }>;

  throwDbError(lookup.error, "ORDER_LOOKUP_FAILED", "No se pudo buscar la orden");
  if (!lookup.data?.id) {
    throw new AppError("ORDER_NOT_FOUND", "Orden no encontrada", 404);
  }

  const previousEstado = toOrdenEstado(lookup.data.estado);
  const payload: Record<string, string | number | null> = {};
  if (typeof patch.titulo === "string") payload.titulo = patch.titulo.trim();
  if (typeof patch.descripcion !== "undefined") payload.descripcion = patch.descripcion?.trim() || null;
  if (typeof patch.diagnostico !== "undefined") payload.diagnostico = patch.diagnostico?.trim() || null;
  if (typeof patch.notasInternas !== "undefined") {
    payload.notas_internas = patch.notasInternas?.trim() || null;
  }
  if (typeof patch.costoEstimado === "number") payload.costo_estimado = patch.costoEstimado;
  if (typeof patch.costoFinal === "number") payload.costo_final = patch.costoFinal;
  if (typeof patch.fechaPrometida !== "undefined") {
    payload.fecha_prometida = patch.fechaPrometida || null;
  }
  if (patch.estado) {
    payload.estado = patch.estado;
    if (patch.estado !== previousEstado) {
      payload[ordenEstadoTimestampField(patch.estado)] = new Date().toISOString();
    }
  }

  if (Object.keys(payload).length === 0) {
    throw new AppError("EMPTY_PATCH", "No hay cambios para aplicar", 400);
  }

  const response = (await service.database
    .from("ordenes_taller")
    .update(payload)
    .eq("id", id)
    .select("id, estado")
    .maybeSingle()) as DbResponse<{ id: string; estado: string }>;

  throwDbError(response.error, "ORDER_UPDATE_FAILED", "No se pudo actualizar la orden");
  if (!response.data?.id) {
    throw new AppError("ORDER_NOT_FOUND", "Orden no encontrada", 404);
  }

  if (patch.estado && patch.estado !== previousEstado) {
    await service.database.from("ordenes_taller_eventos").insert([
      {
        orden_id: id,
        tipo: "estado",
        estado_desde: previousEstado,
        estado_hasta: patch.estado,
        nota: patch.notasInternas?.trim() || null,
        created_by: patch.handledBy || "admin",
      },
    ]);

    if (patch.estado === "listo" || patch.estado === "espera_repuestos") {
      const cliente = lookup.data.clientes;
      if (cliente?.telefono) {
        const vehiculo = lookup.data.vehiculos
          ? `${lookup.data.vehiculos.marca} ${lookup.data.vehiculos.modelo}`
          : "tu moto";
        const message =
          patch.estado === "listo"
            ? `Hola ${cliente.nombre_completo}, te escribimos de Fede Moto Servicios. ${vehiculo} ya esta lista para levantar por la orden "${lookup.data.titulo}". Coordinamos la entrega por este medio.`
            : `Hola ${cliente.nombre_completo}, te escribimos de Fede Moto Servicios. La orden "${lookup.data.titulo}" de ${vehiculo} queda en espera de repuestos. Te avisamos cualquier novedad por este medio.`;

        await crearComunicacionOperativa({
          sourceType: "orden",
          sourceId: id,
          clienteId: lookup.data.cliente_id,
          eventType: patch.estado === "listo" ? "orden_lista" : "orden_espera_repuestos",
          recipientPhone: cliente.telefono,
          message,
          payload: {
            ordenId: id,
            titulo: lookup.data.titulo,
            estado: patch.estado,
            estadoAnterior: previousEstado,
            vehiculo,
            fechaPrometida: lookup.data.fecha_prometida,
          },
        });
      }
    }
  }

  return { id: response.data.id, estado: toOrdenEstado(response.data.estado) };
}
