import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  obtenerOrdenTallerAdmin: vi.fn(),
  actualizarOrdenTallerAdmin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/services", () => ({
  obtenerOrdenTallerAdmin: mocks.obtenerOrdenTallerAdmin,
  actualizarOrdenTallerAdmin: mocks.actualizarOrdenTallerAdmin,
}));

import { GET, PATCH } from "./route";

const context = { params: Promise.resolve({ id: "ord-1" }) };

describe("/api/admin/ordenes/[id]", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.obtenerOrdenTallerAdmin.mockReset();
    mocks.actualizarOrdenTallerAdmin.mockReset();
  });

  it("bloquea detalle sin admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/ordenes/ord-1"), context);
    expect(response.status).toBe(403);
  });

  it("devuelve detalle para admin", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin-1" });
    mocks.obtenerOrdenTallerAdmin.mockResolvedValue({
      id: "ord-1",
      estado: "ingresado",
      titulo: "Service",
      clienteNombre: "Juan",
    });

    const response = await GET(new Request("http://localhost/api/admin/ordenes/ord-1"), context);
    const body = (await response.json()) as { ok: boolean; data: { id: string } };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.id).toBe("ord-1");
  });

  it("actualiza estado para admin", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin-1" });
    mocks.actualizarOrdenTallerAdmin.mockResolvedValue({ id: "ord-1", estado: "listo" });

    const response = await PATCH(
      new Request("http://localhost/api/admin/ordenes/ord-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ estado: "listo", notasInternas: "Avisar por WhatsApp" }),
      }),
      context
    );

    expect(response.status).toBe(200);
    expect(mocks.actualizarOrdenTallerAdmin).toHaveBeenCalledWith(
      "ord-1",
      expect.objectContaining({ estado: "listo", handledBy: "admin-1" })
    );
  });

  it("rechaza estado inválido", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin-1" });

    const response = await PATCH(
      new Request("http://localhost/api/admin/ordenes/ord-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ estado: "lavando" }),
      }),
      context
    );

    expect(response.status).toBe(400);
    expect(mocks.actualizarOrdenTallerAdmin).not.toHaveBeenCalled();
  });
});
