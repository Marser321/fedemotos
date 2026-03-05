import { AppError } from "./errors";

export function normalizePhone(input: string): string {
  const cleaned = input.replace(/[^\d+]/g, "").trim();
  const digits = cleaned.replace(/\D/g, "");

  if (digits.length < 6) {
    throw new AppError("INVALID_PHONE", "Ingresá un número de teléfono válido", 400);
  }

  return cleaned.startsWith("+") ? `+${digits}` : digits;
}
