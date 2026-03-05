import { AppError } from "./errors";
import { getInsforgeServiceClient } from "./insforge";
import { normalizePhone } from "./phone";
import type {
  AuxilioEstado,
  AuxilioPrioridad,
  AuxilioTipo,
  ClienteOperacionPrefill,
  ClienteCuenta,
  DashboardStats,
  MembresiaRow,
  MembresiaEstado,
  PlanType,
  OperacionAuxilioItem,
  ReminderQueueItem,
  ReminderTipoEvento,
  ServicioRegistro,
  SolicitudAuxilio,
  Suscriptor,
} from "./types";

type DbResponse<T> = {
  data: T | null;
  error: { code?: string; message?: string } | null;
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

function toPlanType(value: string | null | undefined): PlanType {
  return value === "premium" ? "premium" : "basico";
}

function toMembresiaEstado(value: string | null | undefined): MembresiaEstado {
  if (value === "activo" || value === "pendiente" || value === "inactivo") {
    return value;
  }
  return "pendiente";
}

function toAuxilioEstado(value: string | null | undefined): AuxilioEstado {
  if (value === "pendiente" || value === "en_camino" || value === "completado") {
    return value;
  }
  return "pendiente";
}

function toAuxilioTipo(value: string | null | undefined): AuxilioTipo {
  return value === "traslado" ? "traslado" : "auxilio";
}

function toAuxilioPrioridad(value: string | null | undefined): AuxilioPrioridad {
  if (value === "baja" || value === "media" || value === "alta" || value === "urgente") {
    return value;
  }
  return "media";
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysDateOnly(value: string | Date, days: number): string {
  const base =
    typeof value === "string" ? parseDateOnly(value) ?? new Date() : new Date(value);
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return formatDateOnly(next);
}

function getTodayUyDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
  }).format(new Date());
}

