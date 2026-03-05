import { NextResponse } from "next/server";
import { apiErrorResponse, AppError } from "@/lib/errors";
import { parseJson } from "@/lib/api";
import { verificarOtpSchema } from "@/lib/validation";
import { normalizePhone } from "@/lib/phone";
import { requireOtpCode, verificarOtp } from "@/lib/otp";
import {
  buscarClientePorTelefono,
  registrarClienteConVehiculo,
} from "@/lib/services";
import { crearSesion } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const payload = await parseJson(request, verificarOtpSchema);
    const telefono = normalizePhone(payload.telefono);
    const code = requireOtpCode(payload.code);

    const verification = await verificarOtp({
      purpose: payload.purpose,
      telefono,
      code,
    });

    if (payload.purpose === "registro") {
      const nombre = String(verification.metadata.nombre || "").trim();
      const email = String(verification.metadata.email || "").trim();
      const marca = String(verification.metadata.marca || "").trim();
      const modelo = String(verification.metadata.modelo || "").trim();

      if (!nombre || !email || !marca || !modelo) {
        throw new AppError(
          "REGISTRATION_METADATA_INVALID",
          "Los datos del registro son inválidos. Reintentá el proceso.",
          400
        );
      }

      const cliente = await registrarClienteConVehiculo({
        nombre,
        telefono,
        email,
        marca,
        modelo,
      });

      await crearSesion({
        role: "cliente",
        sub: cliente.id,
        telefono: cliente.telefono,
      });

      return NextResponse.json({
        ok: true,
        role: "cliente",
        nombre: cliente.nombre_completo,
      });
    }

    const cliente = await buscarClientePorTelefono(telefono);
    if (!cliente) {
      throw new AppError(
        "CLIENT_NOT_FOUND",
        "No existe un cliente con ese teléfono",
        404
      );
    }

    await crearSesion({
      role: "cliente",
      sub: cliente.id,
      telefono: cliente.telefono,
    });

    return NextResponse.json({
      ok: true,
      role: "cliente",
      nombre: cliente.nombre_completo,
      email: verification.email,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
