import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  omitirRecordatorio: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/services", () => ({
  omitirRecordatorio: mocks.omitirRecordatorio,
}));

import { POST } from "./route";

describe("POST /api/admin/reminders/:id/skip", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.omitirRecordatorio.mockReset();
  });

  it("bloquea acceso sin admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);
    const response = await POST(
      new Request("http://localhost/api/admin/reminders/rem-1/skip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "rem-1" }) }
    );
    expect(response.status).toBe(403);
  });

  it("retorna 409 si el recordatorio ya no está pendiente", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin-1" });
    mocks.omitirRecordatorio.mockRejectedValue(
      new AppError("REMINDER_INVALID_STATE", "El recordatorio ya fue gestionado", 409)
    );

    const response = await POST(
      new Request("http://localhost/api/admin/reminders/rem-1/skip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "ya contactado" }),
      }),
      { params: Promise.resolve({ id: "rem-1" }) }
    );
    const body = (await response.json()) as {
      ok: boolean;
      error: { code: string };
    };

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("REMINDER_INVALID_STATE");
  });
});
