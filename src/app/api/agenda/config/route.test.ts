import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerAgendaConfigPublica: vi.fn(),
}));

vi.mock("@/lib/agenda", () => ({
  obtenerAgendaConfigPublica: mocks.obtenerAgendaConfigPublica,
}));

import { GET } from "./route";

describe("GET /api/agenda/config", () => {
  beforeEach(() => {
    mocks.obtenerAgendaConfigPublica.mockReset();
  });

  it("retorna configuración pública de agenda", async () => {
    mocks.obtenerAgendaConfigPublica.mockResolvedValue({
      acceptingBookings: true,
      status: "activa",
      pauseReason: null,
      pauseUntil: null,
      timezone: "America/Montevideo",
      slotDurationMinutes: 60,
      bookingWindow: { minDaysAhead: 1, maxDaysAhead: 30 },
      supportWhatsapp: "59899123456",
    });

    const response = await GET();
    const body = (await response.json()) as { ok: boolean; data: { status: string } };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("activa");
  });
});

