import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { obtenerSesion } from "@/lib/auth";
import { eliminarAgendaExcepcionAdmin } from "@/lib/agenda";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede eliminar excepciones", 403);
    }

    const { id } = await context.params;
    const result = await eliminarAgendaExcepcionAdmin(id);
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

