import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  crearTurnoTaller: vi.fn(),
}));

vi.mock("@/lib/services", () => ({
  crearTurnoTaller: mocks.crearTurnoTaller,
}));

import { POST } from "./route";

describe("POST /api/turnos", () => {
  beforeEach(() => {
    mocks.crearTurnoTaller.mockReset();
  });

  it("valida payload obligatorio", async () => {
    const response = await POST(
      new Request("http://localhost/api/turnos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nombre: "A" }),
      })
    );
    expect(response.status).toBe(400);
    expect(mocks.crearTurnoTaller).not.toHaveBeenCalled();
  });

  it("propaga error de slot ocupado", async () => {
    mocks.crearTurnoTaller.mockRejectedValue(
      new AppError("SLOT_UNAVAILABLE", "Ese horario ya fue reservado", 409)
    );

    const response = await POST(
      new Request("http://localhost/api/turnos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nombre: "Juan",
          telefono: "+59899123456",
          marca: "Honda",
          modelo: "CB190",
          kilometraje: "12000",
          fecha: "2026-03-10",
          horario: "10:00",
        }),
      })
    );

    const body = (await response.json()) as { ok: boolean; error: { code: string } };
    expect(response.status).toBe(409);
    expect(body.error.code).toBe("SLOT_UNAVAILABLE");
  });

  it("crea turno cuando payload es válido", async () => {
    mocks.crearTurnoTaller.mockResolvedValue({ id: "turno-1" });

    const response = await POST(
      new Request("http://localhost/api/turnos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nombre: "Juan",
          telefono: "+59899123456",
          marca: "Honda",
          modelo: "CB190",
          kilometraje: "12000",
          fecha: "2026-03-10",
          horario: "10:00",
        }),
      })
    );

    const body = (await response.json()) as { ok: boolean; id: string };
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.id).toBe("turno-1");
  });
});

