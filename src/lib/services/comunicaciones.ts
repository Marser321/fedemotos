import { AppError } from "../errors";
import { getInsforgeServiceClient } from "../insforge";
import { normalizePhone } from "../phone";
import type {
  CommunicationEventType,
  CommunicationQueueItem,
  CommunicationSourceType,
  CommunicationStatus,
  ReminderQueueItem,
  ReminderTipoEvento,
} from "../types";
import {
  buildWhatsappLink,
  type DbResponse,
  getTodayUyDate,
  normalizePagination,
  throwDbError,
} from "./shared";

interface CommunicationRow {
  id: string;
  source_type: string;
  source_id: string;
  cliente_id: string | null;
  event_type: string;
  status: string;
  channel: string;
  recipient_phone: string;
  message: string;
  scheduled_for: string;
  scheduled_date: string;
  payload: Record<string, unknown> | null;
  sent_at: string | null;
  sent_by: string | null;
  skip_reason: string | null;
  clientes: { nombre_completo: string; telefono: string } | null;
}

export interface AdminCommunicationQuery {
  sourceType?: CommunicationSourceType | "todos";
  eventType?: CommunicationEventType | "todos";
  eventTypes?: CommunicationEventType[];
  estado?: CommunicationStatus | "todos";
  date?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const communicationEventTypes: CommunicationEventType[] = [
  "orden_lista",
  "orden_espera_repuestos",
  "turno_creado",
  "turno_reprogramado",
  "turno_cancelado",
  "auxilio_recibido",
  "auxilio_en_camino",
  "auxilio_completado",
  "traslado_recibido",
  "traslado_en_camino",
  "traslado_completado",
  "membresia_vence_7",
  "membresia_vence_3",
  "membresia_vence_1",
  "service_control_30",
];

export const reminderCommunicationEventTypes: ReminderTipoEvento[] = [
  "membresia_vence_7",
  "membresia_vence_3",
  "membresia_vence_1",
  "service_control_30",
];

export function toCommunicationEventType(value: string): CommunicationEventType {
  return communicationEventTypes.includes(value as CommunicationEventType)
    ? (value as CommunicationEventType)
    : "orden_lista";
}

export function toCommunicationSourceType(value: string): CommunicationSourceType {
  if (
    value === "orden" ||
    value === "turno" ||
    value === "auxilio" ||
    value === "traslado" ||
    value === "membresia" ||
    value === "servicio" ||
    value === "legacy_recordatorio"
  ) {
    return value;
  }
  return "orden";
}

function toCommunicationStatus(value: string): CommunicationStatus {
  if (
    value === "enviado_manual" ||
    value === "omitido" ||
    value === "error"
  ) {
    return value;
  }
  return "pendiente";
}

export function communicationEventLabel(eventType: CommunicationEventType): string {
  const labels: Record<CommunicationEventType, string> = {
    orden_lista: "Moto lista para levantar",
    orden_espera_repuestos: "Espera de repuestos",
    turno_creado: "Turno reservado",
    turno_reprogramado: "Turno reprogramado",
    turno_cancelado: "Turno cancelado",
    auxilio_recibido: "Auxilio recibido",
    auxilio_en_camino: "Auxilio en camino",
    auxilio_completado: "Auxilio completado",
    traslado_recibido: "Traslado recibido",
    traslado_en_camino: "Traslado en camino",
    traslado_completado: "Traslado completado",
    membresia_vence_7: "Membresia vence en 7 dias",
    membresia_vence_3: "Membresia vence en 3 dias",
    membresia_vence_1: "Membresia vence manana",
    service_control_30: "Control post-service",
  };
  return labels[eventType];
}

function communicationSourceLabel(sourceType: CommunicationSourceType): string {
  const labels: Record<CommunicationSourceType, string> = {
    orden: "Orden",
    turno: "Agenda",
    auxilio: "Auxilio",
    traslado: "Traslado",
    membresia: "Membresia",
    servicio: "Servicio",
    legacy_recordatorio: "Recordatorio",
  };
  return labels[sourceType];
}

function getUyDateFromIso(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
  }).format(new Date(value));
}

function buildDedupeKey(input: {
  eventType: CommunicationEventType;
  sourceType: CommunicationSourceType;
  sourceId: string;
  scheduledDate: string;
}) {
  return `${input.eventType}:${input.sourceType}:${input.sourceId}:${input.scheduledDate}`;
}

