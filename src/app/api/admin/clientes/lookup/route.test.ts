import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  consumeRateLimit: vi.fn(),
  buscarClienteOperacionPorTelefono: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  obtenerSesion: mocks.obtenerSesion,
}));

vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
}));

vi.mock("@/lib/services", () => ({
  buscarClienteOperacionPorTelefono: mocks.buscarClienteOperacionPorTelefono,
}));

import { GET } from "./route";

describe("GET /api/admin/clientes/lookup", () => {
  beforeEach(() => {
    mocks.obtenerSesion.mockReset();
    mocks.consumeRateLimit.mockReset();
    mocks.buscarClienteOperacionPorTelefono.mockReset();
  });

  it("bloquea acceso sin sesión admin", async () => {
    mocks.obtenerSesion.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/admin/clientes/lookup?telefono=099123456")
    );
    expect(response.status).toBe(403);
  });

  it("retorna found=true cuando existe cliente", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.consumeRateLimit.mockReturnValue({
      allowed: true,
      remaining: 59,
      resetAt: Date.now() + 1000,
    });
    mocks.buscarClienteOperacionPorTelefono.mockResolvedValue({
      found: true,
      clienteId: "cli-1",
      nombre: "Juan",
      telefono: "+59899123456",
      email: "juan@mail.com",
      vehiculos: [{ id: "veh-1", marca: "Honda", modelo: "CB190", label: "Honda CB190" }],
    });

    const response = await GET(
      new Request("http://localhost/api/admin/clientes/lookup?telefono=099123456")
    );
    const body = (await response.json()) as {
      ok: boolean;
      found: boolean;
      data?: { clienteId: string };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.found).toBe(true);
    expect(body.data?.clienteId).toBe("cli-1");
  });

  it("retorna found=false cuando no existe cliente", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.consumeRateLimit.mockReturnValue({
      allowed: true,
      remaining: 59,
      resetAt: Date.now() + 1000,
    });
    mocks.buscarClienteOperacionPorTelefono.mockResolvedValue({ found: false });

    const response = await GET(
      new Request("http://localhost/api/admin/clientes/lookup?telefono=099123456")
    );
    const body = (await response.json()) as { ok: boolean; found: boolean };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.found).toBe(false);
  });

  it("retorna 429 cuando excede rate limit", async () => {
    mocks.obtenerSesion.mockResolvedValue({ role: "admin", sub: "admin" });
    mocks.consumeRateLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 1000,
    });

    const response = await GET(
      new Request("http://localhost/api/admin/clientes/lookup?telefono=099123456")
    );
    expect(response.status).toBe(429);
  });
});
