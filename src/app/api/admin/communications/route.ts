import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { obtenerSesion } from "@/lib/auth";
import { listarComunicacionesAdmin } from "@/lib/services";

function getEnum<T extends string>(
  value: string | null,
  allowed: readonly T[]
): T | undefined {
  if (!value) return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export async function GET(request: Request) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede consultar comunicaciones", 403);
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "20");

    const result = await listarComunicacionesAdmin({
      sourceType: getEnum(url.searchParams.get("sourceType"), [
        "orden",
        "turno",
        "auxilio",
        "traslado",
        "membresia",
        "servicio",
        "legacy_recordatorio",
        "todos",
      ] as const),
      eventType: getEnum(url.searchParams.get("eventType"), [
        "orden_lista",
        "orden_espera_repuestos",
        "turno_creado",
        "turno_reprogramado",
        "turno_cancelado",
        "auxilio_recibido",
        "auxilio_en_camino",
        "auxilio_completado",
        "traslado_recibido",
        "traslado_en_camino",
        "traslado_completado",
        "membresia_vence_7",
        "membresia_vence_3",
        "membresia_vence_1",
        "service_control_30",
        "todos",
      ] as const),
      estado: getEnum(url.searchParams.get("estado"), [
        "pendiente",
        "enviado_manual",
        "omitido",
        "error",
        "todos",
      ] as const),
      date: url.searchParams.get("date") || undefined,
      search: url.searchParams.get("search") || undefined,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
