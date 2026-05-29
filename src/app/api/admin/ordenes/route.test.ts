import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  listarOrdenesTallerAdmin: vi.fn(),
  crearOrdenTallerAdmin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/services", () => ({
  listarOrdenesTallerAdmin: mocks.listarOrdenesTallerAdmin,
  crearOrdenTallerAdmin: mocks.crearOrdenTallerAdmin,
}));

import { GET, POST } from "./route";

describe("/api/admin/ordenes", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.listarOrdenesTallerAdmin.mockReset();
    mocks.crearOrdenTallerAdmin.mockReset();
  });

  it("bloquea GET sin admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/ordenes"));
    expect(response.status).toBe(403);
  });

  it("lista órdenes para admin con filtros", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin-1" });
    mocks.listarOrdenesTallerAdmin.mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      counters: { total: 0, activas: 0, listas: 0, entregadas: 0, canceladas: 0 },
    });

    const response = await GET(
      new Request("http://localhost/api/admin/ordenes?estado=listo&search=yamaha")
    );
    const body = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.listarOrdenesTallerAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ estado: "listo", search: "yamaha" })
    );
  });

  it("crea orden para admin", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin-1" });
    mocks.crearOrdenTallerAdmin.mockResolvedValue({ id: "ord-1", estado: "ingresado" });

    const response = await POST(
      new Request("http://localhost/api/admin/ordenes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cliente: { nombre: "Juan Perez", telefono: "+59899123456" },
          vehiculo: { marca: "Honda", modelo: "CB190" },
          titulo: "Service completo",
          descripcion: "Revisión general",
          costoEstimado: 3500,
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.crearOrdenTallerAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: "admin-1" })
    );
  });

  it("rechaza orden sin vehículo", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin-1" });

    const response = await POST(
      new Request("http://localhost/api/admin/ordenes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cliente: { nombre: "Juan Perez", telefono: "+59899123456" },
          vehiculo: {},
          titulo: "Service completo",
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.crearOrdenTallerAdmin).not.toHaveBeenCalled();
  });
});
