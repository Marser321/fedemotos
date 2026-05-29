import { AdminOrdersClient } from "@/components/admin/AdminOrdersClient";
import type { OrdenEstado } from "@/lib/types";

export const dynamic = "force-dynamic";

const allowedEstados = new Set<OrdenEstado | "todas">([
  "todas",
  "ingresado",
  "diagnostico",
  "espera_repuestos",
  "reparacion",
  "listo",
  "entregado",
  "cancelado",
]);

export default async function AdminOrdenesPage({
  searchParams,
}: {
  searchParams?: Promise<{ estado?: string }>;
}) {
  const params = await searchParams;
  const estado = params?.estado;
  const initialEstado =
    estado && allowedEstados.has(estado as OrdenEstado | "todas")
      ? (estado as OrdenEstado | "todas")
      : "todas";

  return <AdminOrdersClient initialEstado={initialEstado} />;
}
