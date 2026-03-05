import { NextResponse } from "next/server";
import { AppError, apiErrorResponse } from "@/lib/errors";
import { generarRecordatoriosOperativos } from "@/lib/services";
import { getCronSecret } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const secret = getCronSecret();
    const authHeader = request.headers.get("authorization") || "";
    const expected = `Bearer ${secret}`;

    if (authHeader !== expected) {
      throw new AppError("UNAUTHORIZED_CRON", "No autorizado", 401);
    }

    const result = await generarRecordatoriosOperativos();
    return NextResponse.json({ ok: true, created: result.created, skipped: result.skipped });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
