import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { parseJson } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { adminSkipReminderSchema } from "@/lib/validation";
import { omitirRecordatorio } from "@/lib/services";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await obtenerSesion();
    if (!session || session.role !== "admin") {
      throw new AppError("FORBIDDEN", "Solo admin puede omitir recordatorios", 403);
    }

    const { id } = await context.params;
    const payload = await parseJson(request, adminSkipReminderSchema);
    const result = await omitirRecordatorio(id, {
      reason: payload.reason,
      handledBy: session.sub,
    });
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
