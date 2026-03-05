import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { parseJson } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { adminAgendaExceptionCreateSchema } from "@/lib/validation";
import {
  crearAgendaExcepcionAdmin,
  listarAgendaExcepcionesAdmin,
} from "@/lib/agenda";

export async function GET(request: Request) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede consultar excepciones", 403);
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "20");

    const result = await listarAgendaExcepcionesAdmin({
      dateFrom: url.searchParams.get("dateFrom") || undefined,
      dateTo: url.searchParams.get("dateTo") || undefined,
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
      throw new AppError("FORBIDDEN", "Solo admin puede crear excepciones", 403);
    }

    const payload = await parseJson(request, adminAgendaExceptionCreateSchema);
    const data = await crearAgendaExcepcionAdmin({
      ...payload,
      createdBy: session.sub,
    });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

