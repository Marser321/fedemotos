export type PlanType = "basico" | "premium";

export type MembresiaEstado = "activo" | "pendiente" | "inactivo";
export type AuxilioEstado = "pendiente" | "en_camino" | "completado";
export type TurnoEstado = "pendiente" | "en_proceso" | "completado" | "cancelado";
export type AuxilioTipo = "auxilio" | "traslado";
export type AuxilioPrioridad = "baja" | "media" | "alta" | "urgente";
export type ReminderEstado = "pendiente" | "enviado_manual" | "omitido" | "error";
export type CommunicationStatus = ReminderEstado;
export type CommunicationSourceType =
  | "orden"
  | "turno"
  | "auxilio"
  | "traslado"
  | "membresia"
  | "servicio"
  | "legacy_recordatorio";
export type CommunicationEventType =
  | "orden_lista"
  | "orden_espera_repuestos"
  | "turno_creado"
  | "turno_reprogramado"
  | "turno_cancelado"
  | "auxilio_recibido"
  | "auxilio_en_camino"
  | "auxilio_completado"
  | "traslado_recibido"
  | "traslado_en_camino"
  | "traslado_completado"
  | "membresia_vence_7"
  | "membresia_vence_3"
  | "membresia_vence_1"
  | "service_control_30";
export type AgendaStatus = "activa" | "pausada" | "deshabilitada";
export type AgendaExceptionTipo = "bloqueo" | "habilitacion";
export type OrdenEstado =
  | "ingresado"
  | "diagnostico"
  | "espera_repuestos"
  | "reparacion"
  | "listo"
  | "entregado"
  | "cancelado";
export type AgendaSlotReason =
  | "booked"
  | "blocked"
  | "outside_window"
  | "agenda_paused";
export type ReminderTipoEvento =
  | "membresia_vence_7"
  | "membresia_vence_3"
  | "membresia_vence_1"
  | "service_control_30";

export type HelpProcedureId =
  | "operacion_general"
  | "agenda_reserva"
  | "agenda_pausar"
  | "agenda_reactivar"
  | "agenda_excepcion"
  | "persistencia_check";

export interface HelpStep {
  id: string;
  title: string;
  description: string;
  target: string;
  tab?: "overview" | "auxilios" | "membresias" | "agenda" | "reminders" | "servicios";
}

export interface HelpAssetRef {
  screenshot: string;
  animation: string;
  alt: string;
}

export interface HelpProcedure {
  id: HelpProcedureId;
  title: string;
  summary: string;
  assets: HelpAssetRef;
  checklist: string[];
  steps: HelpStep[];
}

export interface Suscriptor {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  moto: string;
  plan: PlanType;
  estado: MembresiaEstado;
  cuposRestantes: number;
  fechaInicio: string;
}

export interface SolicitudAuxilio {
  id: string;
  clienteNombre: string;
  telefono: string;
  latitud: number;
  longitud: number;
  descripcion: string;
  estado: AuxilioEstado;
  fecha: string;
  moto: string;
  tipo?: AuxilioTipo;
  prioridad?: AuxilioPrioridad;
}

export interface ServicioRegistro {
  id: string;
  clienteNombre: string;
  moto: string;
  servicio: string;
  kilometraje: number;
  fecha: string;
  estado: Exclude<TurnoEstado, "cancelado">;
  costo: number;
}

export interface DashboardStats {
  totalSuscriptores: number;
  suscriptoresActivos: number;
  auxiliosEsteMes: number;
  facturacionMensual: number;
  serviciosCompletados: number;
}

export interface ClienteCuenta {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  moto: string;
  plan: PlanType;
  estado: MembresiaEstado;
  cuposRestantes: number;
  fechaInicio: string;
  ordenesActivas?: Array<{
    id: string;
    titulo: string;
    estado: OrdenEstado;
    vehiculo?: string | null;
    fechaPrometida?: string | null;
  }>;
  turnosProximos?: Array<{
    id: string;
    fecha: string;
    hora: string;
    estado: TurnoEstado;
    servicio: string;
  }>;
  auxiliosActivos?: Array<{
    id: string;
    tipo: AuxilioTipo;
    estado: AuxilioEstado;
    solicitadoEn: string;
    motivo?: string | null;
  }>;
}

export interface SessionPayload {
  role: "cliente" | "admin";
  sub: string;
  telefono?: string;
  exp: number;
  iat: number;
}

export interface OtpRequestResult {
  step: "code_sent";
  channel: "email";
  destination: string;
  devCode?: string;
}

