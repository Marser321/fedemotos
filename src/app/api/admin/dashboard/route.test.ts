import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  getAdminDashboardData: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/services", () => ({
  getAdminDashboardData: mocks.getAdminDashboardData,
}));

import { GET } from "./route";

describe("/api/admin/dashboard", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.getAdminDashboardData.mockReset();
  });

  it("bloquea sin admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(403);
    expect(mocks.getAdminDashboardData).not.toHaveBeenCalled();
  });

  it("devuelve datos del dashboard para admin", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.getAdminDashboardData.mockResolvedValue({
      stats: { auxiliosHoy: 0 },
      auxilios: [],
      servicios: [],
    });

    const response = await GET();
    const body = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.getAdminDashboardData).toHaveBeenCalledTimes(1);
  });
});
