import { describe, expect, it } from "vitest";
import { AppError, apiErrorResponse, toAppError } from "@/lib/errors";

describe("errors", () => {
  it("mantiene AppError sin modificar", () => {
    const err = new AppError("CUSTOM", "Mensaje", 422);
    const mapped = toAppError(err);

    expect(mapped.code).toBe("CUSTOM");
    expect(mapped.status).toBe(422);
  });

  it("oculta detalle interno para status 500", async () => {
    const response = apiErrorResponse(new Error("detalle interno"));
    const body = (await response.json()) as {
      ok: boolean;
      error: { code: string; message: string };
    };

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("Error interno del servidor");
  });
});
