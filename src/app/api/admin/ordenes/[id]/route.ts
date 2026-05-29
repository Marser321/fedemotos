import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { parseJson } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { adminActualizarOrdenSchema } from "@/lib/validation";
import {
  actualizarOrdenTallerAdmin,
  obtenerOrdenTallerAdmin,
} from "@/lib/services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede consultar órdenes", 403);
    }

    const { id } = await context.params;
    const data = await obtenerOrdenTallerAdmin(id);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede actualizar órdenes", 403);
    }

    const { id } = await context.params;
    const payload = await parseJson(request, adminActualizarOrdenSchema);
    const result = await actualizarOrdenTallerAdmin(id, {
      ...payload,
      handledBy: session.sub,
    });
    return NextResponse.json({ ok: true, id: result.id, estado: result.estado });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
