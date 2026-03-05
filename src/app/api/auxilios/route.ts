import { NextResponse } from "next/server";
import { apiErrorResponse, AppError } from "@/lib/errors";
import { parseJson } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { crearAuxilioSchema, actualizarAuxilioSchema } from "@/lib/validation";
import { actualizarEstadoAuxilio, crearSolicitudAuxilio } from "@/lib/services";

export async function POST(request: Request) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "cliente") {
      throw new AppError("UNAUTHORIZED", "Necesitás iniciar sesión para pedir auxilio", 401);
    }

    const payload = await parseJson(request, crearAuxilioSchema);
    const result = await crearSolicitudAuxilio({
      clienteId: session.sub,
      lat: payload.lat,
      lng: payload.lng,
      descripcion: payload.descripcion,
    });

    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede actualizar auxilios", 403);
    }

    const payload = await parseJson(request, actualizarAuxilioSchema);
    const result = await actualizarEstadoAuxilio(payload.id, payload.estado);
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
