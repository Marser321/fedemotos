#!/usr/bin/env node

import fs from "node:fs";

const prodPath = ".env.production.local";
const stagingPath = ".env.staging.local";

function readEnv(filePath, key) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]?.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (k === key) return v;
  }
  return "";
}

if (!fs.existsSync(prodPath) || !fs.existsSync(stagingPath)) {
  console.error("Se requieren .env.production.local y .env.staging.local para validar perfiles");
  process.exit(1);
}

const prodUrl = readEnv(prodPath, "NEXT_PUBLIC_INSFORGE_URL");
const stagingUrl = readEnv(stagingPath, "NEXT_PUBLIC_INSFORGE_URL");

if (!prodUrl || !stagingUrl) {
  console.error("NEXT_PUBLIC_INSFORGE_URL falta en algun archivo de entorno");
  process.exit(1);
}

if (prodUrl === stagingUrl) {
  console.error("Invalid env separation: staging y production comparten backend URL");
  process.exit(1);
}

const runtimeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const runtimeEnv = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";

if (runtimeUrl && runtimeEnv !== "production" && runtimeUrl === prodUrl) {
  console.error(
    `Invalid runtime mapping: ${runtimeEnv} apunta al backend productivo (${prodUrl})`
  );
  process.exit(1);
}

console.log("Env profile validation OK");
