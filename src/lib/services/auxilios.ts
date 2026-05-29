import { AppError } from "../errors";
import { getInsforgeServiceClient } from "../insforge";
import { normalizePhone } from "../phone";
import type {
  AuxilioEstado,
  AuxilioPrioridad,
  AuxilioTipo,
  CommunicationEventType,
  OperacionAuxilioItem,
  SolicitudAuxilio,
} from "../types";
import {
  type DbResponse,
  findClienteByPhone,
  findOrCreateCliente,
  findOrCreateVehiculo,
  findVehiculoById,
  normalizePagination,
  sortByDirection,
  syncClienteFromOperacion,
  throwDbError,
  toAuxilioEstado,
  toAuxilioPrioridad,
  toAuxilioTipo,
} from "./shared";
import { crearComunicacionOperativa } from "./comunicaciones";

interface AuxilioRow {
  id: string;
  tipo?: string | null;
  prioridad?: string | null;
  latitud: number;
  longitud: number;
  origen_referencia?: string | null;
  destino_latitud?: number | null;
  destino_longitud?: number | null;
  destino_referencia?: string | null;
  descripcion_problema: string | null;
  notas_internas?: string | null;
  estado: string | null;
  solicitado_en: string | null;
  completado_en?: string | null;
  creado_desde?: string | null;
  cliente_id?: string;
  vehiculo_id?: string | null;
  clientes: { nombre_completo: string; telefono: string } | null;
  vehiculos: { marca: string; modelo: string } | null;
}

function mapAuxilioRow(row: AuxilioRow): OperacionAuxilioItem {
  return {
    id: row.id,
    tipo: toAuxilioTipo(row.tipo),
    prioridad: toAuxilioPrioridad(row.prioridad),
    estado: toAuxilioEstado(row.estado),
    clienteId: row.cliente_id ?? "",
    clienteNombre: row.clientes?.nombre_completo ?? "Cliente",
    telefono: row.clientes?.telefono ?? "",
    vehiculoId: row.vehiculo_id ?? null,
    vehiculo: row.vehiculos ? `${row.vehiculos.marca} ${row.vehiculos.modelo}` : undefined,
    origen: {
      lat: row.latitud,
      lng: row.longitud,
      referencia: row.origen_referencia ?? undefined,
    },
    destino:
      typeof row.destino_latitud === "number" && typeof row.destino_longitud === "number"
        ? {
            lat: row.destino_latitud,
            lng: row.destino_longitud,
            referencia: row.destino_referencia ?? undefined,
          }
        : undefined,
    motivo: row.descripcion_problema ?? "",
    notasInternas: row.notas_internas ?? undefined,
    creadoDesde:
      row.creado_desde === "admin_manual" ? "admin_manual" : "app_cliente",
    solicitadoEn: row.solicitado_en ?? new Date().toISOString(),
    completadoEn: row.completado_en ?? null,
  };
}

async function obtenerOperacionAuxilioParaComunicacion(id: string): Promise<OperacionAuxilioItem | null> {
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("auxilios")
    .select(`
      id,
      tipo,
      prioridad,
      estado,
      cliente_id,
      vehiculo_id,
      latitud,
      longitud,
      origen_referencia,
      destino_latitud,
      destino_longitud,
      destino_referencia,
      descripcion_problema,
      notas_internas,
      creado_desde,
      solicitado_en,
      completado_en,
      clientes (nombre_completo, telefono),
      vehiculos (marca, modelo)
    `)
    .eq("id", id)
    .maybeSingle()) as DbResponse<AuxilioRow>;

  throwDbError(response.error, "ADMIN_OPERATION_LOOKUP_FAILED", "No se pudo buscar operacion");
  return response.data ? mapAuxilioRow(response.data) : null;
}

function communicationEventForOperation(
  tipo: AuxilioTipo,
  estado: AuxilioEstado,
  received = false
): CommunicationEventType | null {
  if (received) return tipo === "traslado" ? "traslado_recibido" : "auxilio_recibido";
  if (estado === "en_camino") {
    return tipo === "traslado" ? "traslado_en_camino" : "auxilio_en_camino";
  }
  if (estado === "completado") {
    return tipo === "traslado" ? "traslado_completado" : "auxilio_completado";
  }
  return null;
}

