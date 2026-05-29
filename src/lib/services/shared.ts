import { AppError } from "../errors";
import { getInsforgeServiceClient } from "../insforge";
import { normalizePhone } from "../phone";
import type {
  AuxilioEstado,
  AuxilioPrioridad,
  AuxilioTipo,
  MembresiaEstado,
  OrdenEstado,
  PlanType,
} from "../types";

export type DbResponse<T> = {
  data: T | null;
  error: { code?: string; message?: string } | null;
};

export function throwDbError(
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

export function toPlanType(value: string | null | undefined): PlanType {
  return value === "premium" ? "premium" : "basico";
}

export function toMembresiaEstado(value: string | null | undefined): MembresiaEstado {
  if (value === "activo" || value === "pendiente" || value === "inactivo") {
    return value;
  }
  return "pendiente";
}

export function toAuxilioEstado(value: string | null | undefined): AuxilioEstado {
  if (value === "pendiente" || value === "en_camino" || value === "completado") {
    return value;
  }
  return "pendiente";
}

export function toAuxilioTipo(value: string | null | undefined): AuxilioTipo {
  return value === "traslado" ? "traslado" : "auxilio";
}

export function toAuxilioPrioridad(value: string | null | undefined): AuxilioPrioridad {
  if (value === "baja" || value === "media" || value === "alta" || value === "urgente") {
    return value;
  }
  return "media";
}

export function toOrdenEstado(value: string | null | undefined): OrdenEstado {
  if (
    value === "ingresado" ||
    value === "diagnostico" ||
    value === "espera_repuestos" ||
    value === "reparacion" ||
    value === "listo" ||
    value === "entregado" ||
    value === "cancelado"
  ) {
    return value;
  }
  return "ingresado";
}

export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysDateOnly(value: string | Date, days: number): string {
  const base =
    typeof value === "string" ? parseDateOnly(value) ?? new Date() : new Date(value);
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return formatDateOnly(next);
}

export function getTodayUyDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
  }).format(new Date());
}

export function diffDaysFromDateOnly(targetDate: string, fromDate: string): number {
  const target = parseDateOnly(targetDate);
  const from = parseDateOnly(fromDate);
  if (!target || !from) return 0;
  const diffMs = target.getTime() - from.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function buildWhatsappLink(telefono: string, message: string): string {
  const cleaned = telefono.replace(/\D/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

export function firstArrayItem<T>(input: T | T[] | null | undefined): T | null {
  if (!input) return null;
  return Array.isArray(input) ? input[0] ?? null : input;
}

export function getPlanPrice(plan: PlanType): number {
  return plan === "premium" ? 1990 : 990;
}

export function normalizePagination(input: { page?: number; pageSize?: number }) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));
  return { page, pageSize };
}

export function sortByDirection<T>(
  data: T[],
  direction: "asc" | "desc",
  getter: (item: T) => string | number
) {
  const dir = direction === "asc" ? 1 : -1;
  return [...data].sort((a, b) => {
    const aValue = getter(a);
    const bValue = getter(b);
    if (aValue < bValue) return -1 * dir;
    if (aValue > bValue) return 1 * dir;
    return 0;
  });
}

