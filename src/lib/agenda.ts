import { AppError } from "./errors";
import { getSupportWhatsappNumber } from "./env";
import { getInsforgeServiceClient } from "./insforge";
import { crearComunicacionOperativa } from "./services/comunicaciones";
import type {
  AgendaAvailabilitySlot,
  AgendaConfig,
  AgendaException,
  AgendaExceptionTipo,
  AgendaStatus,
  AgendaTurnoRow,
  AgendaWeeklyRule,
  TurnoEstado,
} from "./types";

type DbResponse<T> = {
  data: T | null;
  error: { code?: string; message?: string } | null;
  count?: number | null;
};

function throwDbError(
  error: { code?: string; message?: string } | null,
  code: string,
  message: string,
  status = 500
): void {
  if (!error) return;

  if (error.code === "23505") {
    throw new AppError("DUPLICATE_VALUE", "El registro ya existe", 409);
  }

  throw new AppError(code, error.message || message, status);
}

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeHour(value: string): string {
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) {
    throw new AppError("AGENDA_SLOT_INVALID", "Horario inválido", 400);
  }
  return `${match[1]}:${match[2]}`;
}

function toMinutes(hour: string): number {
  const normalized = normalizeHour(hour);
  const [h, m] = normalized.split(":").map(Number);
  return h * 60 + m;
}

function toHour(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function toHourFromDb(value: string | null | undefined): string {
  if (!value) return "00:00";
  return normalizeHour(value);
}

function getTodayUyDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
  }).format(new Date());
}

