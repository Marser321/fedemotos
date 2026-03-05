import { createHash, timingSafeEqual } from "node:crypto";
import { AppError } from "./errors";
import { getOptionalEnv, getRequiredEnv, isProductionEnv } from "./env";
import { getInsforgeServiceClient } from "./insforge";
import type { OtpRequestResult } from "./types";

type OtpPurpose = "registro" | "login";

interface OtpRow {
  id: string;
  purpose: OtpPurpose;
  telefono: string;
  email: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  max_attempts: number;
  metadata: Record<string, unknown> | null;
}

function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;

  if (local.length <= 2) {
    return `${local[0] ?? "*"}***@${domain}`;
  }

  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function normalizeOtpProvider(): string {
  return getRequiredEnv("OTP_PROVIDER").trim().toLowerCase();
}

function shouldExposeDevCode(): boolean {
  return !isProductionEnv() && getOptionalEnv("OTP_DEV_ECHO_CODE") !== "false";
}

function codeMatchesHash(inputCode: string, expectedHash: string): boolean {
  const input = Buffer.from(hashOtp(inputCode), "utf8");
  const expected = Buffer.from(expectedHash, "utf8");
  return input.length === expected.length && timingSafeEqual(input, expected);
}

export async function solicitarOtp(args: {
  purpose: OtpPurpose;
  telefono: string;
  email: string;
  metadata?: Record<string, unknown>;
  ip: string;
}): Promise<OtpRequestResult> {
  if (normalizeOtpProvider() !== "email") {
    throw new AppError(
      "OTP_PROVIDER_NOT_SUPPORTED",
      "Proveedor OTP no soportado en esta versión",
      400
    );
  }

  const service = getInsforgeServiceClient();
  const otpCode = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const emailFrom = getOptionalEnv("OTP_EMAIL_FROM");
  const supportPhone = getOptionalEnv("SUPPORT_WHATSAPP_NUMBER");

  await service.database
    .from("auth_otp_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("purpose", args.purpose)
    .eq("telefono", args.telefono)
    .is("used_at", null);

  const { error: insertError } = await service.database.from("auth_otp_codes").insert([
    {
      purpose: args.purpose,
      telefono: args.telefono,
      email: args.email,
      code_hash: hashOtp(otpCode),
      expires_at: expiresAt,
      attempts: 0,
      max_attempts: 5,
      metadata: args.metadata ?? {},
      created_by_ip: args.ip,
    },
  ]);

  if (insertError) {
    throw new AppError("OTP_INSERT_FAILED", "No se pudo crear el código OTP", 500);
  }

  const subject =
    args.purpose === "registro"
      ? "Tu código para completar el registro en Fede Motos"
      : "Tu código para ingresar a Fede Motos";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
      <h2>Fede Motos</h2>
      <p>Usá este código para continuar:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px">${otpCode}</p>
      <p>Vence en 10 minutos.</p>
      ${
        supportPhone
          ? `<p>Si no fuiste vos, escribinos al WhatsApp ${supportPhone}.</p>`
          : ""
      }
    </div>
  `;

  const { error: sendError } = await service.emails.send({
    from: emailFrom ?? undefined,
    to: args.email,
    subject,
    html,
  });

  if (sendError) {
    if (!shouldExposeDevCode()) {
      throw new AppError(
        "OTP_EMAIL_FAILED",
        "No se pudo enviar el código por email",
        502
      );
    }
  }

  return {
    step: "code_sent",
    channel: "email",
    destination: maskEmail(args.email),
    devCode: shouldExposeDevCode() ? otpCode : undefined,
  };
}

export async function verificarOtp(args: {
  purpose: OtpPurpose;
  telefono: string;
  code: string;
}): Promise<{ email: string; metadata: Record<string, unknown> }> {
  const service = getInsforgeServiceClient();

  const { data, error } = await service.database
    .from("auth_otp_codes")
    .select(
      "id, purpose, telefono, email, code_hash, expires_at, attempts, max_attempts, metadata"
    )
    .eq("purpose", args.purpose)
    .eq("telefono", args.telefono)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AppError("OTP_LOOKUP_FAILED", "No se pudo validar el código", 500);
  }

  const row = data as OtpRow | null;
  if (!row) {
    throw new AppError("OTP_NOT_FOUND", "Código inválido o expirado", 400);
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    throw new AppError("OTP_EXPIRED", "El código expiró, pedí uno nuevo", 400);
  }

  if (row.attempts >= row.max_attempts) {
    throw new AppError(
      "OTP_MAX_ATTEMPTS",
      "Demasiados intentos. Solicitá un nuevo código",
      429
    );
  }

  if (!codeMatchesHash(args.code.trim(), row.code_hash)) {
    await service.database
      .from("auth_otp_codes")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);

    throw new AppError("OTP_INVALID", "Código inválido", 400);
  }

  const { error: markUsedError } = await service.database
    .from("auth_otp_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id);

  if (markUsedError) {
    throw new AppError("OTP_MARK_USED_FAILED", "No se pudo completar la validación", 500);
  }

  return {
    email: row.email,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

export function requireOtpCode(value: string): string {
  const trimmed = value.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    throw new AppError("OTP_FORMAT_INVALID", "El código debe tener 6 dígitos", 400);
  }
  return trimmed;
}

export function ensureOtpInterimEnv() {
  if (normalizeOtpProvider() !== "email") {
    throw new AppError(
      "OTP_PROVIDER_INVALID",
      "OTP_PROVIDER debe ser 'email' en esta versión",
      500
    );
  }

  if (isProductionEnv()) {
    getRequiredEnv("OTP_EMAIL_FROM");
  }
}