async function crearComunicacionOperacion(
  item: OperacionAuxilioItem,
  eventType: CommunicationEventType
) {
  if (!item.telefono) return { created: false };
  const tipoLabel = item.tipo === "traslado" ? "traslado" : "auxilio";
  const statusText =
    eventType.endsWith("_recibido")
      ? `recibimos tu solicitud de ${tipoLabel}`
      : eventType.endsWith("_en_camino")
      ? `ya estamos en camino para tu ${tipoLabel}`
      : `marcamos tu ${tipoLabel} como completado`;
  const mapsLink =
    item.tipo === "traslado" && item.destino
      ? `https://www.google.com/maps/dir/?api=1&origin=${item.origen.lat},${item.origen.lng}&destination=${item.destino.lat},${item.destino.lng}`
      : `https://www.google.com/maps?q=${item.origen.lat},${item.origen.lng}`;
  const message = `Hola ${item.clienteNombre}, ${statusText}. Ubicacion de referencia: ${mapsLink}. Motivo: ${item.motivo || "sin detalle"}.`;

  return crearComunicacionOperativa({
    sourceType: item.tipo,
    sourceId: item.id,
    clienteId: item.clienteId,
    eventType,
    recipientPhone: item.telefono,
    message,
    payload: {
      operacionId: item.id,
      tipo: item.tipo,
      estado: item.estado,
      prioridad: item.prioridad,
      vehiculo: item.vehiculo,
      motivo: item.motivo,
      mapsLink,
    },
  });
}

export interface AdminOperacionesQuery {
  tipo?: AuxilioTipo;
  estado?: AuxilioEstado;
  prioridad?: AuxilioPrioridad;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "solicitado_en" | "prioridad" | "estado" | "cliente";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function getSolicitudesAuxilio(): Promise<SolicitudAuxilio[]> {
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("auxilios")
    .select(`
      id,
      tipo,
      prioridad,
      latitud,
      longitud,
      origen_referencia,
      destino_latitud,
      destino_longitud,
      destino_referencia,
      descripcion_problema,
      notas_internas,
      estado,
      solicitado_en,
      completado_en,
      creado_desde,
      cliente_id,
      vehiculo_id,
      clientes (nombre_completo, telefono),
      vehiculos (marca, modelo)
    `)
    .order("solicitado_en", { ascending: false })) as DbResponse<AuxilioRow[]>;

  throwDbError(
    response.error,
    "AUXILIOS_LIST_FAILED",
    "No se pudo obtener las solicitudes de auxilio"
  );

  return (response.data ?? []).map((row) => ({
    id: row.id,
    clienteNombre: row.clientes?.nombre_completo ?? "Cliente",
    telefono: row.clientes?.telefono ?? "",
    latitud: row.latitud,
    longitud: row.longitud,
    descripcion: row.descripcion_problema ?? "",
    estado: toAuxilioEstado(row.estado),
    fecha: row.solicitado_en ?? new Date().toISOString(),
    moto: row.vehiculos
      ? `${row.vehiculos.marca} ${row.vehiculos.modelo}`
      : "No registrada",
    tipo: toAuxilioTipo(row.tipo),
    prioridad: toAuxilioPrioridad(row.prioridad),
  }));
}

export async function crearSolicitudAuxilio(input: {
  clienteId: string;
  lat: number;
  lng: number;
  descripcion?: string;
}) {
  const service = getInsforgeServiceClient();
  const response = (await service.database.rpc("request_aid", {
    p_cliente_id: input.clienteId,
    p_lat: input.lat,
    p_lng: input.lng,
    p_descripcion: input.descripcion?.trim() || "",
  })) as DbResponse<string>;

  if (response.error) {
    const errorMsg = response.error.message || "";
    if (errorMsg.includes("agotado") || errorMsg.includes("3 auxilios")) {
      throw new AppError("NO_AUXILIOS_REMAINING", errorMsg, 403);
    }
    if (errorMsg.includes("membresía activa")) {
      throw new AppError("NO_ACTIVE_MEMBERSHIP", errorMsg, 403);
    }
    throwDbError(response.error, "AUXILIO_CREATE_FAILED", "No se pudo crear el auxilio");
  }

  if (!response.data) {
    throw new AppError("AUXILIO_CREATE_EMPTY", "No se pudo crear el auxilio", 500);
  }

  const operacion = await obtenerOperacionAuxilioParaComunicacion(response.data);
  if (operacion) {
    const eventType = communicationEventForOperation(operacion.tipo, operacion.estado, true);
    if (eventType) await crearComunicacionOperacion(operacion, eventType);
  }

  return { id: response.data };
}

