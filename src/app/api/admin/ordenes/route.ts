import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { parseJson } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { adminCrearOrdenSchema } from "@/lib/validation";
import {
  crearOrdenTallerAdmin,
  listarOrdenesTallerAdmin,
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
      throw new AppError("FORBIDDEN", "Solo admin puede consultar órdenes", 403);
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "20");

    const result = await listarOrdenesTallerAdmin({
      estado: getEnum(url.searchParams.get("estado"), [
        "ingresado",
        "diagnostico",
        "espera_repuestos",
        "reparacion",
        "listo",
        "entregado",
        "cancelado",
        "todas",
      ] as const),
      search: url.searchParams.get("search") || undefined,
      dateFrom: url.searchParams.get("dateFrom") || undefined,
      dateTo: url.searchParams.get("dateTo") || undefined,
      sortBy: getEnum(url.searchParams.get("sortBy"), [
        "fecha_ingreso",
        "estado",
        "cliente",
        "fecha_prometida",
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
      throw new AppError("FORBIDDEN", "Solo admin puede crear órdenes", 403);
    }

    const payload = await parseJson(request, adminCrearOrdenSchema);
    const result = await crearOrdenTallerAdmin({
      ...payload,
      createdBy: session.sub,
    });
    return NextResponse.json({ ok: true, id: result.id, estado: result.estado });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
