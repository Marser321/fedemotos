import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { parseJson } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { adminAgendaWeeklyPutSchema } from "@/lib/validation";
import { listarAgendaSemanalAdmin, reemplazarAgendaSemanalAdmin } from "@/lib/agenda";

export async function GET() {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede consultar agenda semanal", 403);
    }

    const data = await listarAgendaSemanalAdmin();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede editar agenda semanal", 403);
    }

    const payload = await parseJson(request, adminAgendaWeeklyPutSchema);
    const data = await reemplazarAgendaSemanalAdmin(payload.rules);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

