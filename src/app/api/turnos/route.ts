import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { getClientIp, parseJson } from "@/lib/api";
import { consumeRateLimit } from "@/lib/rate-limit";
import { crearTurnoSchema } from "@/lib/validation";
import { crearTurnoTaller } from "@/lib/services";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rate = consumeRateLimit(`turno:${ip}`, {
      max: 5,
      windowMs: 10 * 60 * 1000,
    });
    if (!rate.allowed) {
      throw new AppError(
        "RATE_LIMITED",
        "Demasiadas reservas seguidas. Esperá unos minutos e intentá de nuevo.",
        429
      );
    }

    const payload = await parseJson(request, crearTurnoSchema);
    const result = await crearTurnoTaller(payload);
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