function diffDaysDateOnly(targetDate: string, fromDate: string): number {
  const target = new Date(`${targetDate}T12:00:00Z`);
  const from = new Date(`${fromDate}T12:00:00Z`);
  if (Number.isNaN(target.getTime()) || Number.isNaN(from.getTime())) return 0;
  return Math.floor((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function getDayOfWeekUy(dateOnly: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const date = new Date(`${dateOnly}T12:00:00-03:00`);
  const jsDay = date.getUTCDay();
  return (jsDay === 0 ? 7 : jsDay) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

function normalizeAgendaStatus(value: string | null | undefined): AgendaStatus {
  if (value === "activa" || value === "pausada" || value === "deshabilitada") {
    return value;
  }
  return "activa";
}

function normalizeTurnoEstado(value: string | null | undefined): TurnoEstado {
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

function normalizeExceptionTipo(value: string | null | undefined): AgendaExceptionTipo {
  return value === "habilitacion" ? "habilitacion" : "bloqueo";
}

function slotDurationIsSupported(value: number): boolean {
  return value === 30 || value === 60 || value === 90 || value === 120;
}

interface AgendaConfigRow {
  id: number;
  status: string;
  pause_reason: string | null;
  pause_until: string | null;
  slot_duration_minutes: number;
  min_days_ahead: number;
  max_days_ahead: number;
  timezone: string;
}

interface WeeklyRuleRow {
  id: string;
  day_of_week: number;
  enabled: boolean;
  start_time: string;
  end_time: string;
}

interface ExceptionRow {
  id: string;
  fecha: string;
  tipo: string;
  hora_desde: string;
  hora_hasta: string;
  motivo: string | null;
  created_by: string | null;
  created_at: string;
}

interface AgendaBookedRow {
  id: string;
  hora_slot: string | null;
}

interface AgendaTurnoDbRow {
  id: string;
  servicio_solicitado: string;
  estado: string;
  notas: string | null;
  fecha_turno: string;
  fecha_slot: string | null;
  hora_slot: string | null;
  clientes: { nombre_completo: string; telefono: string } | null;
}

function mapAgendaConfig(row: AgendaConfigRow): AgendaConfig {
  return {
    status: normalizeAgendaStatus(row.status),
    pauseReason: row.pause_reason,
    pauseUntil: row.pause_until,
    slotDurationMinutes: row.slot_duration_minutes,
    minDaysAhead: row.min_days_ahead,
    maxDaysAhead: row.max_days_ahead,
    timezone: "America/Montevideo",
  };
}

function isPauseExpired(config: AgendaConfig): boolean {
  if (config.status !== "pausada" || !config.pauseUntil) return false;
  const pauseUntil = new Date(config.pauseUntil);
  if (Number.isNaN(pauseUntil.getTime())) return false;
  return pauseUntil.getTime() <= Date.now();
}

function getEffectiveStatus(config: AgendaConfig): AgendaStatus {
  if (isPauseExpired(config)) return "activa";
  return config.status;
}

function isAcceptingBookings(config: AgendaConfig): boolean {
  const effective = getEffectiveStatus(config);
  return effective === "activa";
}

function buildSlotsForRange(
  startTime: string,
  endTime: string,
  slotDurationMinutes: number
): string[] {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (end <= start) return [];

  const slots: string[] = [];
  for (let cursor = start; cursor + slotDurationMinutes <= end; cursor += slotDurationMinutes) {
    slots.push(toHour(cursor));
  }
  return slots;
}

async function ensureAgendaConfigRow(): Promise<AgendaConfigRow> {
  const service = getInsforgeServiceClient();
  const lookup = (await service.database
    .from("agenda_configuracion")
    .select(
      "id, status, pause_reason, pause_until, slot_duration_minutes, min_days_ahead, max_days_ahead, timezone"
    )
    .eq("id", 1)
    .maybeSingle()) as DbResponse<AgendaConfigRow>;

  throwDbError(lookup.error, "AGENDA_CONFIG_LOOKUP_FAILED", "No se pudo cargar configuración");
  if (lookup.data?.id) return lookup.data;

  const created = (await service.database
    .from("agenda_configuracion")
    .insert([
      {
        id: 1,
        status: "activa",
        slot_duration_minutes: 60,
        min_days_ahead: 1,
        max_days_ahead: 30,
        timezone: "America/Montevideo",
      },
    ])
    .select(
      "id, status, pause_reason, pause_until, slot_duration_minutes, min_days_ahead, max_days_ahead, timezone"
    )
    .maybeSingle()) as DbResponse<AgendaConfigRow>;

  throwDbError(created.error, "AGENDA_CONFIG_CREATE_FAILED", "No se pudo crear configuración");
  if (!created.data?.id) {
    throw new AppError("AGENDA_CONFIG_EMPTY", "No se pudo inicializar agenda", 500);
  }
  return created.data;
}

async function listWeeklyRulesByDay(dayOfWeek: number): Promise<WeeklyRuleRow[]> {
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("agenda_franjas_semanales")
    .select("id, day_of_week, enabled, start_time, end_time")
    .eq("day_of_week", dayOfWeek)
    .order("start_time", { ascending: true })) as DbResponse<WeeklyRuleRow[]>;

  throwDbError(response.error, "AGENDA_WEEKLY_LIST_FAILED", "No se pudo leer agenda semanal");
  return response.data ?? [];
}

async function listExceptionsByDate(fecha: string): Promise<ExceptionRow[]> {
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("agenda_excepciones")
    .select("id, fecha, tipo, hora_desde, hora_hasta, motivo, created_by, created_at")
    .eq("fecha", fecha)
    .order("hora_desde", { ascending: true })) as DbResponse<ExceptionRow[]>;

  throwDbError(response.error, "AGENDA_EXCEPTIONS_LIST_FAILED", "No se pudo leer excepciones");
  return response.data ?? [];
}

async function listBookedSlotsByDate(fecha: string): Promise<Map<string, string>> {
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("turnos_taller")
    .select("id, hora_slot")
    .eq("fecha_slot", fecha)
    .neq("estado", "cancelado")) as DbResponse<AgendaBookedRow[]>;

  throwDbError(response.error, "AGENDA_BOOKINGS_LIST_FAILED", "No se pudo leer turnos del día");
  const booked = new Map<string, string>();
  for (const row of response.data ?? []) {
    if (!row.hora_slot) continue;
    booked.set(toHourFromDb(row.hora_slot), row.id);
  }
  return booked;
}

interface DaySlotContext {
  candidateSlots: string[];
  enabledSlots: Set<string>;
  blockedSlots: Set<string>;
  bookedSlots: Map<string, string>;
}

async function buildDaySlotContext(
  fecha: string,
  config: AgendaConfig
): Promise<DaySlotContext> {
  const dayOfWeek = getDayOfWeekUy(fecha);
  const [weeklyRows, exceptionRows, bookedSlots] = await Promise.all([
    listWeeklyRulesByDay(dayOfWeek),
    listExceptionsByDate(fecha),
    listBookedSlotsByDate(fecha),
  ]);

  const baseSlots = new Set<string>();
  for (const rule of weeklyRows) {
    if (!rule.enabled) continue;
    for (const slot of buildSlotsForRange(
      toHourFromDb(rule.start_time),
      toHourFromDb(rule.end_time),
      config.slotDurationMinutes
    )) {
      baseSlots.add(slot);
    }
  }

  const enabledSlots = new Set<string>(baseSlots);
  const blockedSlots = new Set<string>();

  for (const exception of exceptionRows) {
    const exceptionSlots = buildSlotsForRange(
      toHourFromDb(exception.hora_desde),
      toHourFromDb(exception.hora_hasta),
      config.slotDurationMinutes
    );
    if (normalizeExceptionTipo(exception.tipo) === "habilitacion") {
      for (const slot of exceptionSlots) {
        enabledSlots.add(slot);
        blockedSlots.delete(slot);
      }
    } else {
      for (const slot of exceptionSlots) {
        blockedSlots.add(slot);
      }
    }
  }

  const candidate = new Set<string>([...enabledSlots, ...blockedSlots]);
  return {
    candidateSlots: [...candidate].sort((a, b) => toMinutes(a) - toMinutes(b)),
    enabledSlots,
    blockedSlots,
    bookedSlots,
  };
}

function isOutsideBookingWindow(fecha: string, config: AgendaConfig): boolean {
  const today = getTodayUyDate();
  const diff = diffDaysDateOnly(fecha, today);
  return diff < config.minDaysAhead || diff > config.maxDaysAhead;
}

function buildTurnoTimestampIso(fecha: string, hora: string): string {
  const normalizedHour = normalizeHour(hora);
  const date = new Date(`${fecha}T${normalizedHour}:00-03:00`);
  if (Number.isNaN(date.getTime())) {
    throw new AppError("INVALID_DATETIME", "Fecha y horario inválidos", 400);
  }
  return date.toISOString();
}

function getUyHourNow(): string {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Montevideo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  return normalizeHour(formatted);
}

function mapException(row: ExceptionRow): AgendaException {
  return {
    id: row.id,
    fecha: row.fecha,
    tipo: normalizeExceptionTipo(row.tipo),
    horaDesde: toHourFromDb(row.hora_desde),
    horaHasta: toHourFromDb(row.hora_hasta),
    motivo: row.motivo ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function mapWeekly(row: WeeklyRuleRow): AgendaWeeklyRule {
  return {
    id: row.id,
    dayOfWeek: row.day_of_week as 1 | 2 | 3 | 4 | 5 | 6 | 7,
    enabled: row.enabled,
    startTime: toHourFromDb(row.start_time),
    endTime: toHourFromDb(row.end_time),
  };
}

function mapTurnoRow(row: AgendaTurnoDbRow): AgendaTurnoRow {
  const fallbackFecha = row.fecha_turno.slice(0, 10);
  const fallbackHora = normalizeHour(row.fecha_turno.slice(11, 16));
  return {
    id: row.id,
    clienteNombre: row.clientes?.nombre_completo ?? "Cliente",
    telefono: row.clientes?.telefono ?? "",
    fecha: row.fecha_slot ?? fallbackFecha,
    hora: row.hora_slot ? toHourFromDb(row.hora_slot) : fallbackHora,
    estado: normalizeTurnoEstado(row.estado),
    servicio: row.servicio_solicitado,
    notas: row.notas,
  };
}

function normalizePagination(input: { page?: number; pageSize?: number }) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));
  return { page, pageSize };
}

export async function obtenerAgendaConfig(): Promise<AgendaConfig> {
  const row = await ensureAgendaConfigRow();
  return mapAgendaConfig(row);
}

export async function obtenerAgendaConfigPublica() {
  const config = await obtenerAgendaConfig();
  return {
    acceptingBookings: isAcceptingBookings(config),
    status: getEffectiveStatus(config),
    pauseReason: config.pauseReason ?? null,
    pauseUntil: config.pauseUntil ?? null,
    timezone: config.timezone,
    slotDurationMinutes: config.slotDurationMinutes,
    bookingWindow: {
      minDaysAhead: config.minDaysAhead,
      maxDaysAhead: config.maxDaysAhead,
    },
    supportWhatsapp: getSupportWhatsappNumber(),
  };
}

export async function obtenerDisponibilidadAgenda(fecha: string): Promise<{
  fecha: string;
  slots: AgendaAvailabilitySlot[];
}> {
  if (!isDateOnly(fecha)) {
    throw new AppError("VALIDATION_ERROR", "Fecha inválida", 400);
  }

  const config = await obtenerAgendaConfig();
  const outsideWindow = isOutsideBookingWindow(fecha, config);
  const acceptingBookings = isAcceptingBookings(config);
  const context = await buildDaySlotContext(fecha, config);

  const slots = context.candidateSlots.map<AgendaAvailabilitySlot>((hora) => {
    if (outsideWindow) {
      return { hora, available: false, reason: "outside_window" };
    }
    if (!acceptingBookings) {
      return { hora, available: false, reason: "agenda_paused" };
    }
    if (context.blockedSlots.has(hora)) {
      return { hora, available: false, reason: "blocked" };
    }
    const bookedTurnoId = context.bookedSlots.get(hora);
    if (bookedTurnoId) {
      return { hora, available: false, reason: "booked", turnoId: bookedTurnoId };
    }
    if (!context.enabledSlots.has(hora)) {
      return { hora, available: false, reason: "blocked" };
    }
    return { hora, available: true };
  });

  return { fecha, slots };
}

export async function validarSlotAgendaReserva(input: {
  fecha: string;
  hora: string;
  excludeTurnoId?: string;
}) {
  if (!isDateOnly(input.fecha)) {
    throw new AppError("AGENDA_SLOT_INVALID", "Fecha inválida", 400);
  }

  const horaSolicitada = normalizeHour(input.hora);
  const config = await obtenerAgendaConfig();

  if (isOutsideBookingWindow(input.fecha, config)) {
    throw new AppError(
      "AGENDA_OUT_OF_WINDOW",
      "La fecha está fuera de la ventana permitida",
      400
    );
  }

  if (!isAcceptingBookings(config)) {
    throw new AppError("AGENDA_PAUSED", "La agenda está pausada temporalmente", 409);
  }

  const context = await buildDaySlotContext(input.fecha, config);
  const slotExists = context.candidateSlots.includes(horaSolicitada);
  if (!slotExists || !context.enabledSlots.has(horaSolicitada)) {
    throw new AppError("AGENDA_SLOT_INVALID", "Horario no disponible en agenda", 400);
  }

  if (context.blockedSlots.has(horaSolicitada)) {
    throw new AppError("SLOT_UNAVAILABLE", "Ese horario está bloqueado", 409);
  }

  const existingTurnoId = context.bookedSlots.get(horaSolicitada);
  if (existingTurnoId && existingTurnoId !== input.excludeTurnoId) {
    throw new AppError("SLOT_UNAVAILABLE", "Ese horario ya fue reservado", 409);
  }

  return {
    fechaSlot: input.fecha,
    horaSlot: horaSolicitada,
    fechaTurnoIso: buildTurnoTimestampIso(input.fecha, horaSolicitada),
  };
}

export async function obtenerAgendaConfigAdmin() {
  const config = await obtenerAgendaConfig();
  return {
    ...config,
    effectiveStatus: getEffectiveStatus(config),
    acceptingBookings: isAcceptingBookings(config),
  };
}

export async function actualizarAgendaConfigAdmin(patch: {
  status?: AgendaStatus;
  pauseReason?: string | null;
  pauseUntil?: string | null;
  minDaysAhead?: number;
  maxDaysAhead?: number;
  slotDurationMinutes?: number;
}) {
  const current = await ensureAgendaConfigRow();
  const currentConfig = mapAgendaConfig(current);

  const nextConfig: AgendaConfig = {
    status: patch.status ?? currentConfig.status,
    pauseReason:
      patch.pauseReason === undefined ? currentConfig.pauseReason : patch.pauseReason,
    pauseUntil: patch.pauseUntil === undefined ? currentConfig.pauseUntil : patch.pauseUntil,
    minDaysAhead: patch.minDaysAhead ?? currentConfig.minDaysAhead,
    maxDaysAhead: patch.maxDaysAhead ?? currentConfig.maxDaysAhead,
    slotDurationMinutes:
      patch.slotDurationMinutes ?? currentConfig.slotDurationMinutes,
    timezone: "America/Montevideo",
  };

  if (nextConfig.maxDaysAhead < nextConfig.minDaysAhead) {
    throw new AppError(
      "VALIDATION_ERROR",
      "maxDaysAhead debe ser mayor o igual a minDaysAhead",
      400
    );
  }
  if (!slotDurationIsSupported(nextConfig.slotDurationMinutes)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "slotDurationMinutes soportado: 30, 60, 90 o 120",
      400
    );
  }

  const payload: Record<string, string | number | null> = {
    status: nextConfig.status,
    pause_reason:
      nextConfig.status === "activa"
        ? null
        : nextConfig.pauseReason?.trim() || null,
    pause_until:
      nextConfig.status === "activa" ? null : nextConfig.pauseUntil ?? null,
    min_days_ahead: nextConfig.minDaysAhead,
    max_days_ahead: nextConfig.maxDaysAhead,
    slot_duration_minutes: nextConfig.slotDurationMinutes,
    timezone: "America/Montevideo",
  };

  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("agenda_configuracion")
    .update(payload)
    .eq("id", 1)
    .select(
      "id, status, pause_reason, pause_until, slot_duration_minutes, min_days_ahead, max_days_ahead, timezone"
    )
    .maybeSingle()) as DbResponse<AgendaConfigRow>;

  throwDbError(
    response.error,
    "AGENDA_CONFIG_UPDATE_FAILED",
    "No se pudo actualizar configuración de agenda"
  );
  if (!response.data?.id) {
    throw new AppError("AGENDA_CONFIG_NOT_FOUND", "Configuración no encontrada", 404);
  }

  return obtenerAgendaConfigAdmin();
}