function mapCommunicationRow(row: CommunicationRow): CommunicationQueueItem {
  const sourceType = toCommunicationSourceType(row.source_type);
  const eventType = toCommunicationEventType(row.event_type);
  const telefono = row.recipient_phone || row.clientes?.telefono || "";
  const clienteNombre =
    row.clientes?.nombre_completo ||
    (typeof row.payload?.nombre === "string" ? row.payload.nombre : "Cliente");

  return {
    id: row.id,
    sourceType,
    sourceId: row.source_id,
    eventType,
    status: toCommunicationStatus(row.status),
    channel: "whatsapp",
    clienteId: row.cliente_id,
    clienteNombre,
    telefono,
    scheduledDate: row.scheduled_for,
    messagePreview: row.message,
    waLink: buildWhatsappLink(telefono, row.message),
    sourceLabel: communicationSourceLabel(sourceType),
    eventLabel: communicationEventLabel(eventType),
    sentAt: row.sent_at,
    sentBy: row.sent_by,
    skipReason: row.skip_reason,
    payload: row.payload ?? {},
  };
}

function mapReminderFromCommunication(item: CommunicationQueueItem): ReminderQueueItem {
  const tipoEvento = reminderCommunicationEventTypes.includes(
    item.eventType as ReminderTipoEvento
  )
    ? (item.eventType as ReminderTipoEvento)
    : "membresia_vence_7";

  return {
    id: item.id,
    tipoEvento,
    status: item.status,
    clienteId: item.clienteId ?? "",
    clienteNombre: item.clienteNombre,
    telefono: item.telefono,
    scheduledDate: item.scheduledDate,
    messagePreview: item.messagePreview,
    waLink: item.waLink,
    sentAt: item.sentAt,
    sentBy: item.sentBy,
    skipReason: item.skipReason,
    payload: item.payload,
  };
}

export async function crearComunicacionOperativa(input: {
  sourceType: CommunicationSourceType;
  sourceId: string;
  clienteId?: string | null;
  eventType: CommunicationEventType;
  recipientPhone: string;
  message: string;
  scheduledFor?: string;
  payload?: Record<string, unknown>;
}) {
  const scheduledFor = input.scheduledFor ?? new Date().toISOString();
  const scheduledDate = getUyDateFromIso(scheduledFor);
  const recipientPhone = normalizePhone(input.recipientPhone);
  const message = input.message.trim();
  if (!message) {
    throw new AppError("COMMUNICATION_EMPTY_MESSAGE", "El mensaje no puede estar vacio", 400);
  }

  const service = getInsforgeServiceClient();
  const response = await service.database.from("comunicaciones_operativas").insert([
    {
      source_type: input.sourceType,
      source_id: input.sourceId,
      cliente_id: input.clienteId ?? null,
      event_type: input.eventType,
      status: "pendiente",
      channel: "whatsapp",
      recipient_phone: recipientPhone,
      message,
      scheduled_for: scheduledFor,
      scheduled_date: scheduledDate,
      dedupe_key: buildDedupeKey({
        eventType: input.eventType,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        scheduledDate,
      }),
      payload: input.payload ?? {},
    },
  ]);

  if (response.error?.code === "23505") {
    return { created: false };
  }
  throwDbError(
    response.error,
    "COMMUNICATION_CREATE_FAILED",
    "No se pudo crear comunicacion"
  );
  return { created: true };
}

