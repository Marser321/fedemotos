// =============================================================
// MOCK DATA — Datos simulados para desarrollo frontend
// =============================================================

export interface Suscriptor {
    id: string;
    nombre: string;
    telefono: string;
    email: string;
    moto: string;
    plan: "basico" | "premium";
    estado: "activo" | "pendiente" | "inactivo";
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
    estado: "pendiente" | "en_camino" | "completado";
    fecha: string;
    moto: string;
}

export interface ServicioRegistro {
    id: string;
    clienteNombre: string;
    moto: string;
    servicio: string;
    kilometraje: number;
    fecha: string;
    estado: "completado" | "en_proceso" | "pendiente";
    costo: number;
}

// Suscriptores activos
export const suscriptores: Suscriptor[] = [];

// Solicitudes de auxilio activas
export const solicitudesAuxilio: SolicitudAuxilio[] = [];

// Registro de servicios
export const serviciosRegistro: ServicioRegistro[] = [];

// Estadísticas mock del dashboard
export const dashboardStats = {
    totalSuscriptores: 0,
    suscriptoresActivos: 0,
    auxiliosEsteMes: 0,
    facturacionMensual: 0,
    serviciosCompletados: 0,
};
