import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { parseJson } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { crearServicioSchema } from "@/lib/validation";
import { crearServicioManual } from "@/lib/services";

export async function POST(request: Request) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede cargar servicios", 403);
    }

    const body = await parseJson(request, crearServicioSchema);
    const result = await crearServicioManual(body);
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
