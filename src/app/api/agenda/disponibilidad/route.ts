import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { agendaDisponibilidadQuerySchema } from "@/lib/validation";
import { obtenerDisponibilidadAgenda } from "@/lib/agenda";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = agendaDisponibilidadQuerySchema.safeParse({
      fecha: url.searchParams.get("fecha") || "",
    });
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Fecha inválida", 400);
    }

    const data = await obtenerDisponibilidadAgenda(parsed.data.fecha);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