export async function listarComunicacionesAdmin(query: AdminCommunicationQuery) {
  const service = getInsforgeServiceClient();
  const { page, pageSize } = normalizePagination(query);

  let request = service.database.from("comunicaciones_operativas").select(
    `
      id,
      source_type,
      source_id,
      cliente_id,
      event_type,
      status,
      channel,
      recipient_phone,
      message,
      scheduled_for,
      scheduled_date,
      payload,
      sent_at,
      sent_by,
      skip_reason,
      clientes (nombre_completo, telefono)
    `,
    { count: "exact" }
  );

  if (query.sourceType && query.sourceType !== "todos") {
    request = request.eq("source_type", query.sourceType);
  }
  if (query.eventType && query.eventType !== "todos") {
    request = request.eq("event_type", query.eventType);
  }
  if (query.estado && query.estado !== "todos") request = request.eq("status", query.estado);
  if (query.date) request = request.eq("scheduled_date", query.date);

  const response = (await request.order("scheduled_for", {
    ascending: false,
  })) as DbResponse<CommunicationRow[]>;

  throwDbError(
    response.error,
    "COMMUNICATIONS_LIST_FAILED",
    "No se pudieron obtener comunicaciones"
  );

  const mapped = (response.data ?? []).map(mapCommunicationRow);
  const eventTypeSet = query.eventTypes?.length ? new Set(query.eventTypes) : null;
  const byEventTypes = eventTypeSet
    ? mapped.filter((item) => eventTypeSet.has(item.eventType))
    : mapped;
  const searched = query.search?.trim()
    ? byEventTypes.filter((item) => {
        const search = query.search!.trim().toLowerCase();
        return [
          item.clienteNombre,
          item.telefono,
          item.messagePreview,
          item.eventLabel,
          item.sourceLabel,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
    : byEventTypes;

  const start = (page - 1) * pageSize;
  const data = searched.slice(start, start + pageSize);
  return {
    data,
    pagination: {
      page,
      pageSize,
      total: searched.length,
      totalPages: Math.max(1, Math.ceil(searched.length / pageSize)),
    },
    counters: {
      total: searched.length,
      pendientes: searched.filter((item) => item.status === "pendiente").length,
      enviados: searched.filter((item) => item.status === "enviado_manual").length,
      omitidos: searched.filter((item) => item.status === "omitido").length,
    },
  };
}

export async function listarRecordatoriosAdmin(query: Omit<AdminCommunicationQuery, "sourceType" | "eventType"> & {
  tipo?: ReminderTipoEvento | "todos";
}) {
  const result = await listarComunicacionesAdmin({
    ...query,
    eventTypes: [...reminderCommunicationEventTypes],
    eventType: query.tipo && query.tipo !== "todos" ? query.tipo : undefined,
  });
  return {
    data: result.data.map(mapReminderFromCommunication),
    pagination: result.pagination,
  };
}

async function ensurePendingCommunication(id: string) {
  const service = getInsforgeServiceClient();
  const lookup = (await service.database
    .from("comunicaciones_operativas")
    .select("id, status")
    .eq("id", id)
    .maybeSingle()) as DbResponse<{ id: string; status: string }>;

  throwDbError(
    lookup.error,
    "COMMUNICATION_LOOKUP_FAILED",
    "No se pudo buscar comunicacion"
  );
  if (!lookup.data?.id) {
    throw new AppError("COMMUNICATION_NOT_FOUND", "Comunicacion no encontrada", 404);
  }
  if (lookup.data.status !== "pendiente") {
    throw new AppError(
      "COMMUNICATION_INVALID_STATE",
      "La comunicacion ya fue gestionada",
      409
    );
  }
}

export async function marcarComunicacionEnviadaManual(id: string, sentBy: string) {
  await ensurePendingCommunication(id);
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("comunicaciones_operativas")
    .update({
      status: "enviado_manual",
      sent_at: new Date().toISOString(),
      sent_by: sentBy,
    })
    .eq("id", id)
    .select("id, sent_at")
    .maybeSingle()) as DbResponse<{ id: string; sent_at: string }>;

  throwDbError(
    response.error,
    "COMMUNICATION_MARK_SENT_FAILED",
    "No se pudo marcar comunicacion como enviada"
  );
  if (!response.data?.id) {
    throw new AppError("COMMUNICATION_NOT_FOUND", "Comunicacion no encontrada", 404);
  }
  return { id: response.data.id, sentAt: response.data.sent_at };
}

export async function omitirComunicacion(
  id: string,
  input?: { reason?: string; handledBy?: string }
) {
  await ensurePendingCommunication(id);
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("comunicaciones_operativas")
    .update({
      status: "omitido",
      sent_at: new Date().toISOString(),
      sent_by: input?.handledBy ?? null,
      skip_reason: input?.reason?.trim() || null,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle()) as DbResponse<{ id: string }>;

  throwDbError(response.error, "COMMUNICATION_SKIP_FAILED", "No se pudo omitir comunicacion");
  if (!response.data?.id) {
    throw new AppError("COMMUNICATION_NOT_FOUND", "Comunicacion no encontrada", 404);
  }
  return { id: response.data.id };
}

export async function marcarRecordatorioEnviadoManual(id: string, sentBy: string) {
  return marcarComunicacionEnviadaManual(id, sentBy);
}

export async function omitirRecordatorio(
  id: string,
  input?: { reason?: string; handledBy?: string }
) {
  return omitirComunicacion(id, input);
}

export function scheduledForTodayAtNineUy() {
  return `${getTodayUyDate()}T09:00:00-03:00`;
}
