import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  crearServicioManual: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/services", () => ({
  crearServicioManual: mocks.crearServicioManual,
}));

import { POST } from "./route";

const validBody = {
  clienteNombre: "Juan Perez",
  telefono: "+59899123456",
  marca: "Honda",
  modelo: "CB190",
  servicio: "Cambio de aceite",
  costo: 1500,
  kilometraje: 12000,
};

function servicioRequest(body: unknown) {
  return new Request("http://localhost/api/servicios", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/servicios", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.crearServicioManual.mockReset();
  });

  it("bloquea sin admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);

    const response = await POST(servicioRequest(validBody));
    expect(response.status).toBe(403);
    expect(mocks.crearServicioManual).not.toHaveBeenCalled();
  });

  it("crea servicio para admin", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.crearServicioManual.mockResolvedValue({ id: "srv-1" });

    const response = await POST(servicioRequest(validBody));
    const body = (await response.json()) as { ok: boolean; id: string };

    expect(response.status).toBe(200);
    expect(body.id).toBe("srv-1");
    expect(mocks.crearServicioManual).toHaveBeenCalledTimes(1);
  });

  it("rechaza payload inválido", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });

    const response = await POST(servicioRequest({ clienteNombre: "Juan", costo: -1 }));
    expect(response.status).toBe(400);
    expect(mocks.crearServicioManual).not.toHaveBeenCalled();
  });
});
