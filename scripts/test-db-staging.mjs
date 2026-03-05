#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@insforge/sdk";

const baseUrl = process.env.E2E_BASE_URL || process.env.E2E_STAGING_BASE_URL;
const adminPin = process.env.E2E_STAGING_ADMIN_PIN || process.env.ADMIN_PIN;
const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const serviceRoleKey =
  process.env.E2E_STAGING_SERVICE_ROLE_KEY || process.env.INSFORGE_SERVICE_ROLE_KEY;
const runId = process.env.E2E_RUN_ID || `${Date.now()}`;
const marker = `E2E-${runId}`;

if (!baseUrl) {
  console.error("E2E_BASE_URL o E2E_STAGING_BASE_URL es obligatorio");
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
  console.error(
    "E2E_STAGING_SERVICE_ROLE_KEY o INSFORGE_SERVICE_ROLE_KEY es obligatorio"
  );
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

async function patchAgendaConfig(baseUrlRef, authHeaders, baseline) {
  if (!baseline) return;
  const restore = await requestJson(`${baseUrlRef}/api/admin/agenda/config`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({
      status: baseline.status,
      pauseReason: baseline.pauseReason ?? null,
      pauseUntil: baseline.pauseUntil ?? null,
      minDaysAhead: baseline.minDaysAhead,
      maxDaysAhead: baseline.maxDaysAhead,
      slotDurationMinutes: baseline.slotDurationMinutes,
    }),
  });
  await assertOk(restore, 200, "PATCH /api/admin/agenda/config restore");
}

async function deleteExceptionById(baseUrlRef, cookie, id) {
  if (!id) return;
  const response = await requestJson(`${baseUrlRef}/api/admin/agenda/excepciones/${id}`, {
    method: "DELETE",
    headers: { cookie },
  });
  if (response.response.status !== 200 && response.response.status !== 404) {
    throw new Error(
      `DELETE /api/admin/agenda/excepciones/${id} fallo (${response.response.status})`
    );
  }
}

async function cleanupResidualExceptions(insforge, markerRef) {
  const query = await insforge.database
    .from("agenda_excepciones")
    .select("id, motivo")
    .ilike("motivo", `%${markerRef}%`);

  if (query.error) {
    throw new Error(`No se pudieron listar excepciones residuales: ${query.error.message}`);
  }

  const rows = query.data || [];
  for (const row of rows) {
    const deletion = await insforge.database
      .from("agenda_excepciones")
      .delete()
      .eq("id", row.id);
    if (deletion.error) {
      throw new Error(`No se pudo eliminar excepción residual ${row.id}: ${deletion.error.message}`);
    }
  }

  const verify = await insforge.database
    .from("agenda_excepciones")
    .select("id")
    .ilike("motivo", `%${markerRef}%`);

  if (verify.error) {
    throw new Error(`No se pudo verificar limpieza residual: ${verify.error.message}`);
  }

  return rows.length;
}

