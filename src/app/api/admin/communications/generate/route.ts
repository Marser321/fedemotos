import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { obtenerSesion } from "@/lib/auth";
import { generarRecordatoriosOperativos } from "@/lib/services";

export async function POST() {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede generar comunicaciones", 403);
    }

    const result = await generarRecordatoriosOperativos();
    return NextResponse.json({ ok: true, created: result.created, skipped: result.skipped });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
