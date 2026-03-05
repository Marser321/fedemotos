import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  crearSesion: vi.fn(),
  solicitarOtp: vi.fn(),
  obtenerClientePorTelefono: vi.fn(),
  consumeRateLimit: vi.fn(),
  getClientIp: vi.fn(),
  ensureOtpInterimEnv: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  crearSesion: mocks.crearSesion,
  getAdminPin: () => "1234",
  safeConstantCompare: (a: string, b: string) => a === b,
}));

vi.mock("@/lib/otp", () => ({
  solicitarOtp: mocks.solicitarOtp,
  ensureOtpInterimEnv: mocks.ensureOtpInterimEnv,
}));

vi.mock("@/lib/services", () => ({
  obtenerClientePorTelefono: mocks.obtenerClientePorTelefono,
}));

vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getClientIp: mocks.getClientIp,
  };
});

import { POST } from "./route";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    mocks.crearSesion.mockReset();
    mocks.solicitarOtp.mockReset();
    mocks.obtenerClientePorTelefono.mockReset();
    mocks.consumeRateLimit.mockReset();
    mocks.getClientIp.mockReset();
    mocks.ensureOtpInterimEnv.mockReset();

    mocks.getClientIp.mockReturnValue("127.0.0.1");
    mocks.consumeRateLimit.mockReturnValue({
      allowed: true,
      remaining: 4,
      resetAt: Date.now() + 60_000,
    });
  });

  it("rechaza PIN admin inválido", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "admin", pin: "0000" }),
      })
    );

    const body = (await response.json()) as {
      ok: boolean;
      error: { code: string; message: string };
    };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("INVALID_PIN");
    expect(mocks.crearSesion).not.toHaveBeenCalled();
  });

  it("bloquea admin por rate limit", async () => {
    mocks.consumeRateLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });

    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "admin", pin: "1234" }),
      })
    );

    expect(response.status).toBe(429);
    expect(mocks.crearSesion).not.toHaveBeenCalled();
  });

  it("acepta admin con PIN válido", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "admin", pin: "1234" }),
      })
    );

    const body = (await response.json()) as { ok: boolean; role: string };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.role).toBe("admin");
    expect(mocks.crearSesion).toHaveBeenCalledWith({ role: "admin", sub: "admin" });
  });

  it("rechaza login cliente sin email asociado", async () => {
    mocks.obtenerClientePorTelefono.mockResolvedValue({
      id: "c1",
      nombre_completo: "Cliente Test",
      telefono: "+59899123456",
      email: null,
    });

    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "cliente", telefono: "+598 99 123 456" }),
      })
    );

    const body = (await response.json()) as {
      ok: boolean;
      error: { code: string; message: string };
    };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("CLIENT_EMAIL_REQUIRED");
    expect(mocks.solicitarOtp).not.toHaveBeenCalled();
  });

  it("solicita OTP en login cliente válido", async () => {
    mocks.obtenerClientePorTelefono.mockResolvedValue({
      id: "c2",
      nombre_completo: "Cliente OTP",
      telefono: "+59899123456",
      email: "cliente@example.com",
    });

    mocks.solicitarOtp.mockResolvedValue({
      step: "code_sent",
      channel: "email",
      destination: "c***e@example.com",
      devCode: "123456",
    });

    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "cliente", telefono: "+598 99 123 456" }),
      })
    );

    const body = (await response.json()) as {
      ok: boolean;
      role: string;
      step: string;
      channel: string;
      destination: string;
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.role).toBe("cliente");
    expect(body.step).toBe("code_sent");
    expect(mocks.ensureOtpInterimEnv).toHaveBeenCalledTimes(1);
    expect(mocks.solicitarOtp).toHaveBeenCalledTimes(1);
  });
});
