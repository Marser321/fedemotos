import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  generarRecordatoriosOperativos: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/services", () => ({
  generarRecordatoriosOperativos: mocks.generarRecordatoriosOperativos,
}));

import { POST } from "./route";

describe("POST /api/admin/communications/generate", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.generarRecordatoriosOperativos.mockReset();
  });

  it("bloquea acceso sin admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);
    const response = await POST();
    expect(response.status).toBe(403);
  });

  it("genera recordatorios para admin", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin-1" });
    mocks.generarRecordatoriosOperativos.mockResolvedValue({ created: 2, skipped: 1 });

    const response = await POST();
    const body = (await response.json()) as { ok: boolean; created: number; skipped: number };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.created).toBe(2);
    expect(body.skipped).toBe(1);
  });
});
