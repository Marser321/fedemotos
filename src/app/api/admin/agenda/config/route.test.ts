import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  obtenerAgendaConfigAdmin: vi.fn(),
  actualizarAgendaConfigAdmin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/agenda", () => ({
  obtenerAgendaConfigAdmin: mocks.obtenerAgendaConfigAdmin,
  actualizarAgendaConfigAdmin: mocks.actualizarAgendaConfigAdmin,
}));

import { GET, PATCH } from "./route";

describe("/api/admin/agenda/config", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.obtenerAgendaConfigAdmin.mockReset();
    mocks.actualizarAgendaConfigAdmin.mockReset();
  });

  it("bloquea GET sin admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("retorna configuración para admin", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.obtenerAgendaConfigAdmin.mockResolvedValue({
      status: "activa",
      pauseReason: null,
      pauseUntil: null,
      minDaysAhead: 1,
      maxDaysAhead: 30,
      slotDurationMinutes: 60,
      timezone: "America/Montevideo",
      effectiveStatus: "activa",
      acceptingBookings: true,
    });

    const response = await GET();
    const body = (await response.json()) as { ok: boolean };
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("actualiza configuración como admin", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.actualizarAgendaConfigAdmin.mockResolvedValue({
      status: "pausada",
      pauseReason: "Saturados",
      pauseUntil: null,
      minDaysAhead: 1,
      maxDaysAhead: 30,
      slotDurationMinutes: 60,
      timezone: "America/Montevideo",
      effectiveStatus: "pausada",
      acceptingBookings: false,
    });

    const response = await PATCH(
      new Request("http://localhost/api/admin/agenda/config", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "pausada", pauseReason: "Saturados" }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.actualizarAgendaConfigAdmin).toHaveBeenCalledTimes(1);
  });
});

