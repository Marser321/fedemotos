import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { parseJson } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { adminActualizarOperacionSchema } from "@/lib/validation";
import { actualizarOperacionAuxilioAdmin } from "@/lib/services";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede editar operaciones", 403);
    }

    const { id } = await context.params;
    const payload = await parseJson(request, adminActualizarOperacionSchema);
    const result = await actualizarOperacionAuxilioAdmin(id, payload);

    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
