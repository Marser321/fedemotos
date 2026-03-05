import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/phone";
import { AppError } from "@/lib/errors";

describe("normalizePhone", () => {
  it("normaliza teléfonos con signos y espacios", () => {
    expect(normalizePhone("+598 99 123 456")).toBe("+59899123456");
    expect(normalizePhone("(099) 123-456")).toBe("099123456");
  });

  it("rechaza teléfonos demasiado cortos", () => {
    expect(() => normalizePhone("123")).toThrow(AppError);
    expect(() => normalizePhone("123")).toThrow("Ingresá un número de teléfono válido");
  });
});
