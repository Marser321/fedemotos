import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { parseJson } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import {
  crearSuscripcionSchema,
  editarSuscriptorSchema,
  renovarSuscriptorSchema,
} from "@/lib/validation";
import {
  crearSuscripcionManual,
  editarSuscriptor,
  renovarSuscripcion,
} from "@/lib/services";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede gestionar suscripciones", 403);
    }

    const body = await parseJson(request, z.record(z.string(), z.unknown()));
    const action = typeof body?._action === "string" ? body._action : undefined;

    if (action === "edit") {
      const payload = editarSuscriptorSchema.parse(body);
      const result = await editarSuscriptor(payload.id, {
        nombre: payload.nombre,
        telefono: payload.telefono,
        email: payload.email,
        plan: payload.plan,
        estado: payload.estado,
      });
      return NextResponse.json({ ok: true, id: result.id });
    }

    if (action === "renew") {
      const payload = renovarSuscriptorSchema.parse(body);
      const result = await renovarSuscripcion(payload.id);
      return NextResponse.json({ ok: true, id: result.id });
    }

    const payload = crearSuscripcionSchema.parse(body);
    const result = await crearSuscripcionManual(payload);
    return NextResponse.json({
      ok: true,
      clienteId: result.clienteId,
      membresiaId: result.membresiaId,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
