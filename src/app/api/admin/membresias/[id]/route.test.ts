import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  actualizarMembresiaAdmin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/services", () => ({
  actualizarMembresiaAdmin: mocks.actualizarMembresiaAdmin,
}));

import { PATCH } from "./route";

const params = (id: string) => ({ params: Promise.resolve({ id }) });

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/admin/membresias/m-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/membresias/[id]", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.actualizarMembresiaAdmin.mockReset();
  });

  it("bloquea sin admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);

    const response = await PATCH(patchRequest({ estado: "activo" }), params("m-1"));
    expect(response.status).toBe(403);
    expect(mocks.actualizarMembresiaAdmin).not.toHaveBeenCalled();
  });

  it("actualiza membresía con payload válido", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.actualizarMembresiaAdmin.mockResolvedValue({ id: "m-1" });

    const response = await PATCH(
      patchRequest({ estado: "activo", plan: "premium", auxiliosRestantes: 3 }),
      params("m-1")
    );
    const body = (await response.json()) as { ok: boolean; id: string };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.actualizarMembresiaAdmin).toHaveBeenCalledWith(
      "m-1",
      expect.objectContaining({ estado: "activo", plan: "premium", auxiliosRestantes: 3 })
    );
  });

  it("rechaza payload inválido", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });

    const response = await PATCH(
      patchRequest({ estado: "no_existe", auxiliosRestantes: -5 }),
      params("m-1")
    );

    expect(response.status).toBe(400);
    expect(mocks.actualizarMembresiaAdmin).not.toHaveBeenCalled();
  });
});
