import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/rate-limit";
import { buscarClienteOperacionPorTelefono } from "@/lib/services";
import { adminClienteLookupQuerySchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede buscar clientes", 403);
    }

    const ip = getClientIp(request);
    const rate = consumeRateLimit(`admin-client-lookup:${ip}`, {
      max: 60,
      windowMs: 10 * 60 * 1000,
    });
    if (!rate.allowed) {
      throw new AppError("RATE_LIMITED", "Demasiadas búsquedas. Intentá en unos minutos.", 429);
    }

    const url = new URL(request.url);
    const parsed = adminClienteLookupQuerySchema.safeParse({
      telefono: url.searchParams.get("telefono") || "",
    });
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message || "Teléfono inválido",
        400
      );
    }

    const result = await buscarClienteOperacionPorTelefono(parsed.data.telefono);
    if (!result.found) {
      return NextResponse.json({ ok: true, found: false });
    }

    return NextResponse.json({
      ok: true,
      found: true,
      data: {
        clienteId: result.clienteId,
        nombre: result.nombre,
        telefono: result.telefono,
        email: result.email,
        vehiculos: result.vehiculos ?? [],
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
