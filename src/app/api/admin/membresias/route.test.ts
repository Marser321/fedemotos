import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  listarMembresiasAdmin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/services", () => ({
  listarMembresiasAdmin: mocks.listarMembresiasAdmin,
}));

import { GET } from "./route";

describe("/api/admin/membresias", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.listarMembresiasAdmin.mockReset();
  });

  it("bloquea sin admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/membresias"));
    expect(response.status).toBe(403);
    expect(mocks.listarMembresiasAdmin).not.toHaveBeenCalled();
  });

  it("lista membresías con filtros válidos", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.listarMembresiasAdmin.mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    });

    const response = await GET(
      new Request(
        "http://localhost/api/admin/membresias?estado=activo&plan=premium&sortBy=nombre&sortDir=asc"
      )
    );
    const body = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.listarMembresiasAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: "activo",
        plan: "premium",
        sortBy: "nombre",
        sortDir: "asc",
      })
    );
  });

  it("descarta enums inválidos", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.listarMembresiasAdmin.mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    });

    await GET(
      new Request("http://localhost/api/admin/membresias?estado=??&plan=gold&sortDir=up")
    );

    expect(mocks.listarMembresiasAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ estado: undefined, plan: undefined, sortDir: undefined })
    );
  });
});
