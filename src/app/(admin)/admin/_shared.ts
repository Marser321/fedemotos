import type {
  DashboardStats,
  MembresiaRow,
  OperacionAuxilioItem,
  ReminderQueueItem,
  ServicioRegistro,
  SolicitudAuxilio,
  Suscriptor,
} from "@/lib/types";

export type AdminTab =
  | "overview"
  | "auxilios"
  | "membresias"
  | "agenda"
  | "reminders"
  | "servicios";

export interface DashboardApiResponse {
  ok: true;
  suscriptores: Suscriptor[];
  solicitudes: SolicitudAuxilio[];
  servicios: ServicioRegistro[];
  stats: DashboardStats;
}

export interface OperacionesApiResponse {
  ok: true;
  data: OperacionAuxilioItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  counters: {
    total: number;
    pendientes: number;
    enCamino: number;
    completados: number;
    auxilios: number;
    traslados: number;
  };
}

export interface MembresiasApiResponse {
  ok: true;
  data: MembresiaRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  resumen: {
    total: number;
    vencidas: number;
    proximas: number;
    activas: number;
    inactivas: number;
  };
}

export interface RemindersApiResponse {
  ok: true;
  data: ReminderQueueItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface ApiErrorResponse {
  ok?: boolean;
  error?: {
    message?: string;
  };
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  const json = (await response.json()) as T & ApiErrorResponse;
  if (!response.ok || json.ok === false) {
    throw new Error(json.error?.message || "Error inesperado");
  }
  return json as T;
}

export function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    const text = String(value).trim();
    if (!text) continue;
    search.set(key, text);
  }
  return search.toString();
}

export function normalizeReminderType(tipo: string): string {
  if (tipo === "service_control_30") return "Service 30 días";
  if (tipo === "membresia_vence_7") return "Membresía vence en 7 días";
  if (tipo === "membresia_vence_3") return "Membresía vence en 3 días";
  if (tipo === "membresia_vence_1") return "Membresía vence mañana";
  return tipo;
}

export function buildOperationMapsLink(item: OperacionAuxilioItem): string {
  if (item.tipo === "traslado" && item.destino) {
    return `https://www.google.com/maps/dir/?api=1&origin=${item.origen.lat},${item.origen.lng}&destination=${item.destino.lat},${item.destino.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${item.origen.lat},${item.origen.lng}`;
}

export function buildWhatsAppDispatchLink(item: OperacionAuxilioItem): string {
  const mapsLink =
    item.tipo === "traslado" && item.destino
      ? `https://www.google.com/maps/dir/?api=1&origin=${item.origen.lat},${item.origen.lng}&destination=${item.destino.lat},${item.destino.lng}`
      : `https://www.google.com/maps?q=${item.origen.lat},${item.origen.lng}`;

  const text = `🚨 *ASISTENCIA ASIGNADA (${item.tipo.toUpperCase()})*
👤 *Cliente:* ${item.clienteNombre}
📞 *Teléfono:* ${item.telefono}
🏍️ *Vehículo:* ${item.vehiculo || "No registrado"}
📍 *Ubicación:* ${mapsLink}
📝 *Problema:* ${item.motivo || "Sin descripción"}`;

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}
