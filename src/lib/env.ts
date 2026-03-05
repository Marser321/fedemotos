import { AppError } from "./errors";

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getRequiredEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new AppError(
      "MISSING_ENV",
      `Falta la variable de entorno obligatoria: ${name}`,
      500
    );
  }
  return value;
}

export function getOptionalEnv(name: string): string | undefined {
  return readEnv(name);
}

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getSupportWhatsappNumber(): string {
  return (
    getOptionalEnv("NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER") ??
    getRequiredEnv("SUPPORT_WHATSAPP_NUMBER")
  );
}

export function getCronSecret(): string {
  return getRequiredEnv("CRON_SECRET");
}
