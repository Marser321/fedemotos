import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeRateLimit } from "@/lib/rate-limit";

describe("consumeRateLimit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("permite intentos hasta el límite y luego bloquea", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000_000);

    const first = consumeRateLimit("login:1", { max: 2, windowMs: 1_000 });
    const second = consumeRateLimit("login:1", { max: 2, windowMs: 1_000 });
    const third = consumeRateLimit("login:1", { max: 2, windowMs: 1_000 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);

    nowSpy.mockRestore();
  });

  it("reinicia el bucket al vencer la ventana", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(10_000);

    consumeRateLimit("login:2", { max: 1, windowMs: 500 });
    const blocked = consumeRateLimit("login:2", { max: 1, windowMs: 500 });
    expect(blocked.allowed).toBe(false);

    nowSpy.mockReturnValue(10_600);
    const reset = consumeRateLimit("login:2", { max: 1, windowMs: 500 });
    expect(reset.allowed).toBe(true);
  });
});
