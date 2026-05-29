import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  listarAgendaSemanalAdmin: vi.fn(),
  reemplazarAgendaSemanalAdmin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/agenda", () => ({
  listarAgendaSemanalAdmin: mocks.listarAgendaSemanalAdmin,
  reemplazarAgendaSemanalAdmin: mocks.reemplazarAgendaSemanalAdmin,
}));

import { GET, PUT } from "./route";

function putRequest(body: unknown) {
  return new Request("http://localhost/api/admin/agenda/weekly", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/agenda/weekly", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.listarAgendaSemanalAdmin.mockReset();
    mocks.reemplazarAgendaSemanalAdmin.mockReset();
  });

  it("bloquea GET sin admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("lista agenda semanal para admin", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.listarAgendaSemanalAdmin.mockResolvedValue([]);

    const response = await GET();
    const body = (await response.json()) as { ok: boolean };
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("reemplaza agenda con reglas válidas", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.reemplazarAgendaSemanalAdmin.mockResolvedValue([]);

    const response = await PUT(
      putRequest({
        rules: [{ dayOfWeek: 1, enabled: true, startTime: "09:00", endTime: "18:00" }],
      })
    );
    expect(response.status).toBe(200);
    expect(mocks.reemplazarAgendaSemanalAdmin).toHaveBeenCalledTimes(1);
  });

  it("rechaza regla con inicio >= fin", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });

    const response = await PUT(
      putRequest({
        rules: [{ dayOfWeek: 1, enabled: true, startTime: "18:00", endTime: "09:00" }],
      })
    );
    expect(response.status).toBe(400);
    expect(mocks.reemplazarAgendaSemanalAdmin).not.toHaveBeenCalled();
  });
});
