import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  crearSolicitudAuxilio: vi.fn(),
  actualizarEstadoAuxilio: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/services", () => ({
  crearSolicitudAuxilio: mocks.crearSolicitudAuxilio,
  actualizarEstadoAuxilio: mocks.actualizarEstadoAuxilio,
}));

import { POST, PUT } from "./route";

describe("/api/auxilios", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.crearSolicitudAuxilio.mockReset();
    mocks.actualizarEstadoAuxilio.mockReset();
  });

  it("bloquea POST sin sesión de cliente", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/auxilios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lat: -34.9, lng: -56.1, descripcion: "Pinchazo" }),
      })
    );

    expect(response.status).toBe(401);
  });

  it("crea auxilio con sesión cliente", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "cliente", sub: "cli-1" });
    mocks.crearSolicitudAuxilio.mockResolvedValue({ id: "aux-1" });

    const response = await POST(
      new Request("http://localhost/api/auxilios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lat: -34.9, lng: -56.1, descripcion: "Pinchazo" }),
      })
    );

    const body = (await response.json()) as { ok: boolean; id: string };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.id).toBe("aux-1");
    expect(mocks.crearSolicitudAuxilio).toHaveBeenCalledWith({
      clienteId: "cli-1",
      lat: -34.9,
      lng: -56.1,
      descripcion: "Pinchazo",
    });
  });

  it("bloquea POST si está fuera de rango de cobertura", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "cliente", sub: "cli-1" });

    const response = await POST(
      new Request("http://localhost/api/auxilios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lat: -34.9631, lng: -54.9439, descripcion: "Pinchazo" }), // Punta del Este
      })
    );

    const body = (await response.json()) as {
      ok: boolean;
      error: { code: string; message: string };
    };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("OUT_OF_COVERAGE_RANGE");
    expect(mocks.crearSolicitudAuxilio).not.toHaveBeenCalled();
  });

  it("bloquea PUT si no es admin", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "cliente", sub: "cli-1" });

    const response = await PUT(
      new Request("http://localhost/api/auxilios", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: "550e8400-e29b-41d4-a716-446655440000",
          estado: "en_camino",
        }),
      })
    );

    expect(response.status).toBe(403);
  });

  it("valida payload en PUT admin", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });

    const response = await PUT(
      new Request("http://localhost/api/auxilios", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "no-es-uuid", estado: "en_camino" }),
      })
    );

    const body = (await response.json()) as {
      ok: boolean;
      error: { code: string; message: string };
    };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mocks.actualizarEstadoAuxilio).not.toHaveBeenCalled();
  });

  it("actualiza estado de auxilio como admin", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.actualizarEstadoAuxilio.mockResolvedValue({ id: "aux-2" });

    const response = await PUT(
      new Request("http://localhost/api/auxilios", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: "550e8400-e29b-41d4-a716-446655440000",
          estado: "completado",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.actualizarEstadoAuxilio).toHaveBeenCalledWith(
      "550e8400-e29b-41d4-a716-446655440000",
      "completado"
    );
  });
});
