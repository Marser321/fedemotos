import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiErrorBody {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export class AppError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof ZodError) {
    const message = error.issues[0]?.message || "Datos inválidos";
    return new AppError("VALIDATION_ERROR", message, 400);
  }

  if (error instanceof Error) {
    return new AppError("INTERNAL_ERROR", error.message, 500);
  }

  return new AppError("INTERNAL_ERROR", "Error interno del servidor", 500);
}

export function apiErrorResponse(error: unknown): NextResponse<ApiErrorBody> {
  const appError = toAppError(error);

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: appError.code,
        message:
          appError.status >= 500 ? "Error interno del servidor" : appError.message,
      },
    },
    { status: appError.status }
  );
}
