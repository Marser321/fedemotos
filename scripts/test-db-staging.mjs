#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@insforge/sdk";

const baseUrl = process.env.E2E_STAGING_BASE_URL;
const adminPin = process.env.E2E_STAGING_ADMIN_PIN || process.env.ADMIN_PIN;
const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const serviceRoleKey = process.env.E2E_STAGING_SERVICE_ROLE_KEY;

if (!baseUrl) {
  console.error("E2E_STAGING_BASE_URL es obligatorio");
  process.exit(1);
}
if (!adminPin) {
  console.error("E2E_STAGING_ADMIN_PIN (o ADMIN_PIN) es obligatorio");
  process.exit(1);
}
if (!insforgeUrl) {
  console.error("NEXT_PUBLIC_INSFORGE_URL es obligatorio para verificar DB");
  process.exit(1);
}
if (!serviceRoleKey) {
  console.error("E2E_STAGING_SERVICE_ROLE_KEY es obligatorio para verificar DB");
  process.exit(1);
}

const artifactsDir = "artifacts/staging/db";

function tomorrowUyDate() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + 1);
  return formatter.format(now);
}

function getCookieFromResponse(response) {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return null;
  return setCookie.split(",")[0].split(";")[0];
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function assertOk(result, expectedStatus, label) {
  if (result.response.status !== expectedStatus) {
    throw new Error(
      `${label} esperaba ${expectedStatus} y obtuvo ${result.response.status} ${JSON.stringify(result.body)}`
    );
  }
}

async function run() {
  await fs.mkdir(artifactsDir, { recursive: true });

  const evidence = {
    startedAt: new Date().toISOString(),
    baseUrl,
    checks: [],
  };

  const login = await requestJson(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "admin", pin: adminPin }),
  });
  await assertOk(login, 200, "POST /api/auth/login");

  const cookie = getCookieFromResponse(login.response);
  if (!cookie) {
    throw new Error("No se obtuvo cookie de sesion admin para pruebas de staging");
  }
  evidence.checks.push({ name: "admin_login", ok: true });

  const authHeaders = {
    "content-type": "application/json",
    cookie,
  };

  const configBefore = await requestJson(`${baseUrl}/api/admin/agenda/config`, {
    headers: { cookie },
  });
  await assertOk(configBefore, 200, "GET /api/admin/agenda/config");

  const beforeData = configBefore.body?.data;
  evidence.configBefore = beforeData;

  const pauseReason = `DB verify ${Date.now()}`;
  const paused = await requestJson(`${baseUrl}/api/admin/agenda/config`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ status: "pausada", pauseReason }),
  });
  await assertOk(paused, 200, "PATCH /api/admin/agenda/config pausada");

  const publicPaused = await requestJson(`${baseUrl}/api/agenda/config`);
  await assertOk(publicPaused, 200, "GET /api/agenda/config");
  if (publicPaused.body?.data?.acceptingBookings !== false) {
    throw new Error("Persistencia agenda pausada fallo: acceptingBookings deberia ser false");
  }
  evidence.checks.push({ name: "pause_read_after_write", ok: true });

  const restore = await requestJson(`${baseUrl}/api/admin/agenda/config`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({
      status: beforeData?.status || "activa",
      pauseReason: beforeData?.pauseReason || null,
      pauseUntil: beforeData?.pauseUntil || null,
      minDaysAhead: beforeData?.minDaysAhead || 1,
      maxDaysAhead: beforeData?.maxDaysAhead || 30,
      slotDurationMinutes: beforeData?.slotDurationMinutes || 60,
    }),
  });
  await assertOk(restore, 200, "PATCH /api/admin/agenda/config restore");
  evidence.checks.push({ name: "config_restored", ok: true });

  const testDate = tomorrowUyDate();
  const reason = `DB exception ${Date.now()}`;
  const createException = await requestJson(`${baseUrl}/api/admin/agenda/excepciones`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      fecha: testDate,
      tipo: "bloqueo",
      horaDesde: "09:00",
      horaHasta: "10:00",
      motivo: reason,
    }),
  });
  await assertOk(createException, 200, "POST /api/admin/agenda/excepciones");
  const exceptionId = createException.body?.data?.id;
  if (!exceptionId) {
    throw new Error("No se recibio id de excepcion creada");
  }
  evidence.createdException = createException.body;

  const listExceptions = await requestJson(
    `${baseUrl}/api/admin/agenda/excepciones?dateFrom=${encodeURIComponent(
      testDate
    )}&dateTo=${encodeURIComponent(testDate)}&page=1&pageSize=50`,
    { headers: { cookie } }
  );
  await assertOk(listExceptions, 200, "GET /api/admin/agenda/excepciones");
  const foundInAdmin = (listExceptions.body?.data || []).some((row) => row.id === exceptionId);
  if (!foundInAdmin) {
    throw new Error("La excepcion creada no aparece en la lectura admin (read-after-write)");
  }
  evidence.checks.push({ name: "exception_visible_admin", ok: true });

  const insforge = createClient({
    baseUrl: insforgeUrl,
    anonKey: serviceRoleKey,
  });

  const dbLookup = await insforge.database
    .from("agenda_excepciones")
    .select("id, fecha, tipo, hora_desde, hora_hasta, motivo")
    .eq("id", exceptionId)
    .maybeSingle();

  if (dbLookup.error) {
    throw new Error(`DB lookup error: ${dbLookup.error.message || "desconocido"}`);
  }
  if (!dbLookup.data?.id) {
    throw new Error("La excepcion no existe en DB real despues de crearla");
  }
  evidence.dbLookup = dbLookup.data;
  evidence.checks.push({ name: "exception_visible_db", ok: true });

  const deleteException = await requestJson(`${baseUrl}/api/admin/agenda/excepciones/${exceptionId}`, {
    method: "DELETE",
    headers: { cookie },
  });
  await assertOk(deleteException, 200, "DELETE /api/admin/agenda/excepciones/:id");
  evidence.checks.push({ name: "exception_deleted", ok: true });

  const dbAfterDelete = await insforge.database
    .from("agenda_excepciones")
    .select("id")
    .eq("id", exceptionId)
    .maybeSingle();

  if (dbAfterDelete.error) {
    throw new Error(`DB delete check error: ${dbAfterDelete.error.message || "desconocido"}`);
  }
  if (dbAfterDelete.data?.id) {
    throw new Error("La excepcion no se elimino en DB");
  }
  evidence.checks.push({ name: "delete_persisted_db", ok: true });

  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(
    path.join(artifactsDir, "db-verification.json"),
    JSON.stringify(evidence, null, 2)
  );

  console.log("DB staging verification OK. Evidencia en artifacts/staging/db/db-verification.json");
}

run().catch(async (error) => {
  const failedEvidence = {
    finishedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
  };
  await fs.mkdir(artifactsDir, { recursive: true }).catch(() => {});
  await fs
    .writeFile(path.join(artifactsDir, "db-verification.error.json"), JSON.stringify(failedEvidence, null, 2))
    .catch(() => {});
  console.error("test:db:staging fallo:", error instanceof Error ? error.message : error);
  process.exit(1);
});
