import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verificarOtp: vi.fn(),
  requireOtpCode: vi.fn(),
  buscarClientePorTelefono: vi.fn(),
  registrarClienteConVehiculo: vi.fn(),
  crearSesion: vi.fn(),
}));

vi.mock("@/lib/otp", () => ({
  verificarOtp: mocks.verificarOtp,
  requireOtpCode: mocks.requireOtpCode,
}));

vi.mock("@/lib/services", () => ({
  buscarClientePorTelefono: mocks.buscarClientePorTelefono,
  registrarClienteConVehiculo: mocks.registrarClienteConVehiculo,
}));

vi.mock("@/lib/auth", () => ({
  crearSesion: mocks.crearSesion,
}));

import { POST } from "./route";

const loginBody = {
  purpose: "login",
  telefono: "+59899123456",
  code: "123456",
};

function verificarRequest(ip?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (ip) headers["x-forwarded-for"] = ip;
  return new Request("http://localhost/api/auth/verificar", {
    method: "POST",
    headers,
    body: JSON.stringify(loginBody),
  });
}

describe("POST /api/auth/verificar", () => {
  beforeEach(() => {
    mocks.verificarOtp.mockReset();
    mocks.requireOtpCode.mockReset();
    mocks.buscarClientePorTelefono.mockReset();
    mocks.registrarClienteConVehiculo.mockReset();
    mocks.crearSesion.mockReset();
    mocks.requireOtpCode.mockImplementation((code: string) => code);
  });

  it("verifica login y crea sesión", async () => {
    mocks.verificarOtp.mockResolvedValue({ metadata: {}, email: "juan@example.com" });
    mocks.buscarClientePorTelefono.mockResolvedValue({
      id: "c-1",
      telefono: "+59899123456",
      nombre_completo: "Juan Perez",
    });

    const response = await POST(verificarRequest("198.51.100.4"));
    const body = (await response.json()) as { ok: boolean; role: string };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.role).toBe("cliente");
    expect(mocks.crearSesion).toHaveBeenCalledTimes(1);
  });

  it("aplica rate limit por IP", async () => {
    mocks.verificarOtp.mockResolvedValue({ metadata: {}, email: "juan@example.com" });
    mocks.buscarClientePorTelefono.mockResolvedValue({
      id: "c-1",
      telefono: "+59899123456",
      nombre_completo: "Juan Perez",
    });
    const ip = "198.51.100.60";

    for (let i = 0; i < 10; i += 1) {
      const ok = await POST(verificarRequest(ip));
      expect(ok.status).toBe(200);
    }

    const blocked = await POST(verificarRequest(ip));
    const body = (await blocked.json()) as { error: { code: string } };
    expect(blocked.status).toBe(429);
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
