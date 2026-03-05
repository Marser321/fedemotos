import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { parseJson } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { adminAgendaConfigPatchSchema } from "@/lib/validation";
import { actualizarAgendaConfigAdmin, obtenerAgendaConfigAdmin } from "@/lib/agenda";

export async function GET() {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede consultar configuración de agenda", 403);
    }

    const data = await obtenerAgendaConfigAdmin();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede editar configuración de agenda", 403);
    }

    const payload = await parseJson(request, adminAgendaConfigPatchSchema);
    const data = await actualizarAgendaConfigAdmin(payload);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

