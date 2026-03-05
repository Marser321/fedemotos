import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { obtenerSesion } from "@/lib/auth";
import { marcarRecordatorioEnviadoManual } from "@/lib/services";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede marcar envíos", 403);
    }

    const { id } = await context.params;
    const result = await marcarRecordatorioEnviadoManual(id, session.sub);
    return NextResponse.json({ ok: true, id: result.id, sentAt: result.sentAt });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
