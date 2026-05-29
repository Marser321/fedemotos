import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  omitirComunicacion: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/services", () => ({
  omitirComunicacion: mocks.omitirComunicacion,
}));

import { POST } from "./route";

describe("POST /api/admin/communications/:id/skip", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.omitirComunicacion.mockReset();
  });

  it("bloquea acceso sin admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);
    const response = await POST(
      new Request("http://localhost/api/admin/communications/com-1/skip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "com-1" }) }
    );
    expect(response.status).toBe(403);
  });

  it("retorna 409 si la comunicacion ya fue gestionada", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin-1" });
    mocks.omitirComunicacion.mockRejectedValue(
      new AppError("COMMUNICATION_INVALID_STATE", "La comunicacion ya fue gestionada", 409)
    );

    const response = await POST(
      new Request("http://localhost/api/admin/communications/com-1/skip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "ya contactado" }),
      }),
      { params: Promise.resolve({ id: "com-1" }) }
    );
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("COMMUNICATION_INVALID_STATE");
  });
});
