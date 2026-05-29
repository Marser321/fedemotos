import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buscarClientePorTelefono: vi.fn(),
  ensureOtpInterimEnv: vi.fn(),
  solicitarOtp: vi.fn(),
}));

vi.mock("@/lib/services", () => ({
  buscarClientePorTelefono: mocks.buscarClientePorTelefono,
}));

vi.mock("@/lib/otp", () => ({
  ensureOtpInterimEnv: mocks.ensureOtpInterimEnv,
  solicitarOtp: mocks.solicitarOtp,
}));

import { POST } from "./route";

const validBody = {
  nombre: "Juan Perez",
  telefono: "+59899123456",
  email: "juan@example.com",
  marca: "Honda",
  modelo: "CB190",
};

function registroRequest(ip?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (ip) headers["x-forwarded-for"] = ip;
  return new Request("http://localhost/api/auth/registro", {
    method: "POST",
    headers,
    body: JSON.stringify(validBody),
  });
}

describe("POST /api/auth/registro", () => {
  beforeEach(() => {
    mocks.buscarClientePorTelefono.mockReset();
    mocks.ensureOtpInterimEnv.mockReset();
    mocks.solicitarOtp.mockReset();
  });

  it("valida payload obligatorio", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/registro", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.1" },
        body: JSON.stringify({ nombre: "A" }),
      })
    );
    expect(response.status).toBe(400);
    expect(mocks.solicitarOtp).not.toHaveBeenCalled();
  });

  it("rechaza teléfono ya registrado", async () => {
    mocks.buscarClientePorTelefono.mockResolvedValue({ id: "c-1" });

    const response = await POST(registroRequest("198.51.100.2"));
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("PHONE_ALREADY_REGISTERED");
    expect(mocks.solicitarOtp).not.toHaveBeenCalled();
  });

  it("solicita OTP cuando el teléfono es nuevo", async () => {
    mocks.buscarClientePorTelefono.mockResolvedValue(null);
    mocks.solicitarOtp.mockResolvedValue({ emailMasked: "j***n@example.com" });

    const response = await POST(registroRequest("198.51.100.3"));
    const body = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.solicitarOtp).toHaveBeenCalledTimes(1);
  });

  it("aplica rate limit por IP", async () => {
    mocks.buscarClientePorTelefono.mockResolvedValue(null);
    mocks.solicitarOtp.mockResolvedValue({ emailMasked: "j***n@example.com" });
    const ip = "198.51.100.50";

    for (let i = 0; i < 5; i += 1) {
      const ok = await POST(registroRequest(ip));
      expect(ok.status).toBe(200);
    }

    const blocked = await POST(registroRequest(ip));
    const body = (await blocked.json()) as { error: { code: string } };
    expect(blocked.status).toBe(429);
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
