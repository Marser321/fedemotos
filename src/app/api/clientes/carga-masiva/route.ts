import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { parseJson } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { cargaMasivaSchema } from "@/lib/validation";
import { cargarClientesMasivo } from "@/lib/services";

export async function POST(request: Request) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede hacer carga masiva", 403);
    }

    const payload = await parseJson(request, cargaMasivaSchema);
    const contactos = payload.contactos.map((c) => ({
      nombre: c.nombre?.trim() || "",
      telefono: c.telefono?.trim() || "",
      email: c.email?.trim(),
      marca: c.marca?.trim(),
      modelo: c.modelo?.trim(),
    }));

    const resultado = await cargarClientesMasivo(contactos);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
