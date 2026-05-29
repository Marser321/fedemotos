import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  listarComunicacionesAdmin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/services", () => ({
  listarComunicacionesAdmin: mocks.listarComunicacionesAdmin,
}));

import { GET } from "./route";

describe("/api/admin/communications", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.listarComunicacionesAdmin.mockReset();
  });

  it("bloquea sin admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/communications"));
    expect(response.status).toBe(403);
    expect(mocks.listarComunicacionesAdmin).not.toHaveBeenCalled();
  });

  it("lista comunicaciones para admin con filtros validos", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin-1" });
    mocks.listarComunicacionesAdmin.mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      counters: { total: 0, pendientes: 0, enviados: 0, omitidos: 0 },
    });

    const response = await GET(
      new Request(
        "http://localhost/api/admin/communications?estado=pendiente&sourceType=orden&eventType=orden_lista&page=2"
      )
    );
    const body = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.listarComunicacionesAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: "pendiente",
        sourceType: "orden",
        eventType: "orden_lista",
        page: 2,
      })
    );
  });
});
