// Barrel de dominio: la lógica vive en ./services/* dividida por dominio.
// Se re-exporta acá para preservar `import { ... } from "@/lib/services"`.
export * from "./services/clientes";
export * from "./services/suscripciones";
export * from "./services/auxilios";
export * from "./services/servicios";
export * from "./services/turnos";
export * from "./services/ordenes";
export * from "./services/membresias";
export * from "./services/comunicaciones";
export * from "./services/recordatorios";
export * from "./services/dashboard";
export * from "./services/workday";
