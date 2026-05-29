import { AppError } from "../errors";
import { getInsforgeServiceClient } from "../insforge";
import { normalizePhone } from "../phone";
import type { MembresiaEstado, PlanType, Suscriptor } from "../types";
import {
  addDaysDateOnly,
  type DbResponse,
  findOrCreateCliente,
  findOrCreateVehiculo,
  firstArrayItem,
  formatDateOnly,
  throwDbError,
  toMembresiaEstado,
  toPlanType,
} from "./shared";

export async function getSuscriptores(): Promise<Suscriptor[]> {
  const service = getInsforgeServiceClient();
  const response = (await service.database.from("membresias").select(`
      id,
      plan,
      estado,
      auxilios_restantes,
      fecha_inicio,
      clientes (
        id,
        nombre_completo,
        telefono,
        email,
        vehiculos (marca, modelo)
      )
    `)) as DbResponse<
    Array<{
      id: string;
      plan: string | null;
      estado: string | null;
      auxilios_restantes: number | null;
      fecha_inicio: string | null;
      clientes:
        | {
            id: string;
            nombre_completo: string;
            telefono: string;
            email: string | null;
            vehiculos:
              | Array<{ marca: string; modelo: string }>
              | { marca: string; modelo: string }
              | null;
          }
        | null;
    }>
  >;

  throwDbError(
    response.error,
    "SUBSCRIBERS_LIST_FAILED",
    "No se pudo obtener la lista de suscriptores"
  );

  const rows = response.data ?? [];
  return rows
    .filter((row) => row.clientes?.id)
    .map((row) => {
      const cliente = row.clientes!;
      const vehiculo = firstArrayItem(cliente.vehiculos);
      return {
        id: cliente.id,
        nombre: cliente.nombre_completo,
        telefono: cliente.telefono,
        email: cliente.email ?? "",
        moto: vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : "No registrada",
        plan: toPlanType(row.plan),
        estado: toMembresiaEstado(row.estado),
        cuposRestantes: row.auxilios_restantes ?? 0,
        fechaInicio: row.fecha_inicio ?? new Date().toISOString().slice(0, 10),
      };
    });
}

export async function crearSuscripcionManual(data: {
  nombre: string;
  telefono: string;
  email: string;
  marca: string;
  modelo: string;
  plan: PlanType;
}) {
  const cliente = await findOrCreateCliente({
    nombre: data.nombre,
    telefono: data.telefono,
    email: data.email,
  });

  await findOrCreateVehiculo({
    clienteId: cliente.id,
    marca: data.marca,
    modelo: data.modelo,
  });

  const service = getInsforgeServiceClient();

  const existingResp = (await service.database
    .from("membresias")
    .select("id")
    .eq("cliente_id", cliente.id)
    .maybeSingle()) as DbResponse<{ id: string }>;
  throwDbError(
    existingResp.error,
    "MEMBERSHIP_LOOKUP_FAILED",
    "No se pudo validar la membresía actual"
  );

  if (existingResp.data?.id) {
    const fechaInicio = formatDateOnly(new Date());
    const updateResp = (await service.database
      .from("membresias")
      .update({
        plan: data.plan,
        estado: "activo",
        auxilios_restantes: 3,
        fecha_inicio: fechaInicio,
        fecha_fin: addDaysDateOnly(fechaInicio, 30),
      })
      .eq("id", existingResp.data.id)
      .select("id")
      .maybeSingle()) as DbResponse<{ id: string }>;
    throwDbError(
      updateResp.error,
      "MEMBERSHIP_UPDATE_FAILED",
      "No se pudo actualizar la membresía"
    );
    return { clienteId: cliente.id, membresiaId: existingResp.data.id };
  }

  const fechaInicio = formatDateOnly(new Date());
  const createResp = (await service.database
    .from("membresias")
    .insert([
      {
        cliente_id: cliente.id,
        plan: data.plan,
        estado: "activo",
        auxilios_restantes: 3,
        fecha_inicio: fechaInicio,
        fecha_fin: addDaysDateOnly(fechaInicio, 30),
      },
    ])
    .select("id")
    .maybeSingle()) as DbResponse<{ id: string }>;
  throwDbError(
    createResp.error,
    "MEMBERSHIP_CREATE_FAILED",
    "No se pudo crear la membresía"
  );

  if (!createResp.data?.id) {
    throw new AppError("MEMBERSHIP_CREATE_EMPTY", "No se pudo crear la membresía", 500);
  }

  return { clienteId: cliente.id, membresiaId: createResp.data.id };
}

export async function renovarSuscripcion(clienteId: string) {
  const service = getInsforgeServiceClient();
  const fechaInicio = formatDateOnly(new Date());
  const response = (await service.database
    .from("membresias")
    .update({
      estado: "activo",
      auxilios_restantes: 3,
      fecha_inicio: fechaInicio,
      fecha_fin: addDaysDateOnly(fechaInicio, 30),
    })
    .eq("cliente_id", clienteId)
    .select("id")
    .maybeSingle()) as DbResponse<{ id: string }>;

  throwDbError(
    response.error,
    "MEMBERSHIP_RENEW_FAILED",
    "No se pudo renovar la membresía"
  );

  if (!response.data?.id) {
    throw new AppError("MEMBERSHIP_NOT_FOUND", "Membresía no encontrada", 404);
  }

  return { id: response.data.id };
}

export async function editarSuscriptor(
  clienteId: string,
  data: { nombre?: string; telefono?: string; email?: string; plan?: PlanType; estado?: MembresiaEstado }
) {
  const service = getInsforgeServiceClient();

  const clientePayload: Record<string, string> = {};
  if (data.nombre?.trim()) clientePayload.nombre_completo = data.nombre.trim();
  if (data.telefono?.trim()) clientePayload.telefono = normalizePhone(data.telefono);
  if (typeof data.email === "string") clientePayload.email = data.email.trim();

  if (Object.keys(clientePayload).length > 0) {
    const updateClientResp = (await service.database
      .from("clientes")
      .update(clientePayload)
      .eq("id", clienteId)
      .select("id")
      .maybeSingle()) as DbResponse<{ id: string }>;

    throwDbError(
      updateClientResp.error,
      "CLIENT_UPDATE_FAILED",
      "No se pudo actualizar el cliente"
    );

    if (!updateClientResp.data?.id) {
      throw new AppError("CLIENT_NOT_FOUND", "Cliente no encontrado", 404);
    }
  }

  const membershipPayload: Record<string, string> = {};
  if (data.plan) membershipPayload.plan = data.plan;
  if (data.estado) membershipPayload.estado = data.estado;

  if (Object.keys(membershipPayload).length > 0) {
    const updateMemResp = (await service.database
      .from("membresias")
      .update(membershipPayload)
      .eq("cliente_id", clienteId)
      .select("id")
      .maybeSingle()) as DbResponse<{ id: string }>;

    throwDbError(
      updateMemResp.error,
      "MEMBERSHIP_UPDATE_FAILED",
      "No se pudo actualizar la membresía"
    );
  }

  return { id: clienteId };
}