function diffDaysFromDateOnly(targetDate: string, fromDate: string): number {
  const target = parseDateOnly(targetDate);
  const from = parseDateOnly(fromDate);
  if (!target || !from) return 0;
  const diffMs = target.getTime() - from.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function buildWhatsappLink(telefono: string, message: string): string {
  const cleaned = telefono.replace(/\D/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

function firstArrayItem<T>(input: T | T[] | null | undefined): T | null {
  if (!input) return null;
  return Array.isArray(input) ? input[0] ?? null : input;
}

interface ClienteRow {
  id: string;
  nombre_completo: string;
  telefono: string;
  email: string | null;
}

interface VehiculoRow {
  id: string;
  marca: string;
  modelo: string;
  kilometraje_historico: number | null;
}

interface VehiculoLookupRow {
  id: string;
  marca: string;
  modelo: string;
  created_at: string;
}

interface VehiculoOwnershipRow {
  id: string;
  cliente_id: string;
  marca: string;
  modelo: string;
  kilometraje_historico: number | null;
}

interface MembresiaCuentaRow {
  id: string;
  plan: string | null;
  estado: string | null;
  auxilios_restantes: number | null;
  fecha_inicio: string | null;
  fecha_fin?: string | null;
}

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

interface TurnoRow {
  id: string;
  servicio_solicitado: string;
  estado: string | null;
  creado_en: string | null;
  costo: number | null;
  clientes: { nombre_completo: string } | null;
  vehiculos: { marca: string; modelo: string; kilometraje_historico: number | null } | null;
}

async function findClienteByPhone(telefono: string): Promise<ClienteRow | null> {
  const service = getInsforgeServiceClient();
  const { data, error } = (await service.database
    .from("clientes")
    .select("id, nombre_completo, telefono, email")
    .eq("telefono", telefono)
    .maybeSingle()) as DbResponse<ClienteRow>;

  throwDbError(error, "CLIENT_LOOKUP_FAILED", "No se pudo buscar el cliente");
  return data;
}

async function findOrCreateCliente(input: {
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

async function syncClienteFromOperacion(
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

async function findOrCreateVehiculo(input: {
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

async function findVehiculoById(vehiculoId: string): Promise<VehiculoOwnershipRow | null> {
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("vehiculos")
    .select("id, cliente_id, marca, modelo, kilometraje_historico")
    .eq("id", vehiculoId)
    .maybeSingle()) as DbResponse<VehiculoOwnershipRow>;

  throwDbError(response.error, "VEHICLE_LOOKUP_FAILED", "No se pudo buscar el vehículo");
  return response.data;
}

async function listVehiculosByCliente(clienteId: string): Promise<VehiculoLookupRow[]> {
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("vehiculos")
    .select("id, marca, modelo, created_at")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false })) as DbResponse<VehiculoLookupRow[]>;

  throwDbError(response.error, "VEHICLE_LOOKUP_FAILED", "No se pudo obtener vehículos del cliente");
  return response.data ?? [];
}

async function findLatestVehiculoByCliente(clienteId: string): Promise<VehiculoRow | null> {
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("vehiculos")
    .select("id, marca, modelo, kilometraje_historico")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()) as DbResponse<VehiculoRow>;

  throwDbError(response.error, "VEHICLE_LOOKUP_FAILED", "No se pudo buscar vehículo");
  return response.data;
}

function getPlanPrice(plan: PlanType): number {
  return plan === "premium" ? 1990 : 990;
}

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

export async function getServiciosRegistro(): Promise<ServicioRegistro[]> {
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("turnos_taller")
    .select(`
      id,
      servicio_solicitado,
      estado,
      creado_en,
      costo,
      clientes (nombre_completo),
      vehiculos (marca, modelo, kilometraje_historico)
    `)
    .order("creado_en", { ascending: false })) as DbResponse<TurnoRow[]>;

  throwDbError(
    response.error,
    "SERVICES_LIST_FAILED",
    "No se pudo obtener el historial de servicios"
  );

  return (response.data ?? [])
    .filter((row) => row.estado !== "cancelado")
    .map((row) => ({
      id: row.id,
      clienteNombre: row.clientes?.nombre_completo ?? "Cliente",
      moto: row.vehiculos
        ? `${row.vehiculos.marca} ${row.vehiculos.modelo}`
        : "No registrada",
      servicio: row.servicio_solicitado,
      kilometraje: row.vehiculos?.kilometraje_historico ?? 0,
      fecha: row.creado_en ?? new Date().toISOString(),
      estado:
        row.estado === "en_proceso" || row.estado === "pendiente"
          ? row.estado
          : "completado",
      costo: row.costo ?? 0,
    }));
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const service = getInsforgeServiceClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [subs, auxilios, servicios] = await Promise.all([
    service.database.from("membresias").select("estado, plan", { count: "exact" }),
    service.database
      .from("auxilios")
      .select("id", { count: "exact" })
      .gte("solicitado_en", monthStart.toISOString()),
    service.database
      .from("turnos_taller")
      .select("id", { count: "exact" })
      .eq("estado", "completado"),
  ]);

  throwDbError(subs.error, "DASHBOARD_SUBS_FAILED", "No se pudo leer membresías");
  throwDbError(auxilios.error, "DASHBOARD_AUX_FAILED", "No se pudo leer auxilios");
  throwDbError(servicios.error, "DASHBOARD_SERV_FAILED", "No se pudo leer servicios");

  const rows = subs.data ?? [];
  const activosRows = rows.filter((row) => row.estado === "activo");
  const monthlyRevenue = activosRows.reduce((acc, row) => {
    return acc + getPlanPrice(toPlanType(row.plan));
  }, 0);

  return {
    totalSuscriptores: subs.count ?? 0,
    suscriptoresActivos: activosRows.length,
    auxiliosEsteMes: auxilios.count ?? 0,
    facturacionMensual: monthlyRevenue,
    serviciosCompletados: servicios.count ?? 0,
  };
}

export async function getAdminDashboardData() {
  const [suscriptores, solicitudes, servicios, stats] = await Promise.all([
    getSuscriptores(),
    getSolicitudesAuxilio(),
    getServiciosRegistro(),
    getDashboardStats(),
  ]);

  return { suscriptores, solicitudes, servicios, stats };
}

export async function crearSolicitudAuxilio(input: {
  clienteId: string;
  lat: number;
  lng: number;
  descripcion?: string;
}) {
  const service = getInsforgeServiceClient();
  const vehiculo = await findLatestVehiculoByCliente(input.clienteId);
  const response = (await service.database
    .from("auxilios")
    .insert([
      {
        cliente_id: input.clienteId,
        vehiculo_id: vehiculo?.id ?? null,
        tipo: "auxilio",
        prioridad: "media",
        latitud: input.lat,
        longitud: input.lng,
        origen_referencia: "Ubicación compartida por cliente",
        descripcion_problema: input.descripcion?.trim() || "",
        estado: "pendiente",
        creado_desde: "app_cliente",
      },
    ])
    .select("id")
    .maybeSingle()) as DbResponse<{ id: string }>;

  throwDbError(response.error, "AUXILIO_CREATE_FAILED", "No se pudo crear el auxilio");

  if (!response.data?.id) {
    throw new AppError("AUXILIO_CREATE_EMPTY", "No se pudo crear el auxilio", 500);
  }

  return { id: response.data.id };
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

  return { id: response.data.id };
}

export async function crearTurnoTaller(data: {
  nombre: string;
  telefono: string;
  email?: string;
  marca: string;
  modelo: string;
  kilometraje: string;
  fecha: string;
  horario: string;
  notas?: string;
}) {
  const fechaTurno = new Date(`${data.fecha}T${data.horario}:00`);
  if (Number.isNaN(fechaTurno.getTime())) {
    throw new AppError("INVALID_DATETIME", "Fecha y horario inválidos", 400);
  }

  const cliente = await findOrCreateCliente({
    nombre: data.nombre,
    telefono: data.telefono,
    email: data.email,
  });

  const vehiculo = await findOrCreateVehiculo({
    clienteId: cliente.id,
    marca: data.marca,
    modelo: data.modelo,
    kilometraje: Number.parseInt(data.kilometraje, 10) || 0,
  });

  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("turnos_taller")
    .insert([
      {
        cliente_id: cliente.id,
        vehiculo_id: vehiculo.id,
        servicio_solicitado: data.notas?.trim() || "Mantenimiento general",
        fecha_turno: fechaTurno.toISOString(),
        estado: "pendiente",
        notas: data.notas?.trim() || null,
        costo: 0,
      },
    ])
    .select("id")
    .maybeSingle()) as DbResponse<{ id: string }>;

  throwDbError(response.error, "TURNO_CREATE_FAILED", "No se pudo crear el turno");

  if (!response.data?.id) {
    throw new AppError("TURNO_CREATE_EMPTY", "No se pudo crear el turno", 500);
  }

  return { id: response.data.id };
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

export async function crearServicioManual(data: {
  clienteNombre: string;
  telefono: string;
  marca: string;
  modelo: string;
  servicio: string;
  costo: number;
  kilometraje: number;
}) {
  const cliente = await findOrCreateCliente({
    nombre: data.clienteNombre,
    telefono: data.telefono,
  });

  const vehiculo = await findOrCreateVehiculo({
    clienteId: cliente.id,
    marca: data.marca,
    modelo: data.modelo,
    kilometraje: data.kilometraje || 0,
  });

  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("turnos_taller")
    .insert([
      {
        cliente_id: cliente.id,
        vehiculo_id: vehiculo.id,
        servicio_solicitado: data.servicio.trim(),
        estado: "completado",
        costo: data.costo,
        fecha_turno: new Date().toISOString(),
        creado_en: new Date().toISOString(),
      },
    ])
    .select("id")
    .maybeSingle()) as DbResponse<{ id: string }>;

  throwDbError(response.error, "SERVICE_CREATE_FAILED", "No se pudo registrar el servicio");
  if (!response.data?.id) {
    throw new AppError("SERVICE_CREATE_EMPTY", "No se pudo registrar el servicio", 500);
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

export interface ContactoCarga {
  nombre: string;
  telefono: string;
  email?: string;
  marca?: string;
  modelo?: string;
}

export interface ResultadoCarga {
  nuevos: number;
  duplicados: number;
  errores: number;
  detalles: {
    nombre: string;
    telefono: string;
    estado: "nuevo" | "duplicado" | "error";
    mensaje?: string;
  }[];
}

export async function cargarClientesMasivo(contactos: ContactoCarga[]): Promise<ResultadoCarga> {
  const resultado: ResultadoCarga = { nuevos: 0, duplicados: 0, errores: 0, detalles: [] };

  for (const contacto of contactos) {
    try {
      if (!contacto.nombre?.trim() || !contacto.telefono?.trim()) {
        resultado.errores += 1;
        resultado.detalles.push({
          nombre: contacto.nombre || "Sin nombre",
          telefono: contacto.telefono || "Sin teléfono",
          estado: "error",
          mensaje: "Nombre y teléfono son obligatorios",
        });
        continue;
      }

      const telefono = normalizePhone(contacto.telefono);
      const existing = await findClienteByPhone(telefono);
      if (existing) {
        resultado.duplicados += 1;
        resultado.detalles.push({
          nombre: contacto.nombre,
          telefono,
          estado: "duplicado",
          mensaje: "Ya existe en la base de datos",
        });
        continue;
      }

      const cliente = await findOrCreateCliente({
        nombre: contacto.nombre,
        telefono,
        email: contacto.email,
      });

      if (contacto.marca?.trim() && contacto.modelo?.trim()) {
        await findOrCreateVehiculo({
          clienteId: cliente.id,
          marca: contacto.marca,
          modelo: contacto.modelo,
        });
      }

      resultado.nuevos += 1;
      resultado.detalles.push({
        nombre: contacto.nombre,
        telefono,
        estado: "nuevo",
      });
    } catch (error) {
      resultado.errores += 1;
      resultado.detalles.push({
        nombre: contacto.nombre || "Desconocido",
        telefono: contacto.telefono || "",
        estado: "error",
        mensaje: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  return resultado;
}

export async function getClientes() {
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("clientes")
    .select("id, nombre_completo, telefono, email, created_at")
    .order("created_at", { ascending: false })) as DbResponse<
    Array<{
      id: string;
      nombre_completo: string;
      telefono: string;
      email: string | null;
      created_at: string;
    }>
  >;

  throwDbError(response.error, "CLIENTS_LIST_FAILED", "No se pudo obtener clientes");
  return response.data ?? [];
}

export async function obtenerClientePorTelefono(telefono: string) {
  const normalized = normalizePhone(telefono);
  const cliente = await findClienteByPhone(normalized);
  if (!cliente) {
    throw new AppError("CLIENT_NOT_FOUND", "No existe un cliente con ese teléfono", 404);
  }
  return cliente;
}

export async function buscarClientePorTelefono(telefono: string) {
  const normalized = normalizePhone(telefono);
  return findClienteByPhone(normalized);
}

export async function buscarClienteOperacionPorTelefono(
  telefono: string
): Promise<ClienteOperacionPrefill> {
  const normalized = normalizePhone(telefono);
  const cliente = await findClienteByPhone(normalized);
  if (!cliente) {
    return { found: false };
  }

  const vehiculos = await listVehiculosByCliente(cliente.id);
  return {
    found: true,
    clienteId: cliente.id,
    nombre: cliente.nombre_completo,
    telefono: cliente.telefono,
    email: cliente.email ?? "",
    vehiculos: vehiculos.map((vehiculo) => ({
      id: vehiculo.id,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      label: `${vehiculo.marca} ${vehiculo.modelo}`,
    })),
  };
}

export async function registrarClienteConVehiculo(input: {
  nombre: string;
  telefono: string;
  email: string;
  marca: string;
  modelo: string;
}) {
  const normalizedPhone = normalizePhone(input.telefono);
  const existing = await findClienteByPhone(normalizedPhone);
  if (existing) {
    throw new AppError(
      "PHONE_ALREADY_REGISTERED",
      "Este número ya está registrado. Usá iniciar sesión.",
      409
    );
  }

  const cliente = await findOrCreateCliente({
    nombre: input.nombre,
    telefono: normalizedPhone,
    email: input.email,
  });

  await findOrCreateVehiculo({
    clienteId: cliente.id,
    marca: input.marca,
    modelo: input.modelo,
  });

  return cliente;
}

export async function getCuentaClienteById(clienteId: string): Promise<ClienteCuenta> {
  const service = getInsforgeServiceClient();
  const response = (await service.database
    .from("clientes")
    .select(`
      id,
      nombre_completo,
      telefono,
      email,
      vehiculos (marca, modelo),
      membresias (plan, estado, auxilios_restantes, fecha_inicio)
    `)
    .eq("id", clienteId)
    .maybeSingle()) as DbResponse<
    {
      id: string;
      nombre_completo: string;
      telefono: string;
      email: string | null;
      vehiculos:
        | { marca: string; modelo: string }
        | Array<{ marca: string; modelo: string }>
        | null;
      membresias:
        | MembresiaCuentaRow
        | Array<MembresiaCuentaRow>
        | null;
    }
  >;

  throwDbError(response.error, "ACCOUNT_FETCH_FAILED", "No se pudo obtener la cuenta");

  if (!response.data) {
    throw new AppError("ACCOUNT_NOT_FOUND", "No se encontró la cuenta del cliente", 404);
  }

  const vehiculo = firstArrayItem(response.data.vehiculos);
  const membresia = firstArrayItem(response.data.membresias);

  return {
    id: response.data.id,
    nombre: response.data.nombre_completo,
    telefono: response.data.telefono,
    email: response.data.email ?? "",
    moto: vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : "No registrada",
    plan: toPlanType(membresia?.plan),
    estado: toMembresiaEstado(membresia?.estado),
    cuposRestantes: membresia?.auxilios_restantes ?? 0,
    fechaInicio: membresia?.fecha_inicio ?? new Date().toISOString().slice(0, 10),
  };
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

export interface AdminReminderQuery {
  tipo?: ReminderTipoEvento | "todos";
  estado?: "todos" | "pendiente" | "enviado_manual" | "omitido" | "error";
  date?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

function normalizePagination(input: { page?: number; pageSize?: number }) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));
  return { page, pageSize };
}

function sortByDirection<T>(
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

  const mapped: OperacionAuxilioItem[] = (response.data ?? []).map((row) => ({
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
  }));

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
  return { id: response.data.id };
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

function toReminderTipoEvento(value: string): ReminderTipoEvento {
  if (
    value === "membresia_vence_7" ||
    value === "membresia_vence_3" ||
    value === "membresia_vence_1" ||
    value === "service_control_30"
  ) {
    return value;
  }
  return "membresia_vence_7";
}

function buildMembershipReminderMessage(
  nombre: string,
  plan: PlanType,
  fechaFin: string
): string {
  return `Hola ${nombre}, tu membresía ${plan} vence el ${fechaFin}. Si querés, te ayudamos a renovarla hoy por este medio.`;
}

function buildServiceReminderMessage(nombre: string): string {
  return `Hola ${nombre}, ya pasaron 30 días desde tu último service. Te recomendamos revisar kilometraje para anticipar el próximo control.`;
}

async function crearRecordatorioSiNoExiste(input: {
  clienteId: string;
  vehiculoId?: string | null;
  membresiaId?: string | null;
  turnoId?: string | null;
  tipoEvento: ReminderTipoEvento;
  scheduledFor: string;
  payload: Record<string, unknown>;
}) {
  const service = getInsforgeServiceClient();
  const response = await service.database.from("recordatorios_operativos").insert([
    {
      cliente_id: input.clienteId,
      vehiculo_id: input.vehiculoId ?? null,
      membresia_id: input.membresiaId ?? null,
      turno_id: input.turnoId ?? null,
      tipo_evento: input.tipoEvento,
      scheduled_for: `${input.scheduledFor}T09:00:00-03:00`,
      scheduled_date: input.scheduledFor,
      payload: input.payload,
      status: "pendiente",
    },
  ]);

  if (response.error?.code === "23505") {
    return { created: false };
  }
  throwDbError(response.error, "REMINDER_CREATE_FAILED", "No se pudo crear recordatorio");
  return { created: true };
}

export async function generarRecordatoriosOperativos() {
  const service = getInsforgeServiceClient();
  const hoyUy = getTodayUyDate();
  let created = 0;
  let skipped = 0;

  const membershipsResp = (await service.database
    .from("membresias")
    .select(
      `
      id,
      cliente_id,
      plan,
      estado,
      fecha_inicio,
      fecha_fin,
      clientes (nombre_completo, telefono)
    `
    )
    .eq("estado", "activo")) as DbResponse<
    Array<{
      id: string;
      cliente_id: string;
      plan: string;
      estado: string;
      fecha_inicio: string;
      fecha_fin: string | null;
      clientes: { nombre_completo: string; telefono: string } | null;
    }>
  >;
  throwDbError(
    membershipsResp.error,
    "REMINDER_MEMBERSHIPS_FETCH_FAILED",
    "No se pudieron leer membresías activas"
  );

  for (const membership of membershipsResp.data ?? []) {
    const cliente = membership.clientes;
    if (!cliente) continue;
    const fechaFin = membership.fecha_fin ?? addDaysDateOnly(membership.fecha_inicio, 30);
    const dias = diffDaysFromDateOnly(fechaFin, hoyUy);
    const mapping: Record<number, ReminderTipoEvento> = {
      7: "membresia_vence_7",
      3: "membresia_vence_3",
      1: "membresia_vence_1",
    };
    const tipoEvento = mapping[dias];
    if (!tipoEvento) continue;

    const message = buildMembershipReminderMessage(
      cliente.nombre_completo,
      toPlanType(membership.plan),
      fechaFin
    );
    const row = await crearRecordatorioSiNoExiste({
      clienteId: membership.cliente_id,
      membresiaId: membership.id,
      tipoEvento,
      scheduledFor: hoyUy,
      payload: {
        nombre: cliente.nombre_completo,
        telefono: cliente.telefono,
        plan: membership.plan,
        fechaFin,
        message,
      },
    });

    if (row.created) created += 1;
    else skipped += 1;
  }

  const completedServicesResp = (await service.database
    .from("turnos_taller")
    .select(
      `
      id,
      cliente_id,
      vehiculo_id,
      fecha_turno,
      clientes (nombre_completo, telefono)
    `
    )
    .eq("estado", "completado")
    .order("fecha_turno", { ascending: false })) as DbResponse<
    Array<{
      id: string;
      cliente_id: string;
      vehiculo_id: string | null;
      fecha_turno: string;
      clientes: { nombre_completo: string; telefono: string } | null;
    }>
  >;
  throwDbError(
    completedServicesResp.error,
    "REMINDER_SERVICES_FETCH_FAILED",
    "No se pudieron leer servicios completados"
  );

  const latestServiceByClient = new Map<
    string,
    {
      turnoId: string;
      vehiculoId: string | null;
      fechaTurno: string;
      clienteNombre: string;
      telefono: string;
    }
  >();

  for (const row of completedServicesResp.data ?? []) {
    if (latestServiceByClient.has(row.cliente_id) || !row.clientes) continue;
    latestServiceByClient.set(row.cliente_id, {
      turnoId: row.id,
      vehiculoId: row.vehiculo_id,
      fechaTurno: row.fecha_turno,
      clienteNombre: row.clientes.nombre_completo,
      telefono: row.clientes.telefono,
    });
  }

  for (const [clienteId, row] of latestServiceByClient) {
    const fechaService = row.fechaTurno.slice(0, 10);
    const dias = diffDaysFromDateOnly(hoyUy, fechaService);
    if (dias !== 30) continue;

    const message = buildServiceReminderMessage(row.clienteNombre);
    const reminder = await crearRecordatorioSiNoExiste({
      clienteId,
      vehiculoId: row.vehiculoId,
      turnoId: row.turnoId,
      tipoEvento: "service_control_30",
      scheduledFor: hoyUy,
      payload: {
        nombre: row.clienteNombre,
        telefono: row.telefono,
        fechaService,
        message,
      },
    });

    if (reminder.created) created += 1;
    else skipped += 1;
  }

  return { created, skipped };
}

export async function listarRecordatoriosAdmin(query: AdminReminderQuery) {
  const service = getInsforgeServiceClient();
  const { page, pageSize } = normalizePagination(query);
  let request = service.database.from("recordatorios_operativos").select(
    `
      id,
      tipo_evento,
      status,
      cliente_id,
      payload,
      scheduled_for,
      sent_at,
      sent_by,
      clientes (nombre_completo, telefono)
    `,
    { count: "exact" }
  );

  if (query.tipo && query.tipo !== "todos") request = request.eq("tipo_evento", query.tipo);
  if (query.estado && query.estado !== "todos") request = request.eq("status", query.estado);

  const response = (await request.order("scheduled_for", {
    ascending: false,
  })) as DbResponse<
    Array<{
      id: string;
      tipo_evento: string;
      status: string;
      cliente_id: string;
      payload: Record<string, unknown> | null;
      scheduled_for: string;
      sent_at: string | null;
      sent_by: string | null;
      clientes: { nombre_completo: string; telefono: string } | null;
    }>
  > & { count?: number | null };

  throwDbError(
    response.error,
    "REMINDERS_LIST_FAILED",
    "No se pudo obtener recordatorios"
  );

  const mapped: ReminderQueueItem[] = (response.data ?? []).map((row) => {
    const clienteNombre = row.clientes?.nombre_completo ?? "Cliente";
    const telefono = row.clientes?.telefono ?? "";
    const payload = row.payload ?? {};
    const message =
      typeof payload.message === "string" && payload.message
        ? payload.message
        : row.tipo_evento === "service_control_30"
        ? buildServiceReminderMessage(clienteNombre)
        : buildMembershipReminderMessage(
            clienteNombre,
            "basico",
            String(payload.fechaFin ?? row.scheduled_for.slice(0, 10))
          );
    return {
      id: row.id,
      tipoEvento: toReminderTipoEvento(row.tipo_evento),
      status:
        row.status === "enviado_manual" ||
        row.status === "omitido" ||
        row.status === "error"
          ? row.status
          : "pendiente",
      clienteId: row.cliente_id,
      clienteNombre,
      telefono,
      scheduledDate: row.scheduled_for,
      messagePreview: message,
      waLink: buildWhatsappLink(telefono, message),
      sentAt: row.sent_at,
      sentBy: row.sent_by,
      skipReason: typeof payload.skipReason === "string" ? payload.skipReason : null,
      payload,
    };
  });

  const searched = query.search?.trim()
    ? mapped.filter((item) => {
        const search = query.search!.trim().toLowerCase();
        const haystack = [item.clienteNombre, item.telefono, item.messagePreview]
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      })
    : mapped;

  const byDate = query.date
    ? searched.filter((item) => item.scheduledDate.slice(0, 10) === query.date)
    : searched;
  const start = (page - 1) * pageSize;
  const data = byDate.slice(start, start + pageSize);
  return {
    data,
    pagination: {
      page,
      pageSize,
      total: byDate.length,
      totalPages: Math.max(1, Math.ceil(byDate.length / pageSize)),
    },
  };
}

export async function marcarRecordatorioEnviadoManual(id: string, sentBy: string) {
  const service = getInsforgeServiceClient();

  const lookup = (await service.database
    .from("recordatorios_operativos")
    .select("id, status")
    .eq("id", id)
    .maybeSingle()) as DbResponse<{ id: string; status: string }>;

  throwDbError(
    lookup.error,
    "REMINDER_MARK_SENT_LOOKUP_FAILED",
    "No se pudo buscar recordatorio"
  );
  if (!lookup.data?.id) {
    throw new AppError("REMINDER_NOT_FOUND", "Recordatorio no encontrado", 404);
  }
  if (lookup.data.status !== "pendiente") {
    throw new AppError(
      "REMINDER_INVALID_STATE",
      "El recordatorio ya fue gestionado",
      409
    );
  }

  const response = (await service.database
    .from("recordatorios_operativos")
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
    "REMINDER_MARK_SENT_FAILED",
    "No se pudo marcar recordatorio como enviado"
  );
  if (!response.data?.id) {
    throw new AppError("REMINDER_NOT_FOUND", "Recordatorio no encontrado", 404);
  }
  return { id: response.data.id, sentAt: response.data.sent_at };
}

export async function omitirRecordatorio(
  id: string,
  input?: { reason?: string; handledBy?: string }
) {
  const service = getInsforgeServiceClient();

  const lookup = (await service.database
    .from("recordatorios_operativos")
    .select("id, payload, status")
    .eq("id", id)
    .maybeSingle()) as DbResponse<{
    id: string;
    payload: Record<string, unknown> | null;
    status: string;
  }>;

  throwDbError(lookup.error, "REMINDER_SKIP_LOOKUP_FAILED", "No se pudo buscar recordatorio");
  if (!lookup.data?.id) {
    throw new AppError("REMINDER_NOT_FOUND", "Recordatorio no encontrado", 404);
  }
  if (lookup.data.status !== "pendiente") {
    throw new AppError(
      "REMINDER_INVALID_STATE",
      "El recordatorio ya fue gestionado",
      409
    );
  }

  const reason = input?.reason?.trim();
  const payload: Record<string, unknown> = { ...(lookup.data.payload ?? {}) };
  if (reason) payload.skipReason = reason;

  const response = (await service.database
    .from("recordatorios_operativos")
    .update({
      status: "omitido",
      sent_at: new Date().toISOString(),
      sent_by: input?.handledBy ?? null,
      payload,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle()) as DbResponse<{ id: string }>;

  throwDbError(response.error, "REMINDER_SKIP_FAILED", "No se pudo omitir recordatorio");
  if (!response.data?.id) {
    throw new AppError("REMINDER_NOT_FOUND", "Recordatorio no encontrado", 404);
  }
  return { id: response.data.id };
}
