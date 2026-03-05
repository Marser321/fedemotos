import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    role: sesion.role,
    sub: sesion.sub,
    telefono: sesion.telefono,
  });
}