async function seedDefaultWeeklyRulesIfEmpty() {
  const service = getInsforgeServiceClient();
  const countResp = (await service.database
    .from("agenda_franjas_semanales")
    .select("id", { count: "exact" })) as DbResponse<Array<{ id: string }>>;
  throwDbError(
    countResp.error,
    "AGENDA_WEEKLY_COUNT_FAILED",
    "No se pudo validar agenda semanal"
  );

  if ((countResp.count ?? 0) > 0) return;

  const rows = [1, 2, 3, 4, 5].map((day) => ({
    day_of_week: day,
    enabled: true,
    start_time: "09:00",
    end_time: "18:00",
  }));

  const seed = await service.database.from("agenda_franjas_semanales").insert(rows);
  throwDbError(seed.error, "AGENDA_WEEKLY_SEED_FAILED", "No se pudo inicializar agenda semanal");
}

export async function listarAgendaSemanalAdmin(): Promise<AgendaWeeklyRule[]> {
  await seedDefaultWeeklyRulesIfEmpty();
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("agenda_franjas_semanales")
    .select("id, day_of_week, enabled, start_time, end_time")
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true })) as DbResponse<WeeklyRuleRow[]>;

  throwDbError(response.error, "AGENDA_WEEKLY_LIST_FAILED", "No se pudo leer agenda semanal");
  return (response.data ?? []).map(mapWeekly);
}

