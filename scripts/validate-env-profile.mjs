#!/usr/bin/env node

import fs from "node:fs";

const prodPath = ".env.production.local";
const stagingPath = ".env.staging.local";

const MIN_SESSION_SECRET_LENGTH = 32;

function readEnv(filePath, key) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]?.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line
      .slice(idx + 1)
      .trim()
      .replace(/^"(.*)"$/, "$1");
    if (k === key) return v;
  }
  return "";
}

if (!fs.existsSync(prodPath) || !fs.existsSync(stagingPath)) {
  console.error("Se requieren .env.production.local y .env.staging.local para validar perfiles");
  process.exit(1);
}

const errors = [];
const warnings = [];

const requiredByProfile = [
  "NEXT_PUBLIC_INSFORGE_URL",
  "NEXT_PUBLIC_INSFORGE_ANON_KEY",
  "INSFORGE_SERVICE_ROLE_KEY",
  "SESSION_SECRET",
  "ADMIN_PIN",
];

function validateProfile(filePath, profileName) {
  const values = Object.fromEntries(
    requiredByProfile.map((key) => [key, readEnv(filePath, key)])
  );

  for (const key of requiredByProfile) {
    if (!values[key]) {
      errors.push(`${profileName}: falta ${key}`);
    }
  }

  if (
    values.NEXT_PUBLIC_INSFORGE_ANON_KEY &&
    values.INSFORGE_SERVICE_ROLE_KEY &&
    values.NEXT_PUBLIC_INSFORGE_ANON_KEY === values.INSFORGE_SERVICE_ROLE_KEY
  ) {
    errors.push(
      `${profileName}: INSFORGE_SERVICE_ROLE_KEY no puede coincidir con NEXT_PUBLIC_INSFORGE_ANON_KEY`
    );
  }

  if (
    values.SESSION_SECRET &&
    values.SESSION_SECRET.length < MIN_SESSION_SECRET_LENGTH
  ) {
    errors.push(
      `${profileName}: SESSION_SECRET debe tener al menos ${MIN_SESSION_SECRET_LENGTH} caracteres`
    );
  }

  if (values.ADMIN_PIN && values.ADMIN_PIN.trim().length === 0) {
    errors.push(`${profileName}: ADMIN_PIN no puede estar vacío`);
  }

  return values;
}

const prodValues = validateProfile(prodPath, "production");
const stagingValues = validateProfile(stagingPath, "staging");

if (
  prodValues.NEXT_PUBLIC_INSFORGE_URL &&
  stagingValues.NEXT_PUBLIC_INSFORGE_URL &&
  prodValues.NEXT_PUBLIC_INSFORGE_URL === stagingValues.NEXT_PUBLIC_INSFORGE_URL
) {
  warnings.push(
    "Aviso: production y staging comparten NEXT_PUBLIC_INSFORGE_URL (modo backend único temporal)"
  );
}

const runtimeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || "";
const runtimeEnv = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
if (
  runtimeUrl &&
  runtimeEnv !== "production" &&
  runtimeUrl === prodValues.NEXT_PUBLIC_INSFORGE_URL
) {
  warnings.push(
    `Aviso runtime: ${runtimeEnv} usa backend productivo (${runtimeUrl}) en modo backend único`
  );
}

if (warnings.length > 0) {
  for (const warning of warnings) {
    console.warn(`WARN: ${warning}`);
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
  process.exit(1);
}

console.log("Env profile validation OK (single-backend compatible)");
