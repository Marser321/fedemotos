import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getRequiredEnv, isProductionEnv } from "./env";
import type { SessionPayload } from "./types";

const COOKIE_NAME = "fede-session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSessionSecret(): string {
  return getRequiredEnv("SESSION_SECRET");
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function getAdminPin(): string {
  return getRequiredEnv("ADMIN_PIN");
}

export function safeConstantCompare(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

function serializeSessionToken(payload: SessionPayload): string {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function parseSessionToken(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = signPayload(encodedPayload);
  const left = Buffer.from(signature, "utf8");
  const right = Buffer.from(expected, "utf8");

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
    if (!parsed?.role || !parsed?.sub || !parsed?.exp || !parsed?.iat) {
      return null;
    }

    if (parsed.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function createPayload(input: {
  role: "cliente" | "admin";
  sub: string;
  telefono?: string;
}): SessionPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    role: input.role,
    sub: input.sub,
    telefono: input.telefono,
    iat: now,
    exp: now + COOKIE_MAX_AGE_SECONDS,
  };
}

export async function crearSesion(input: {
  role: "cliente" | "admin";
  sub: string;
  telefono?: string;
}) {
  const payload = createPayload(input);
  const token = serializeSessionToken(payload);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProductionEnv(),
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function obtenerSesion(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return parseSessionToken(token);
}

export function leerSesionDesdeCookie(token?: string): SessionPayload | null {
  if (!token) return null;
  return parseSessionToken(token);
}

export async function destruirSesion() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