export async function reemplazarAgendaSemanalAdmin(
  rules: Array<{
    dayOfWeek: number;
    enabled: boolean;
    startTime: string;
    endTime: string;
  }>
) {
  if (rules.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Debés enviar al menos una franja", 400);
  }

  const payload = rules.map((rule) => {
    const start = normalizeHour(rule.startTime);
    const end = normalizeHour(rule.endTime);
    if (toMinutes(start) >= toMinutes(end)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "La hora de inicio debe ser menor a la de fin",
        400
      );
    }
    return {
      day_of_week: rule.dayOfWeek,
      enabled: rule.enabled,
      start_time: start,
      end_time: end,
    };
  });

  const service = getInsforgeServiceClient();
  const delResp = await service.database
    .from("agenda_franjas_semanales")
    .delete()
    .gte("day_of_week", 1);
  throwDbError(
    delResp.error,
    "AGENDA_WEEKLY_REPLACE_FAILED",
    "No se pudo actualizar agenda semanal"
  );

  const insertResp = await service.database
    .from("agenda_franjas_semanales")
    .insert(payload);
  throwDbError(
    insertResp.error,
    "AGENDA_WEEKLY_REPLACE_FAILED",
    "No se pudo guardar agenda semanal"
  );

  return listarAgendaSemanalAdmin();
}

