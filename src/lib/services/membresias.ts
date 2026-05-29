import { AppError } from "../errors";
import { getInsforgeServiceClient } from "../insforge";
import { normalizePhone } from "../phone";
import type { MembresiaEstado, MembresiaRow, PlanType } from "../types";
import {
  addDaysDateOnly,
  type DbResponse,
  diffDaysFromDateOnly,
  firstArrayItem,
  getTodayUyDate,
  normalizePagination,
  sortByDirection,
  throwDbError,
  toMembresiaEstado,
  toPlanType,
} from "./shared";

export interface AdminMembresiasQuery {
  estado?: MembresiaEstado | "todas";
  vencimiento?: "vencida" | "proxima" | "activa" | "inactiva" | "todas";
  plan?: PlanType | "todas";
  search?: string;
  sortBy?:
    | "fecha_fin"
    | "nombre"
    | "estado"
    | "plan"
    | "auxilios_restantes"
    | "ultimo_service";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function listarMembresiasAdmin(query: AdminMembresiasQuery) {
  const service = getInsforgeServiceClient();
  const sortBy = query.sortBy ?? "fecha_fin";
  const sortDir = query.sortDir ?? "asc";
  const { page, pageSize } = normalizePagination(query);
  const hoyUy = getTodayUyDate();

  let request = service.database.from("membresias").select(
    `
      id,
      cliente_id,
      plan,
      estado,
      auxilios_restantes,
      fecha_inicio,
      fecha_fin,
      clientes (
        id,
        nombre_completo,
        telefono,
        email,
        vehiculos (marca, modelo, kilometraje_historico)
      )
    `,
    { count: "exact" }
  );

  if (query.estado && query.estado !== "todas") request = request.eq("estado", query.estado);
  if (query.plan && query.plan !== "todas") request = request.eq("plan", query.plan);

  const response = (await request) as DbResponse<
    Array<{
      id: string;
      cliente_id: string;
      plan: string;
      estado: string;
      auxilios_restantes: number;
      fecha_inicio: string;
      fecha_fin: string | null;
      clientes:
        | {
            id: string;
            nombre_completo: string;
            telefono: string;
            email: string | null;
            vehiculos:
              | Array<{ marca: string; modelo: string; kilometraje_historico: number | null }>
              | { marca: string; modelo: string; kilometraje_historico: number | null }
              | null;
          }
        | null;
    }>
  > & { count?: number | null };

  throwDbError(
    response.error,
    "ADMIN_MEMBERSHIPS_LIST_FAILED",
    "No se pudo obtener membresías"
  );

  const rows = (response.data ?? []).filter((row) => row.clientes?.id);
  const clienteIds = rows.map((row) => row.cliente_id);

  const [auxiliosResp, servicesResp] = await Promise.all([
    service.database
      .from("auxilios")
      .select("cliente_id, solicitado_en")
      .in("cliente_id", clienteIds)
      .order("solicitado_en", { ascending: false }),
    service.database
      .from("turnos_taller")
      .select("cliente_id, fecha_turno, vehiculos (kilometraje_historico)")
      .in("cliente_id", clienteIds)
      .eq("estado", "completado")
      .order("fecha_turno", { ascending: false }),
  ]);

  throwDbError(
    auxiliosResp.error,
    "ADMIN_MEMBERSHIPS_AUX_FETCH_FAILED",
    "No se pudieron obtener últimos auxilios"
  );
  throwDbError(
    servicesResp.error,
    "ADMIN_MEMBERSHIPS_SERV_FETCH_FAILED",
    "No se pudieron obtener últimos servicios"
  );

  const latestAuxByClient = new Map<string, string>();
  for (const row of auxiliosResp.data ?? []) {
    if (!latestAuxByClient.has(row.cliente_id) && row.solicitado_en) {
      latestAuxByClient.set(row.cliente_id, row.solicitado_en);
    }
  }

  const latestServiceByClient = new Map<
    string,
    { fecha: string; km: number | null }
  >();
  for (const row of servicesResp.data ?? []) {
    if (latestServiceByClient.has(row.cliente_id) || !row.fecha_turno) continue;
    const vehiculo = firstArrayItem(
      row.vehiculos as
        | Array<{ kilometraje_historico: number | null }>
        | { kilometraje_historico: number | null }
        | null
    );
    latestServiceByClient.set(row.cliente_id, {
      fecha: row.fecha_turno,
      km: vehiculo?.kilometraje_historico ?? null,
    });
  }

  const mapped: MembresiaRow[] = rows.map((row) => {
    const cliente = row.clientes!;
    const vehiculo = firstArrayItem(cliente.vehiculos);
    const fechaInicio = row.fecha_inicio ?? hoyUy;
    const fechaFin = row.fecha_fin ?? addDaysDateOnly(fechaInicio, 30);
    const ultimoService = latestServiceByClient.get(row.cliente_id);
    return {
      membresiaId: row.id,
      clienteId: row.cliente_id,
      nombre: cliente.nombre_completo,
      telefono: cliente.telefono,
      email: cliente.email ?? "",
      moto: vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : "No registrada",
      plan: toPlanType(row.plan),
      estado: toMembresiaEstado(row.estado),
      fechaInicio,
      fechaFin,
      diasParaVencer: diffDaysFromDateOnly(fechaFin, hoyUy),
      auxiliosRestantes: row.auxilios_restantes ?? 0,
      ultimoAuxilioAt: latestAuxByClient.get(row.cliente_id) ?? null,
      ultimoServiceAt: ultimoService?.fecha ?? null,
      ultimoServiceKm: ultimoService?.km ?? null,
    };
  });

  const searched = query.search?.trim()
    ? mapped.filter((item) => {
        const search = query.search!.trim().toLowerCase();
        const haystack = [item.nombre, item.telefono, item.email, item.moto]
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      })
    : mapped;

  const vencimiento = query.vencimiento ?? "todas";
  const filteredByVencimiento = searched.filter((item) => {
    if (vencimiento === "todas") return true;
    if (vencimiento === "vencida") return item.diasParaVencer < 0;
    if (vencimiento === "proxima") return item.diasParaVencer >= 0 && item.diasParaVencer <= 7;
    if (vencimiento === "activa") return item.estado === "activo" && item.diasParaVencer >= 0;
    if (vencimiento === "inactiva") return item.estado !== "activo";
    return true;
  });

  let sorted = filteredByVencimiento;
  if (sortBy === "fecha_fin") {
    sorted = sortByDirection(filteredByVencimiento, sortDir, (item) => item.fechaFin);
  } else if (sortBy === "nombre") {
    sorted = sortByDirection(filteredByVencimiento, sortDir, (item) => item.nombre.toLowerCase());
  } else if (sortBy === "estado") {
    sorted = sortByDirection(filteredByVencimiento, sortDir, (item) => item.estado);
  } else if (sortBy === "plan") {
    sorted = sortByDirection(filteredByVencimiento, sortDir, (item) => item.plan);
  } else if (sortBy === "auxilios_restantes") {
    sorted = sortByDirection(filteredByVencimiento, sortDir, (item) => item.auxiliosRestantes);
  } else if (sortBy === "ultimo_service") {
    sorted = sortByDirection(filteredByVencimiento, sortDir, (item) =>
      item.ultimoServiceAt ?? ""
    );
  }

  const start = (page - 1) * pageSize;
  const paged = sorted.slice(start, start + pageSize);

  return {
    data: paged,
    pagination: {
      page,
      pageSize,
      total: sorted.length,
      totalPages: Math.max(1, Math.ceil(sorted.length / pageSize)),
    },
    resumen: {
      total: sorted.length,
      vencidas: sorted.filter((item) => item.diasParaVencer < 0).length,
      proximas: sorted.filter(
        (item) => item.diasParaVencer >= 0 && item.diasParaVencer <= 7
      ).length,
      activas: sorted.filter((item) => item.estado === "activo").length,
      inactivas: sorted.filter((item) => item.estado !== "activo").length,
    },
  };
}

export async function actualizarMembresiaAdmin(
  membresiaId: string,
  patch: {
    estado?: MembresiaEstado;
    plan?: PlanType;
    auxiliosRestantes?: number;
    fechaInicio?: string;
    fechaFin?: string;
    contacto?: { nombre?: string; telefono?: string; email?: string };
  }
) {
  const service = getInsforgeServiceClient();
  const lookup = (await service.database
    .from("membresias")
    .select("id, cliente_id")
    .eq("id", membresiaId)
    .maybeSingle()) as DbResponse<{ id: string; cliente_id: string }>;
  throwDbError(
    lookup.error,
    "ADMIN_MEMBERSHIP_LOOKUP_FAILED",
    "No se pudo buscar la membresía"
  );
  if (!lookup.data?.id) {
    throw new AppError("ADMIN_MEMBERSHIP_NOT_FOUND", "Membresía no encontrada", 404);
  }

  const membresiaPayload: Record<string, string | number> = {};
  if (patch.estado) membresiaPayload.estado = patch.estado;
  if (patch.plan) membresiaPayload.plan = patch.plan;
  if (typeof patch.auxiliosRestantes === "number") {
    membresiaPayload.auxilios_restantes = patch.auxiliosRestantes;
  }
  if (patch.fechaInicio) {
    membresiaPayload.fecha_inicio = patch.fechaInicio;
    if (!patch.fechaFin) {
      membresiaPayload.fecha_fin = addDaysDateOnly(patch.fechaInicio, 30);
    }
  }
  if (patch.fechaFin) membresiaPayload.fecha_fin = patch.fechaFin;

  if (Object.keys(membresiaPayload).length > 0) {
    const updateMembership = (await service.database
      .from("membresias")
      .update(membresiaPayload)
      .eq("id", membresiaId)
      .select("id")
      .maybeSingle()) as DbResponse<{ id: string }>;

    throwDbError(
      updateMembership.error,
      "ADMIN_MEMBERSHIP_UPDATE_FAILED",
      "No se pudo actualizar la membresía"
    );
  }

  if (patch.contacto) {
    const clientePayload: Record<string, string> = {};
    if (patch.contacto.nombre?.trim()) clientePayload.nombre_completo = patch.contacto.nombre.trim();
    if (patch.contacto.telefono?.trim()) {
      clientePayload.telefono = normalizePhone(patch.contacto.telefono);
    }
    if (typeof patch.contacto.email === "string") {
      clientePayload.email = patch.contacto.email.trim();
    }

    if (Object.keys(clientePayload).length > 0) {
      const updateClient = (await service.database
        .from("clientes")
        .update(clientePayload)
        .eq("id", lookup.data.cliente_id)
        .select("id")
        .maybeSingle()) as DbResponse<{ id: string }>;
      throwDbError(
        updateClient.error,
        "ADMIN_MEMBERSHIP_CLIENT_UPDATE_FAILED",
        "No se pudo actualizar el contacto"
      );
    }
  }

  return { id: membresiaId };
}
