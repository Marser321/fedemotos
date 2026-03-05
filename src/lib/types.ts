export type PlanType = "basico" | "premium";

export type MembresiaEstado = "activo" | "pendiente" | "inactivo";
export type AuxilioEstado = "pendiente" | "en_camino" | "completado";
export type TurnoEstado = "pendiente" | "en_proceso" | "completado" | "cancelado";
export type AuxilioTipo = "auxilio" | "traslado";
export type AuxilioPrioridad = "baja" | "media" | "alta" | "urgente";
export type ReminderEstado = "pendiente" | "enviado_manual" | "omitido" | "error";
export type ReminderTipoEvento =
  | "membresia_vence_7"
  | "membresia_vence_3"
  | "membresia_vence_1"
  | "service_control_30";

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
