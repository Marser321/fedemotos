import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { obtenerSesion } from "@/lib/auth";
import { listarTurnosAgendaAdmin } from "@/lib/agenda";

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
      throw new AppError("FORBIDDEN", "Solo admin puede consultar turnos de agenda", 403);
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "20");

    const result = await listarTurnosAgendaAdmin({
      estado: getEnum(url.searchParams.get("estado"), [
        "pendiente",
        "en_proceso",
        "completado",
        "cancelado",
        "todos",
      ] as const),
      dateFrom: url.searchParams.get("dateFrom") || undefined,
      dateTo: url.searchParams.get("dateTo") || undefined,
      search: url.searchParams.get("search") || undefined,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

