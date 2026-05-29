import { describe, expect, it, vi } from "vitest";

// Mock env variables so that auth.ts can initialize
vi.mock("../env", () => ({
  getRequiredEnv: (name: string) => {
    if (name === "SESSION_SECRET") return "super-secret-key-at-least-32-chars-long";
    if (name === "ADMIN_PIN") return "123456";
    return "";
  },
  isProductionEnv: () => false,
}));

import { safeConstantCompare } from "../auth";

describe("auth utilities", () => {
  describe("safeConstantCompare", () => {
    it("retorna true para strings idénticos", () => {
      expect(safeConstantCompare("123456", "123456")).toBe(true);
      expect(safeConstantCompare("", "")).toBe(true);
      expect(safeConstantCompare("abcdef", "abcdef")).toBe(true);
    });

    it("retorna false para strings con diferente contenido", () => {
      expect(safeConstantCompare("123456", "123457")).toBe(false);
      expect(safeConstantCompare("abc", "def")).toBe(false);
    });

    it("retorna false para strings de longitudes distintas", () => {
      expect(safeConstantCompare("123456", "123456789")).toBe(false);
      expect(safeConstantCompare("123456", "123")).toBe(false);
      expect(safeConstantCompare("", "a")).toBe(false);
    });
  });
});
