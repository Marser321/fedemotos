import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { obtenerSesion } from "@/lib/auth";
import { listarMembresiasAdmin } from "@/lib/services";

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
      throw new AppError("FORBIDDEN", "Solo admin puede consultar membresías", 403);
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "20");

    const result = await listarMembresiasAdmin({
      estado: getEnum(url.searchParams.get("estado"), [
        "activo",
        "pendiente",
        "inactivo",
        "todas",
      ] as const),
      vencimiento: getEnum(url.searchParams.get("vencimiento"), [
        "vencida",
        "proxima",
        "activa",
        "inactiva",
        "todas",
      ] as const),
      plan: getEnum(url.searchParams.get("plan"), ["basico", "premium", "todas"] as const),
      search: url.searchParams.get("search") || undefined,
      sortBy: getEnum(url.searchParams.get("sortBy"), [
        "fecha_fin",
        "nombre",
        "estado",
        "plan",
        "auxilios_restantes",
        "ultimo_service",
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
