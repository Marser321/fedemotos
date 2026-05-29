import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { obtenerSesion } from "@/lib/auth";
import { getServiciosRegistro } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede ver el historial de servicios", 403);
    }

    const data = await getServiciosRegistro();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
