import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/errors";
import { parseJson } from "@/lib/api";
import { crearTurnoSchema } from "@/lib/validation";
import { crearTurnoTaller } from "@/lib/services";

export async function POST(request: Request) {
  try {
    const payload = await parseJson(request, crearTurnoSchema);
    const result = await crearTurnoTaller(payload);
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
