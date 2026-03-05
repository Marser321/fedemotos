import type { NextRequest } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { AppError } from "./errors";

export async function parseJson<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("INVALID_JSON", "El cuerpo de la request no es JSON válido", 400);
  }

  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message || "Datos inválidos";
      throw new AppError("VALIDATION_ERROR", message, 400);
    }

    throw error;
  }
}

export function getClientIp(request: Request | NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}
