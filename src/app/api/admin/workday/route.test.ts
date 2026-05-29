import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  getAdminWorkdayData: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/services", () => ({
  getAdminWorkdayData: mocks.getAdminWorkdayData,
}));

import { GET } from "./route";

describe("/api/admin/workday", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.getAdminWorkdayData.mockReset();
  });

  it("bloquea sin admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(403);
    expect(mocks.getAdminWorkdayData).not.toHaveBeenCalled();
  });

  it("bloquea a rol cliente", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "cliente", sub: "c-1" });

    const response = await GET();
    expect(response.status).toBe(403);
    expect(mocks.getAdminWorkdayData).not.toHaveBeenCalled();
  });

  it("devuelve el día operativo para admin", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.getAdminWorkdayData.mockResolvedValue({ ordenesActivas: [], alertas: [] });

    const response = await GET();
    const body = (await response.json()) as { ok: boolean; data: unknown };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.getAdminWorkdayData).toHaveBeenCalledTimes(1);
  });
});