export async function actualizarEstadoAuxilio(id: string, nuevoEstado: AuxilioEstado) {
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("auxilios")
    .update({
      estado: nuevoEstado,
      completado_en: nuevoEstado === "completado" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle()) as DbResponse<{ id: string }>;

  throwDbError(
    response.error,
    "AUXILIO_UPDATE_FAILED",
    "No se pudo actualizar el estado del auxilio"
  );

  if (!response.data?.id) {
    throw new AppError("AUXILIO_NOT_FOUND", "Auxilio no encontrado", 404);
  }

  const operacion = await obtenerOperacionAuxilioParaComunicacion(response.data.id);
  const eventType = operacion
    ? communicationEventForOperation(operacion.tipo, nuevoEstado)
    : null;
  if (operacion && eventType) await crearComunicacionOperacion(operacion, eventType);

  return { id: response.data.id };
}

export async function crearOperacionAuxilioAdmin(input: {
  tipo: AuxilioTipo;
  prioridad: AuxilioPrioridad;
  cliente: { nombre: string; telefono: string; email?: string };
  vehiculo: { id?: string; marca?: string; modelo?: string };
  origen: { lat: number; lng: number; referencia?: string };
  destino?: { lat: number; lng: number; referencia?: string };
  motivo: string;
  notasInternas?: string;
}) {
  if (input.tipo === "traslado" && !input.destino) {
    throw new AppError("DESTINO_REQUIRED", "Destino obligatorio para traslados", 400);
  }

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

  let vehiculoId: string;
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
    });
    vehiculoId = vehiculo.id;
  }

  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("auxilios")
    .insert([
      {
        cliente_id: cliente.id,
        vehiculo_id: vehiculoId,
        tipo: input.tipo,
        prioridad: input.prioridad,
        latitud: input.origen.lat,
        longitud: input.origen.lng,
        origen_referencia: input.origen.referencia?.trim() || null,
        destino_latitud: input.destino?.lat ?? null,
        destino_longitud: input.destino?.lng ?? null,
        destino_referencia: input.destino?.referencia?.trim() || null,
        descripcion_problema: input.motivo.trim(),
        notas_internas: input.notasInternas?.trim() || null,
        estado: "pendiente",
        creado_desde: "admin_manual",
      },
    ])
    .select("id, estado")
    .maybeSingle()) as DbResponse<{ id: string; estado: string }>;

  throwDbError(response.error, "ADMIN_OPERATION_CREATE_FAILED", "No se pudo crear la operación");
  if (!response.data?.id) {
    throw new AppError("ADMIN_OPERATION_CREATE_EMPTY", "No se pudo crear la operación", 500);
  }

  const operacion = await obtenerOperacionAuxilioParaComunicacion(response.data.id);
  if (operacion) {
    const eventType = communicationEventForOperation(operacion.tipo, operacion.estado, true);
    if (eventType) await crearComunicacionOperacion(operacion, eventType);
  }

  return {
    id: response.data.id,
    estado: toAuxilioEstado(response.data.estado),
  };
}