export async function listarAgendaExcepcionesAdmin(query?: {
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  const service = getInsforgeServiceClient();
  const { page, pageSize } = normalizePagination({
    page: query?.page,
    pageSize: query?.pageSize,
  });

  let request = service.database.from("agenda_excepciones").select(
    "id, fecha, tipo, hora_desde, hora_hasta, motivo, created_by, created_at",
    { count: "exact" }
  );

  if (query?.dateFrom) request = request.gte("fecha", query.dateFrom);
  if (query?.dateTo) request = request.lte("fecha", query.dateTo);

  const response = (await request
    .order("fecha", { ascending: false })
    .order("hora_desde", { ascending: true })) as DbResponse<ExceptionRow[]>;

  throwDbError(
    response.error,
    "AGENDA_EXCEPTIONS_LIST_FAILED",
    "No se pudo obtener excepciones"
  );

  const mapped = (response.data ?? []).map(mapException);
  const start = (page - 1) * pageSize;
  const data = mapped.slice(start, start + pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total: mapped.length,
      totalPages: Math.max(1, Math.ceil(mapped.length / pageSize)),
    },
  };
}

export async function crearAgendaExcepcionAdmin(input: {
  fecha: string;
  tipo: AgendaExceptionTipo;
  horaDesde: string;
  horaHasta: string;
  motivo?: string;
  createdBy?: string;
}) {
  const horaDesde = normalizeHour(input.horaDesde);
  const horaHasta = normalizeHour(input.horaHasta);
  if (toMinutes(horaDesde) >= toMinutes(horaHasta)) {
    throw new AppError("VALIDATION_ERROR", "Rango horario inválido", 400);
  }

  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("agenda_excepciones")
    .insert([
      {
        fecha: input.fecha,
        tipo: input.tipo,
        hora_desde: horaDesde,
        hora_hasta: horaHasta,
        motivo: input.motivo?.trim() || null,
        created_by: input.createdBy ?? null,
      },
    ])
    .select("id, fecha, tipo, hora_desde, hora_hasta, motivo, created_by, created_at")
    .maybeSingle()) as DbResponse<ExceptionRow>;

  throwDbError(
    response.error,
    "AGENDA_EXCEPTION_CREATE_FAILED",
    "No se pudo crear excepción"
  );
  if (!response.data?.id) {
    throw new AppError("AGENDA_EXCEPTION_EMPTY", "No se pudo crear excepción", 500);
  }

  return mapException(response.data);
}

