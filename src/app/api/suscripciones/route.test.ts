import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  crearSuscripcionManual: vi.fn(),
  editarSuscriptor: vi.fn(),
  renovarSuscripcion: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/services", () => ({
  crearSuscripcionManual: mocks.crearSuscripcionManual,
  editarSuscriptor: mocks.editarSuscriptor,
  renovarSuscripcion: mocks.renovarSuscripcion,
}));

import { POST } from "./route";

const uuid = "3f81a61e-f6b6-4e59-9b44-b2d2c5c2b7ae";

function suscripcionRequest(body: unknown) {
  return new Request("http://localhost/api/suscripciones", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/suscripciones", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.crearSuscripcionManual.mockReset();
    mocks.editarSuscriptor.mockReset();
    mocks.renovarSuscripcion.mockReset();
  });

  it("bloquea sin admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);

    const response = await POST(suscripcionRequest({ _action: "renew", id: uuid }));
    expect(response.status).toBe(403);
    expect(mocks.renovarSuscripcion).not.toHaveBeenCalled();
  });

  it("crea suscripción sin _action", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.crearSuscripcionManual.mockResolvedValue({ clienteId: "c-1", membresiaId: "m-1" });

    const response = await POST(
      suscripcionRequest({
        nombre: "Juan Perez",
        telefono: "+59899123456",
        email: "juan@example.com",
        marca: "Honda",
        modelo: "CB190",
        plan: "premium",
      })
    );
    const body = (await response.json()) as { ok: boolean; clienteId: string };

    expect(response.status).toBe(200);
    expect(body.clienteId).toBe("c-1");
    expect(mocks.crearSuscripcionManual).toHaveBeenCalledTimes(1);
  });

  it("renueva con _action renew", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.renovarSuscripcion.mockResolvedValue({ id: "m-1" });

    const response = await POST(suscripcionRequest({ _action: "renew", id: uuid }));
    expect(response.status).toBe(200);
    expect(mocks.renovarSuscripcion).toHaveBeenCalledWith(uuid);
  });

  it("edita con _action edit", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.editarSuscriptor.mockResolvedValue({ id: uuid });

    const response = await POST(
      suscripcionRequest({ _action: "edit", id: uuid, plan: "basico" })
    );
    expect(response.status).toBe(200);
    expect(mocks.editarSuscriptor).toHaveBeenCalledTimes(1);
  });

  it("rechaza payload inválido", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });

    const response = await POST(suscripcionRequest({ plan: "oro" }));
    expect(response.status).toBe(400);
    expect(mocks.crearSuscripcionManual).not.toHaveBeenCalled();
  });
});
