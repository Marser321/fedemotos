import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { clienteLoginSchema, adminLoginSchema } from "@/lib/validation";
import {
  crearSesion,
  getAdminPin,
  safeConstantCompare,
} from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api";
import { normalizePhone } from "@/lib/phone";
import { ensureOtpInterimEnv, solicitarOtp } from "@/lib/otp";
import { obtenerClientePorTelefono } from "@/lib/services";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ip = getClientIp(request);

    const adminParsed = adminLoginSchema.safeParse(body);
    if (adminParsed.success) {
      const rate = consumeRateLimit(`admin-login:${ip}`, {
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

      const currentAdminPin = getAdminPin();
      if (!safeConstantCompare(adminParsed.data.pin, currentAdminPin)) {
        throw new AppError("INVALID_PIN", "PIN incorrecto", 401);
      }

      await crearSesion({ role: "admin", sub: "admin" });
      return NextResponse.json({ ok: true, role: "admin" });
    }

    const clienteParsed = clienteLoginSchema.safeParse(body);
    if (!clienteParsed.success) {
      throw new AppError("VALIDATION_ERROR", "Solicitud de login inválida", 400);
    }

    ensureOtpInterimEnv();

    const telefono = normalizePhone(clienteParsed.data.telefono);
    const cliente = await obtenerClientePorTelefono(telefono);

    if (!cliente.email) {
      throw new AppError(
        "CLIENT_EMAIL_REQUIRED",
        "Tu cuenta no tiene email asociado. Contactá soporte para activarla.",
        400
      );
    }

    const otpResult = await solicitarOtp({
      purpose: "login",
      telefono,
      email: cliente.email,
      metadata: {
        clienteId: cliente.id,
        nombre: cliente.nombre_completo,
      },
      ip,
    });

    return NextResponse.json({
      ok: true,
      role: "cliente",
      ...otpResult,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
