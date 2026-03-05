import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/errors";
import { obtenerAgendaConfigPublica } from "@/lib/agenda";

export async function GET() {
  try {
    const data = await obtenerAgendaConfigPublica();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

