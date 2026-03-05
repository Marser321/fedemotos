import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { parseJson } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { adminCrearOperacionSchema } from "@/lib/validation";
import {
  crearOperacionAuxilioAdmin,
  listarOperacionesAuxilioAdmin,
} from "@/lib/services";

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
      throw new AppError("FORBIDDEN", "Solo admin puede consultar operaciones", 403);
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "20");

    const result = await listarOperacionesAuxilioAdmin({
      tipo: getEnum(url.searchParams.get("tipo"), ["auxilio", "traslado"] as const),
      estado: getEnum(url.searchParams.get("estado"), [
        "pendiente",
        "en_camino",
        "completado",
      ] as const),
      prioridad: getEnum(url.searchParams.get("prioridad"), [
        "baja",
        "media",
        "alta",
        "urgente",
      ] as const),
      search: url.searchParams.get("search") || undefined,
      dateFrom: url.searchParams.get("dateFrom") || undefined,
      dateTo: url.searchParams.get("dateTo") || undefined,
      sortBy: getEnum(url.searchParams.get("sortBy"), [
        "solicitado_en",
        "prioridad",
        "estado",
        "cliente",
      ] as const),
      sortDir: getEnum(url.searchParams.get("sortDir"), ["asc", "desc"] as const),
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede crear operaciones", 403);
    }

    const payload = await parseJson(request, adminCrearOperacionSchema);
    const result = await crearOperacionAuxilioAdmin(payload);
    return NextResponse.json({ ok: true, id: result.id, estado: result.estado });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
