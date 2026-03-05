import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  listarOperacionesAuxilioAdmin: vi.fn(),
  crearOperacionAuxilioAdmin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/services", () => ({
  listarOperacionesAuxilioAdmin: mocks.listarOperacionesAuxilioAdmin,
  crearOperacionAuxilioAdmin: mocks.crearOperacionAuxilioAdmin,
}));

import { GET, POST } from "./route";

describe("/api/admin/auxilios", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.listarOperacionesAuxilioAdmin.mockReset();
    mocks.crearOperacionAuxilioAdmin.mockReset();
  });

  it("bloquea GET sin admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/auxilios"));
    expect(response.status).toBe(403);
  });

  it("lista operaciones para admin", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.listarOperacionesAuxilioAdmin.mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      counters: {
        total: 0,
        pendientes: 0,
        enCamino: 0,
        completados: 0,
        auxilios: 0,
        traslados: 0,
      },
    });

    const response = await GET(
      new Request("http://localhost/api/admin/auxilios?tipo=traslado&page=2")
    );
    const body = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.listarOperacionesAuxilioAdmin).toHaveBeenCalled();
  });

  it("crea operación para admin", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.crearOperacionAuxilioAdmin.mockResolvedValue({ id: "aux-1", estado: "pendiente" });

    const response = await POST(
      new Request("http://localhost/api/admin/auxilios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tipo: "auxilio",
          prioridad: "media",
          cliente: { nombre: "Juan", telefono: "+59899123456" },
          vehiculo: { marca: "Honda", modelo: "CB190" },
          origen: { lat: -34.9, lng: -56.1 },
          motivo: "Pinchazo",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.crearOperacionAuxilioAdmin).toHaveBeenCalledTimes(1);
  });

  it("crea operación con vehículo existente por id", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.crearOperacionAuxilioAdmin.mockResolvedValue({ id: "aux-2", estado: "pendiente" });

    const response = await POST(
      new Request("http://localhost/api/admin/auxilios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tipo: "auxilio",
          prioridad: "alta",
          cliente: { nombre: "Ana", telefono: "+59899123457" },
          vehiculo: { id: "3f81a61e-f6b6-4e59-9b44-b2d2c5c2b7ae" },
          origen: { lat: -34.9, lng: -56.1 },
          motivo: "Batería descargada",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.crearOperacionAuxilioAdmin).toHaveBeenCalledTimes(1);
  });

  it("rechaza combinación inválida de vehículo", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });

    const response = await POST(
      new Request("http://localhost/api/admin/auxilios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tipo: "auxilio",
          prioridad: "media",
          cliente: { nombre: "Luis", telefono: "+59899123458" },
          vehiculo: {},
          origen: { lat: -34.9, lng: -56.1 },
          motivo: "Pinchazo",
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.crearOperacionAuxilioAdmin).not.toHaveBeenCalled();
  });
});