export function numberFromDb(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export interface ClienteRow {
  id: string;
  nombre_completo: string;
  telefono: string;
  email: string | null;
}

export interface VehiculoRow {
  id: string;
  marca: string;
  modelo: string;
  kilometraje_historico: number | null;
}

export interface VehiculoLookupRow {
  id: string;
  marca: string;
  modelo: string;
  created_at: string;
}

export interface VehiculoOwnershipRow {
  id: string;
  cliente_id: string;
  marca: string;
  modelo: string;
  kilometraje_historico: number | null;
}

export async function findClienteByPhone(telefono: string): Promise<ClienteRow | null> {
  const service = getInsforgeServiceClient();
  const { data, error } = (await service.database
    .from("clientes")
    .select("id, nombre_completo, telefono, email")
    .eq("telefono", telefono)
    .maybeSingle()) as DbResponse<ClienteRow>;

  throwDbError(error, "CLIENT_LOOKUP_FAILED", "No se pudo buscar el cliente");
  return data;
}

export async function findOrCreateCliente(input: {
  nombre: string;
  telefono: string;
  email?: string;
}): Promise<ClienteRow> {
  const service = getInsforgeServiceClient();
  const telefono = normalizePhone(input.telefono);
  const existing = await findClienteByPhone(telefono);
  if (existing) return existing;

  const { data, error } = (await service.database
    .from("clientes")
    .insert([
      {
        nombre_completo: input.nombre.trim(),
        telefono,
        email: input.email?.trim() || null,
      },
    ])
    .select("id, nombre_completo, telefono, email")
    .maybeSingle()) as DbResponse<ClienteRow>;

  throwDbError(error, "CLIENT_CREATE_FAILED", "No se pudo crear el cliente");

  if (!data) {
    throw new AppError("CLIENT_CREATE_EMPTY", "No se pudo crear el cliente", 500);
  }

  return data;
}

export async function syncClienteFromOperacion(
  existing: ClienteRow,
  input: { nombre: string; email?: string }
): Promise<ClienteRow> {
  const service = getInsforgeServiceClient();
  const nombre = input.nombre.trim();
  const email = input.email?.trim() || "";
  const patch: Record<string, string | null> = {};

  if (nombre && nombre !== existing.nombre_completo) {
    patch.nombre_completo = nombre;
  }
  if (email && email !== (existing.email ?? "")) {
    patch.email = email;
  }

  if (Object.keys(patch).length === 0) {
    return existing;
  }

  const response = (await service.database
    .from("clientes")
    .update(patch)
    .eq("id", existing.id)
    .select("id, nombre_completo, telefono, email")
    .maybeSingle()) as DbResponse<ClienteRow>;

  throwDbError(response.error, "CLIENT_UPDATE_FAILED", "No se pudo actualizar el cliente");
  if (!response.data?.id) {
    throw new AppError("CLIENT_NOT_FOUND", "Cliente no encontrado", 404);
  }
  return response.data;
}

export async function findOrCreateVehiculo(input: {
  clienteId: string;
  marca: string;
  modelo: string;
  kilometraje?: number;
}): Promise<VehiculoRow> {
  const service = getInsforgeServiceClient();
  const marca = input.marca.trim();
  const modelo = input.modelo.trim();

  const existingResp = (await service.database
    .from("vehiculos")
    .select("id, marca, modelo, kilometraje_historico")
    .eq("cliente_id", input.clienteId)
    .eq("marca", marca)
    .eq("modelo", modelo)
    .maybeSingle()) as DbResponse<VehiculoRow>;
  throwDbError(existingResp.error, "VEHICLE_LOOKUP_FAILED", "No se pudo buscar el vehículo");

  if (existingResp.data) {
    return existingResp.data;
  }

  const createResp = (await service.database
    .from("vehiculos")
    .insert([
      {
        cliente_id: input.clienteId,
        marca,
        modelo,
        kilometraje_historico: input.kilometraje ?? 0,
      },
    ])
    .select("id, marca, modelo, kilometraje_historico")
    .maybeSingle()) as DbResponse<VehiculoRow>;
  throwDbError(createResp.error, "VEHICLE_CREATE_FAILED", "No se pudo crear el vehículo");

  if (!createResp.data) {
    throw new AppError("VEHICLE_CREATE_EMPTY", "No se pudo crear el vehículo", 500);
  }

  return createResp.data;
}

export async function findVehiculoById(
  vehiculoId: string
): Promise<VehiculoOwnershipRow | null> {
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("vehiculos")
    .select("id, cliente_id, marca, modelo, kilometraje_historico")
    .eq("id", vehiculoId)
    .maybeSingle()) as DbResponse<VehiculoOwnershipRow>;

  throwDbError(response.error, "VEHICLE_LOOKUP_FAILED", "No se pudo buscar el vehículo");
  return response.data;
}

export async function listVehiculosByCliente(
  clienteId: string
): Promise<VehiculoLookupRow[]> {
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("vehiculos")
    .select("id, marca, modelo, created_at")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false })) as DbResponse<VehiculoLookupRow[]>;

  throwDbError(response.error, "VEHICLE_LOOKUP_FAILED", "No se pudo obtener vehículos del cliente");
  return response.data ?? [];
}
