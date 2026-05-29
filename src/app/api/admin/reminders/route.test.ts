import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  listarRecordatoriosAdmin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/services", () => ({
  listarRecordatoriosAdmin: mocks.listarRecordatoriosAdmin,
}));

import { GET } from "./route";

describe("/api/admin/reminders", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.listarRecordatoriosAdmin.mockReset();
  });

  it("bloquea sin admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/reminders"));
    expect(response.status).toBe(403);
    expect(mocks.listarRecordatoriosAdmin).not.toHaveBeenCalled();
  });

  it("lista recordatorios para admin con filtros válidos", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.listarRecordatoriosAdmin.mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    });

    const response = await GET(
      new Request(
        "http://localhost/api/admin/reminders?estado=pendiente&tipo=membresia_vence_7&page=2"
      )
    );
    const body = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.listarRecordatoriosAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: "pendiente",
        tipo: "membresia_vence_7",
        page: 2,
      })
    );
  });

  it("descarta filtros de enum inválidos", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.listarRecordatoriosAdmin.mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    });

    await GET(
      new Request("http://localhost/api/admin/reminders?estado=hackeado&tipo=otro")
    );

    expect(mocks.listarRecordatoriosAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ estado: undefined, tipo: undefined })
    );
  });
});
