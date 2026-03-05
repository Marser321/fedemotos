import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { parseJson } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { adminMembresiaPatchSchema } from "@/lib/validation";
import { actualizarMembresiaAdmin } from "@/lib/services";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede editar membresías", 403);
    }

    const { id } = await context.params;
    const payload = await parseJson(request, adminMembresiaPatchSchema);
    const result = await actualizarMembresiaAdmin(id, payload);

    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
