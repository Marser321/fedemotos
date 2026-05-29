import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  marcarComunicacionEnviadaManual: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/services", () => ({
  marcarComunicacionEnviadaManual: mocks.marcarComunicacionEnviadaManual,
}));

import { POST } from "./route";

describe("POST /api/admin/communications/:id/mark-sent", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.marcarComunicacionEnviadaManual.mockReset();
  });

  it("bloquea acceso sin admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);
    const response = await POST(
      new Request("http://localhost/api/admin/communications/com-1/mark-sent", { method: "POST" }),
      { params: Promise.resolve({ id: "com-1" }) }
    );
    expect(response.status).toBe(403);
  });

  it("retorna 409 si la comunicacion ya fue gestionada", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin-1" });
    mocks.marcarComunicacionEnviadaManual.mockRejectedValue(
      new AppError("COMMUNICATION_INVALID_STATE", "La comunicacion ya fue gestionada", 409)
    );

    const response = await POST(
      new Request("http://localhost/api/admin/communications/com-1/mark-sent", { method: "POST" }),
      { params: Promise.resolve({ id: "com-1" }) }
    );
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("COMMUNICATION_INVALID_STATE");
  });
});