export interface OperacionAuxilioItem {
  id: string;
  tipo: AuxilioTipo;
  prioridad: AuxilioPrioridad;
  estado: AuxilioEstado;
  clienteId: string;
  clienteNombre: string;
  telefono: string;
  vehiculo?: string;
  vehiculoId?: string | null;
  origen: {
    lat: number;
    lng: number;
    referencia?: string;
  };
  destino?: {
    lat: number;
    lng: number;
    referencia?: string;
  };
  motivo: string;
  notasInternas?: string;
  creadoDesde: "app_cliente" | "admin_manual";
  solicitadoEn: string;
  completadoEn?: string | null;
}

export interface MembresiaRow {
  membresiaId: string;
  clienteId: string;
  nombre: string;
  telefono: string;
  email: string;
  moto: string;
  plan: PlanType;
  estado: MembresiaEstado;
  fechaInicio: string;
  fechaFin: string;
  diasParaVencer: number;
  auxiliosRestantes: number;
  ultimoAuxilioAt?: string | null;
  ultimoServiceAt?: string | null;
  ultimoServiceKm?: number | null;
}

export interface ReminderQueueItem {
  id: string;
  tipoEvento: ReminderTipoEvento;
  status: ReminderEstado;
  clienteId: string;
  clienteNombre: string;
  telefono: string;
  scheduledDate: string;
  messagePreview: string;
  waLink: string;
  sentAt?: string | null;
  sentBy?: string | null;
  skipReason?: string | null;
  payload: Record<string, unknown>;
}

export interface CommunicationQueueItem {
  id: string;
  sourceType: CommunicationSourceType;
  sourceId: string;
  eventType: CommunicationEventType;
  status: CommunicationStatus;
  channel: "whatsapp";
  clienteId?: string | null;
  clienteNombre: string;
  telefono: string;
  scheduledDate: string;
  messagePreview: string;
  waLink: string;
  sourceLabel: string;
  eventLabel: string;
  sentAt?: string | null;
  sentBy?: string | null;
  skipReason?: string | null;
  payload: Record<string, unknown>;
}

export interface ClienteOperacionPrefill {
  found: boolean;
  clienteId?: string;
  nombre?: string;
  telefono?: string;
  email?: string;
  vehiculos?: Array<{
    id: string;
    marca: string;
    modelo: string;
    label: string;
  }>;
}

export interface AgendaConfig {
  status: AgendaStatus;
  pauseReason?: string | null;
  pauseUntil?: string | null;
  slotDurationMinutes: number;
  minDaysAhead: number;
  maxDaysAhead: number;
  timezone: "America/Montevideo";
}

export interface AgendaWeeklyRule {
  id: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface AgendaException {
  id: string;
  fecha: string;
  tipo: AgendaExceptionTipo;
  horaDesde: string;
  horaHasta: string;
  motivo?: string;
  createdBy?: string | null;
  createdAt?: string;
}

export interface AgendaAvailabilitySlot {
  hora: string;
  available: boolean;
  reason?: AgendaSlotReason;
  turnoId?: string;
}

export interface AgendaTurnoRow {
  id: string;
  clienteNombre: string;
  telefono: string;
  fecha: string;
  hora: string;
  estado: TurnoEstado;
  servicio: string;
  notas?: string | null;
}

export interface OrdenTimelineEvent {
  id: string;
  ordenId: string;
  tipo: "estado" | "nota" | "creacion";
  estadoDesde?: OrdenEstado | null;
  estadoHasta?: OrdenEstado | null;
  nota?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface OrdenTaller {
  id: string;
  clienteId: string;
  clienteNombre: string;
  telefono: string;
  vehiculoId?: string | null;
  vehiculo?: string | null;
  turnoId?: string | null;
  estado: OrdenEstado;
  titulo: string;
  descripcion?: string | null;
  diagnostico?: string | null;
  notasInternas?: string | null;
  costoEstimado: number;
  costoFinal: number;
  fechaIngreso: string;
  fechaPrometida?: string | null;
  ingresadoAt?: string | null;
  diagnosticoAt?: string | null;
  esperaRepuestosAt?: string | null;
  reparacionAt?: string | null;
  listoAt?: string | null;
  entregadoAt?: string | null;
  canceladoAt?: string | null;
  createdAt: string;
  updatedAt: string;
  timeline?: OrdenTimelineEvent[];
}

export interface AdminWorkdaySummary {
  stats: DashboardStats;
  operacionesAbiertas: OperacionAuxilioItem[];
  turnosHoy: AgendaTurnoRow[];
  ordenesActivas: OrdenTaller[];
  recordatoriosPendientes: ReminderQueueItem[];
  comunicacionesPendientes?: CommunicationQueueItem[];
  alertas: Array<{
    id: string;
    level: "info" | "warning" | "critical";
    title: string;
    detail: string;
    href?: string;
  }>;
}