export async function eliminarAgendaExcepcionAdmin(id: string) {
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("agenda_excepciones")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle()) as DbResponse<{ id: string }>;

  throwDbError(
    response.error,
    "AGENDA_EXCEPTION_DELETE_FAILED",
    "No se pudo eliminar excepción"
  );
  if (!response.data?.id) {
    throw new AppError("AGENDA_EXCEPTION_NOT_FOUND", "Excepción no encontrada", 404);
  }
  return { id: response.data.id };
}

export async function listarTurnosAgendaAdmin(query: {
  estado?: TurnoEstado | "todos";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const service = getInsforgeServiceClient();
  const { page, pageSize } = normalizePagination(query);

  let request = service.database.from("turnos_taller").select(
    `
      id,
      servicio_solicitado,
      estado,
      notas,
      fecha_turno,
      fecha_slot,
      hora_slot,
      clientes (nombre_completo, telefono)
    `,
    { count: "exact" }
  );

  if (query.estado && query.estado !== "todos") {
    request = request.eq("estado", query.estado);
  }
  if (query.dateFrom) request = request.gte("fecha_slot", query.dateFrom);
  if (query.dateTo) request = request.lte("fecha_slot", query.dateTo);

  const response = (await request
    .order("fecha_slot", { ascending: true })
    .order("hora_slot", { ascending: true })) as DbResponse<AgendaTurnoDbRow[]>;

  throwDbError(response.error, "AGENDA_TURNOS_LIST_FAILED", "No se pudo obtener turnos");
  const mapped = (response.data ?? []).map(mapTurnoRow);

  const search = query.search?.trim().toLowerCase();
  const filtered = search
    ? mapped.filter((item) =>
        [item.clienteNombre, item.telefono, item.servicio, item.fecha, item.hora]
          .join(" ")
          .toLowerCase()
          .includes(search)
      )
    : mapped;

  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);
  return {
    data,
    pagination: {
      page,
      pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    },
  };
}

