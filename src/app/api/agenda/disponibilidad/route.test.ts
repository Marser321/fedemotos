import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerDisponibilidadAgenda: vi.fn(),
}));

vi.mock("@/lib/agenda", () => ({
  obtenerDisponibilidadAgenda: mocks.obtenerDisponibilidadAgenda,
}));

import { GET } from "./route";

describe("GET /api/agenda/disponibilidad", () => {
  beforeEach(() => {
    mocks.obtenerDisponibilidadAgenda.mockReset();
  });

  it("valida fecha requerida", async () => {
    const response = await GET(new Request("http://localhost/api/agenda/disponibilidad"));
    expect(response.status).toBe(400);
  });

  it("retorna disponibilidad para fecha válida", async () => {
    mocks.obtenerDisponibilidadAgenda.mockResolvedValue({
      fecha: "2026-03-10",
      slots: [{ hora: "09:00", available: true }],
    });

    const response = await GET(
      new Request("http://localhost/api/agenda/disponibilidad?fecha=2026-03-10")
    );
    const body = (await response.json()) as {
      ok: boolean;
      data: { slots: Array<{ hora: string; available: boolean }> };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.slots[0]?.hora).toBe("09:00");
    expect(mocks.obtenerDisponibilidadAgenda).toHaveBeenCalledWith("2026-03-10");
  });
});

