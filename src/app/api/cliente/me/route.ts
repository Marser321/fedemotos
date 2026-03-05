import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { obtenerSesion } from "@/lib/auth";
import { getCuentaClienteById } from "@/lib/services";

export async function GET() {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "cliente") {
      throw new AppError("UNAUTHORIZED", "Necesitás iniciar sesión", 401);
    }

    const data = await getCuentaClienteById(session.sub);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