export async function listarOperacionesAuxilioAdmin(query: AdminOperacionesQuery) {
  const service = getInsforgeServiceClient();
  const sortBy = query.sortBy ?? "solicitado_en";
  const sortDir = query.sortDir ?? "desc";
  const { page, pageSize } = normalizePagination(query);

  let request = service.database.from("auxilios").select(
    `
      id,
      tipo,
      prioridad,
      estado,
      cliente_id,
      vehiculo_id,
      latitud,
      longitud,
      origen_referencia,
      destino_latitud,
      destino_longitud,
      destino_referencia,
      descripcion_problema,
      notas_internas,
      creado_desde,
      solicitado_en,
      completado_en,
      clientes (nombre_completo, telefono),
      vehiculos (marca, modelo)
    `,
    { count: "exact" }
  );

  if (query.tipo) request = request.eq("tipo", query.tipo);
  if (query.estado) request = request.eq("estado", query.estado);
  if (query.prioridad) request = request.eq("prioridad", query.prioridad);
  if (query.dateFrom) request = request.gte("solicitado_en", `${query.dateFrom}T00:00:00Z`);
  if (query.dateTo) request = request.lte("solicitado_en", `${query.dateTo}T23:59:59Z`);

  const response = (await request.order("solicitado_en", {
    ascending: sortBy === "solicitado_en" ? sortDir === "asc" : false,
  })) as DbResponse<AuxilioRow[]> & { count?: number | null };

  throwDbError(
    response.error,
    "ADMIN_OPERATIONS_LIST_FAILED",
    "No se pudieron obtener las operaciones"
  );

  const mapped: OperacionAuxilioItem[] = (response.data ?? []).map(mapAuxilioRow);

  const search = query.search?.trim().toLowerCase();
  const searched = search
    ? mapped.filter((item) => {
        const haystack = [
          item.clienteNombre,
          item.telefono,
          item.vehiculo ?? "",
          item.motivo,
          item.notasInternas ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      })
    : mapped;

  let sorted = searched;
  if (sortBy === "cliente") {
    sorted = sortByDirection(searched, sortDir, (item) => item.clienteNombre.toLowerCase());
  }
  if (sortBy === "estado") {
    sorted = sortByDirection(searched, sortDir, (item) => item.estado);
  }
  if (sortBy === "prioridad") {
    const order: Record<AuxilioPrioridad, number> = {
      baja: 1,
      media: 2,
      alta: 3,
      urgente: 4,
    };
    sorted = sortByDirection(searched, sortDir, (item) => order[item.prioridad]);
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paged = sorted.slice(start, end);

  return {
    data: paged,
    pagination: {
      page,
      pageSize,
      total: sorted.length,
      totalPages: Math.max(1, Math.ceil(sorted.length / pageSize)),
    },
    counters: {
      total: sorted.length,
      pendientes: sorted.filter((item) => item.estado === "pendiente").length,
      enCamino: sorted.filter((item) => item.estado === "en_camino").length,
      completados: sorted.filter((item) => item.estado === "completado").length,
      auxilios: sorted.filter((item) => item.tipo === "auxilio").length,
      traslados: sorted.filter((item) => item.tipo === "traslado").length,
    },
  };
}

export async function actualizarOperacionAuxilioAdmin(
  id: string,
  patch: { estado?: AuxilioEstado; prioridad?: AuxilioPrioridad; notasInternas?: string }
) {
  const previous = await obtenerOperacionAuxilioParaComunicacion(id);
  const payload: Record<string, string | null> = {};
  if (patch.estado) {
    payload.estado = patch.estado;
    payload.completado_en =
      patch.estado === "completado" ? new Date().toISOString() : null;
  }
  if (patch.prioridad) payload.prioridad = patch.prioridad;
  if (typeof patch.notasInternas === "string") {
    payload.notas_internas = patch.notasInternas.trim() || null;
  }

  if (Object.keys(payload).length === 0) {
    throw new AppError("EMPTY_PATCH", "No hay cambios para aplicar", 400);
  }

  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("auxilios")
    .update(payload)
    .eq("id", id)
    .select("id")
    .maybeSingle()) as DbResponse<{ id: string }>;

  throwDbError(
    response.error,
    "ADMIN_OPERATION_UPDATE_FAILED",
    "No se pudo actualizar la operación"
  );
  if (!response.data?.id) {
    throw new AppError("ADMIN_OPERATION_NOT_FOUND", "Operación no encontrada", 404);
  }

  if (patch.estado && previous && patch.estado !== previous.estado) {
    const updated = await obtenerOperacionAuxilioParaComunicacion(id);
    const eventType = updated
      ? communicationEventForOperation(updated.tipo, patch.estado)
      : null;
    if (updated && eventType) await crearComunicacionOperacion(updated, eventType);
  }
  return { id: response.data.id };
}
