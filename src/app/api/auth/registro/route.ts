import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { parseJson, getClientIp } from "@/lib/api";
import { consumeRateLimit } from "@/lib/rate-limit";
import { registroSchema } from "@/lib/validation";
import { buscarClientePorTelefono } from "@/lib/services";
import { normalizePhone } from "@/lib/phone";
import { ensureOtpInterimEnv, solicitarOtp } from "@/lib/otp";

export async function POST(request: Request) {
  try {
    const payload = await parseJson(request, registroSchema);
    const ip = getClientIp(request);
    const telefono = normalizePhone(payload.telefono);

    const rate = consumeRateLimit(`otp-registro:${ip}`, {
      max: 5,
      windowMs: 10 * 60 * 1000,
    });
    if (!rate.allowed) {
      throw new AppError(
        "RATE_LIMITED",
        "Demasiados intentos. Esperá unos minutos e intentá de nuevo.",
        429
      );
    }

    ensureOtpInterimEnv();

    const existente = await buscarClientePorTelefono(telefono);
    if (existente) {
      throw new AppError(
        "PHONE_ALREADY_REGISTERED",
        "Este número ya está registrado. Usá iniciar sesión.",
        409
      );
    }

    const otpResult = await solicitarOtp({
      purpose: "registro",
      telefono,
      email: payload.email.trim(),
      metadata: {
        nombre: payload.nombre.trim(),
        telefono,
        email: payload.email.trim(),
        marca: payload.marca.trim(),
        modelo: payload.modelo.trim(),
      },
      ip,
    });

    return NextResponse.json({
      ok: true,
      ...otpResult,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
