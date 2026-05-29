import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  listarAgendaExcepcionesAdmin: vi.fn(),
  crearAgendaExcepcionAdmin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/agenda", () => ({
  listarAgendaExcepcionesAdmin: mocks.listarAgendaExcepcionesAdmin,
  crearAgendaExcepcionAdmin: mocks.crearAgendaExcepcionAdmin,
}));

import { GET, POST } from "./route";

function postRequest(body: unknown) {
  return new Request("http://localhost/api/admin/agenda/excepciones", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/agenda/excepciones", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.listarAgendaExcepcionesAdmin.mockReset();
    mocks.crearAgendaExcepcionAdmin.mockReset();
  });

  it("bloquea GET sin admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);
    const response = await GET(
      new Request("http://localhost/api/admin/agenda/excepciones")
    );
    expect(response.status).toBe(403);
  });

  it("lista excepciones para admin", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.listarAgendaExcepcionesAdmin.mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    });

    const response = await GET(
      new Request("http://localhost/api/admin/agenda/excepciones?dateFrom=2026-01-01")
    );
    const body = (await response.json()) as { ok: boolean };
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("crea excepción con payload válido y propaga createdBy", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin-9" });
    mocks.crearAgendaExcepcionAdmin.mockResolvedValue({ id: "exc-1" });

    const response = await POST(
      postRequest({
        fecha: "2026-03-10",
        tipo: "bloqueo",
        horaDesde: "09:00",
        horaHasta: "12:00",
        motivo: "Mantenimiento",
      })
    );
    expect(response.status).toBe(200);
    expect(mocks.crearAgendaExcepcionAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: "admin-9", tipo: "bloqueo" })
    );
  });

  it("rechaza horas invertidas", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });

    const response = await POST(
      postRequest({
        fecha: "2026-03-10",
        tipo: "bloqueo",
        horaDesde: "12:00",
        horaHasta: "09:00",
      })
    );
    expect(response.status).toBe(400);
    expect(mocks.crearAgendaExcepcionAdmin).not.toHaveBeenCalled();
  });
});