async function run() {
  await fs.mkdir(artifactsDir, { recursive: true });

  const evidence = {
    runId,
    marker,
    startedAt: new Date().toISOString(),
    baseUrl,
    checks: [],
    cleanup: {
      restoredConfig: false,
      deletedException: false,
      residualRemoved: 0,
      failures: [],
    },
  };

  const insforge = createClient({
    baseUrl: insforgeUrl,
    anonKey: serviceRoleKey,
  });

  let authHeaders = null;
  let cookie = null;
  let baselineConfig = null;
  let exceptionId = null;

  try {
    const login = await requestJson(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "admin", pin: adminPin }),
    });
    await assertOk(login, 200, "POST /api/auth/login");

    cookie = getCookieFromResponse(login.response);
    if (!cookie) {
      throw new Error("No se obtuvo cookie de sesión admin para pruebas");
    }
    authHeaders = {
      "content-type": "application/json",
      cookie,
    };
    evidence.checks.push({ name: "admin_login", ok: true });

    const configBefore = await requestJson(`${baseUrl}/api/admin/agenda/config`, {
      headers: { cookie },
    });
    await assertOk(configBefore, 200, "GET /api/admin/agenda/config");

    baselineConfig = configBefore.body?.data;
    evidence.configBefore = baselineConfig;

    const pauseReason = `[${marker}] db-verify-pause`;
    const paused = await requestJson(`${baseUrl}/api/admin/agenda/config`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ status: "pausada", pauseReason }),
    });
    await assertOk(paused, 200, "PATCH /api/admin/agenda/config pausada");

    const publicPaused = await requestJson(`${baseUrl}/api/agenda/config`);
    await assertOk(publicPaused, 200, "GET /api/agenda/config");
    if (publicPaused.body?.data?.acceptingBookings !== false) {
      throw new Error("Persistencia agenda pausada falló: acceptingBookings debería ser false");
    }
    evidence.checks.push({ name: "pause_read_after_write", ok: true });

    const testDate = tomorrowUyDate();
    const reason = `[${marker}] db exception`;
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
    exceptionId = createException.body?.data?.id ?? null;
    if (!exceptionId) {
      throw new Error("No se recibió id de excepción creada");
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
      throw new Error("La excepción creada no aparece en lectura admin (read-after-write)");
    }
    evidence.checks.push({ name: "exception_visible_admin", ok: true });

    const dbLookup = await insforge.database
      .from("agenda_excepciones")
      .select("id, fecha, tipo, hora_desde, hora_hasta, motivo")
      .eq("id", exceptionId)
      .maybeSingle();

    if (dbLookup.error) {
      throw new Error(`DB lookup error: ${dbLookup.error.message || "desconocido"}`);
    }
    if (!dbLookup.data?.id) {
      throw new Error("La excepción no existe en DB real después de crearla");
    }
    evidence.dbLookup = dbLookup.data;
    evidence.checks.push({ name: "exception_visible_db", ok: true });

    await deleteExceptionById(baseUrl, cookie, exceptionId);
    evidence.cleanup.deletedException = true;

    const dbAfterDelete = await insforge.database
      .from("agenda_excepciones")
      .select("id")
      .eq("id", exceptionId)
      .maybeSingle();

    if (dbAfterDelete.error) {
      throw new Error(`DB delete check error: ${dbAfterDelete.error.message || "desconocido"}`);
    }
    if (dbAfterDelete.data?.id) {
      throw new Error("La excepción no se eliminó en DB");
    }
    evidence.checks.push({ name: "delete_persisted_db", ok: true });
  } finally {
    if (authHeaders) {
      try {
        await patchAgendaConfig(baseUrl, authHeaders, baselineConfig);
        evidence.cleanup.restoredConfig = true;
      } catch (error) {
        evidence.cleanup.failures.push({
          type: "restore_config",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (cookie && exceptionId) {
      try {
        await deleteExceptionById(baseUrl, cookie, exceptionId);
        evidence.cleanup.deletedException = true;
      } catch (error) {
        evidence.cleanup.failures.push({
          type: "delete_exception_api",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    try {
      evidence.cleanup.residualRemoved = await cleanupResidualExceptions(insforge, marker);
    } catch (error) {
      evidence.cleanup.failures.push({
        type: "delete_exception_residual",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    evidence.finishedAt = new Date().toISOString();
    const outPath =
      evidence.cleanup.failures.length > 0
        ? path.join(artifactsDir, "db-verification.error.json")
        : path.join(artifactsDir, "db-verification.json");
    await fs.writeFile(outPath, JSON.stringify(evidence, null, 2));

    if (evidence.cleanup.failures.length > 0) {
      console.error(
        `test:db:staging cleanup incompleto: ${JSON.stringify(evidence.cleanup.failures)}`
      );
      process.exit(1);
    }
  }

  console.log("DB verification OK. Evidencia en artifacts/staging/db/db-verification.json");
}

run().catch(async (error) => {
  const failedEvidence = {
    runId,
    marker,
    finishedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
  };
  await fs.mkdir(artifactsDir, { recursive: true }).catch(() => {});
  await fs
    .writeFile(
      path.join(artifactsDir, "db-verification.error.json"),
      JSON.stringify(failedEvidence, null, 2)
    )
    .catch(() => {});
  console.error("test:db:staging fallo:", error instanceof Error ? error.message : error);
  process.exit(1);
});
