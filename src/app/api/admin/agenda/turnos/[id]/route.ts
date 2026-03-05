import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { parseJson } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { adminAgendaTurnoPatchSchema } from "@/lib/validation";
import { actualizarTurnoAgendaAdmin } from "@/lib/agenda";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede editar turnos", 403);
    }

    const { id } = await context.params;
    const payload = await parseJson(request, adminAgendaTurnoPatchSchema);
    const result = await actualizarTurnoAgendaAdmin(id, payload);
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