export async function actualizarTurnoAgendaAdmin(
  id: string,
  patch: {
    estado?: TurnoEstado;
    fecha?: string;
    hora?: string;
    notas?: string;
  }
) {
  const service = getInsforgeServiceClient();

  const lookup = (await service.database
    .from("turnos_taller")
    .select(
      `
        id,
        cliente_id,
        servicio_solicitado,
        estado,
        fecha_turno,
        fecha_slot,
        hora_slot,
        clientes (nombre_completo, telefono)
      `
    )
    .eq("id", id)
    .maybeSingle()) as DbResponse<{
    id: string;
    cliente_id: string;
    servicio_solicitado: string;
    estado: string;
    fecha_turno: string;
    fecha_slot: string | null;
    hora_slot: string | null;
    clientes: { nombre_completo: string; telefono: string } | null;
  }>;

  throwDbError(lookup.error, "AGENDA_TURNO_LOOKUP_FAILED", "No se pudo buscar turno");
  if (!lookup.data?.id) {
    throw new AppError("AGENDA_TURNO_NOT_FOUND", "Turno no encontrado", 404);
  }

  const payload: Record<string, string | null> = {};
  if (patch.estado) payload.estado = patch.estado;
  if (typeof patch.notas === "string") {
    payload.notas = patch.notas.trim() || null;
  }

  if (patch.fecha && patch.hora) {
    const slot = await validarSlotAgendaReserva({
      fecha: patch.fecha,
      hora: patch.hora,
      excludeTurnoId: id,
    });
    payload.fecha_turno = slot.fechaTurnoIso;
    payload.fecha_slot = slot.fechaSlot;
    payload.hora_slot = slot.horaSlot;
  }

  if (Object.keys(payload).length === 0) {
    throw new AppError("EMPTY_PATCH", "No hay cambios para aplicar", 400);
  }

  const response = (await service.database
    .from("turnos_taller")
    .update(payload)
    .eq("id", id)
    .select("id")
    .maybeSingle()) as DbResponse<{ id: string }>;

  if (response.error?.code === "23505") {
    throw new AppError("SLOT_UNAVAILABLE", "Ese horario ya fue reservado", 409);
  }
  throwDbError(response.error, "AGENDA_TURNO_UPDATE_FAILED", "No se pudo actualizar turno");
  if (!response.data?.id) {
    throw new AppError("AGENDA_TURNO_NOT_FOUND", "Turno no encontrado", 404);
  }

  const previous = mapTurnoRow({
    id: lookup.data.id,
    servicio_solicitado: lookup.data.servicio_solicitado,
    estado: lookup.data.estado,
    notas: null,
    fecha_turno: lookup.data.fecha_turno,
    fecha_slot: lookup.data.fecha_slot,
    hora_slot: lookup.data.hora_slot,
    clientes: lookup.data.clientes,
  });
  const cliente = lookup.data.clientes;
  if (cliente?.telefono) {
    if (patch.estado === "cancelado" && previous.estado !== "cancelado") {
      await crearComunicacionOperativa({
        sourceType: "turno",
        sourceId: id,
        clienteId: lookup.data.cliente_id,
        eventType: "turno_cancelado",
        recipientPhone: cliente.telefono,
        message: `Hola ${cliente.nombre_completo}, te avisamos que tu turno del ${previous.fecha} a las ${previous.hora} en Fede Moto Servicios fue cancelado. Coordinamos una nueva fecha por este medio.`,
        payload: {
          turnoId: id,
          fechaAnterior: previous.fecha,
          horaAnterior: previous.hora,
          servicio: lookup.data.servicio_solicitado,
        },
      });
    } else if (patch.fecha && patch.hora && (patch.fecha !== previous.fecha || patch.hora !== previous.hora)) {
      await crearComunicacionOperativa({
        sourceType: "turno",
        sourceId: id,
        clienteId: lookup.data.cliente_id,
        eventType: "turno_reprogramado",
        recipientPhone: cliente.telefono,
        message: `Hola ${cliente.nombre_completo}, reprogramamos tu turno en Fede Moto Servicios para el ${patch.fecha} a las ${patch.hora}.`,
        payload: {
          turnoId: id,
          fechaAnterior: previous.fecha,
          horaAnterior: previous.hora,
          fecha: patch.fecha,
          hora: patch.hora,
          servicio: lookup.data.servicio_solicitado,
        },
      });
    }
  }

  return { id: response.data.id };
}

export function buildAgendaSlotNowForManualService() {
  const fechaSlot = getTodayUyDate();
  const horaSlot = getUyHourNow();
  return {
    fechaSlot,
    horaSlot,
    fechaTurnoIso: buildTurnoTimestampIso(fechaSlot, horaSlot),
  };
}
