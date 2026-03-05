#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL || process.env.E2E_STAGING_BASE_URL;
const adminPin = process.env.E2E_STAGING_ADMIN_PIN || process.env.ADMIN_PIN;
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

const artifactsDir = "artifacts/staging/e2e";

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

async function parseJson(response) {
  const body = await response.json().catch(() => ({}));
  return body || {};
}

async function parseApiOk(response, label) {
  const body = await parseJson(response);
  if (!response.ok || body?.ok === false) {
    throw new Error(`${label} fallo (${response.status()}): ${JSON.stringify(body?.error || body)}`);
  }
  return body;
}

async function assertStatus(response, expected, label) {
  if (response.status() !== expected) {
    const body = await parseJson(response);
    throw new Error(`${label} esperaba ${expected} y obtuvo ${response.status()} ${JSON.stringify(body)}`);
  }
}

async function loginAdmin(page) {
  await page.goto(`${baseUrl}/login?mode=admin`, { waitUntil: "networkidle" });
  const passwordInput = page.locator('input[type="password"]');
  const hasPasswordInput = await passwordInput
    .first()
    .isVisible({ timeout: 4000 })
    .catch(() => false);

  if (!hasPasswordInput) {
    const adminModeButton = page.getByRole("button", { name: /soy admin/i });
    const canSwitchMode = await adminModeButton
      .first()
      .isVisible({ timeout: 4000 })
      .catch(() => false);
    if (canSwitchMode) {
      await adminModeButton.first().click();
    }
  }

  await passwordInput.first().fill(adminPin);
  await page.getByRole("button", { name: /Acceder al Panel/i }).click();
  await page.waitForURL(/\/admin/, { timeout: 20000 });
  await page.locator('[data-help-id="admin-tabs"]').waitFor({ timeout: 20000 });
}

async function restoreAgendaConfig(page, baseline) {
  if (!baseline) return;
  const response = await page.request.patch(`${baseUrl}/api/admin/agenda/config`, {
    headers: { "content-type": "application/json" },
    data: {
      status: baseline.status,
      pauseReason: baseline.pauseReason ?? null,
      pauseUntil: baseline.pauseUntil ?? null,
      minDaysAhead: baseline.minDaysAhead,
      maxDaysAhead: baseline.maxDaysAhead,
      slotDurationMinutes: baseline.slotDurationMinutes,
    },
  });
  await parseApiOk(response, "PATCH /api/admin/agenda/config (restore)");
}

async function deleteException(page, exceptionId) {
  if (!exceptionId) return;
  const response = await page.request.delete(`${baseUrl}/api/admin/agenda/excepciones/${exceptionId}`);
  if (!response.ok) {
    const body = await parseJson(response);
    throw new Error(
      `DELETE /api/admin/agenda/excepciones/${exceptionId} fallo (${response.status()}): ${JSON.stringify(body)}`
    );
  }
}

async function run() {
  await fs.mkdir(artifactsDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 768 } });
  const page = await context.newPage();

  const report = {
    runId,
    marker,
    startedAt: new Date().toISOString(),
    baseUrl,
    checks: [],
    cleanup: {
      restoredConfig: false,
      removedException: false,
      failures: [],
    },
  };

  let baselineConfig = null;
  let exceptionId = null;

  try {
    await loginAdmin(page);
    report.checks.push({ name: "admin_login", ok: true });

    const baselineResp = await page.request.get(`${baseUrl}/api/admin/agenda/config`);
    const baselineBody = await parseApiOk(
      baselineResp,
      "GET /api/admin/agenda/config (baseline)"
    );
    baselineConfig = baselineBody.data;

    await page.locator('[data-help-id="admin-tab-agenda"]').click();
    await page.locator('[data-help-id="agenda-status-card"]').waitFor({ timeout: 20000 });

    const statusCard = page.locator('[data-help-id="agenda-status-card"]');
    await statusCard.getByRole("button", { name: /pausada/i }).click();
    await statusCard.locator('[data-help-id="agenda-status-save"]').click();
    await page.waitForTimeout(900);

    const pausedConfigResp = await page.request.get(`${baseUrl}/api/agenda/config`);
    await assertStatus(pausedConfigResp, 200, "GET /api/agenda/config (paused)");
    const pausedConfig = await parseJson(pausedConfigResp);
    if (pausedConfig?.data?.acceptingBookings !== false) {
      throw new Error("La agenda deberia quedar pausada tras guardar estado");
    }
    report.checks.push({ name: "agenda_pause_persisted", ok: true });

    await statusCard.getByRole("button", { name: /activa/i }).click();
    await statusCard.locator('[data-help-id="agenda-status-save"]').click();
    await page.waitForTimeout(900);

    const activeConfigResp = await page.request.get(`${baseUrl}/api/agenda/config`);
    await assertStatus(activeConfigResp, 200, "GET /api/agenda/config (active)");
    const activeConfig = await parseJson(activeConfigResp);
    if (activeConfig?.data?.acceptingBookings !== true) {
      throw new Error("La agenda deberia quedar activa tras reactivar");
    }
    report.checks.push({ name: "agenda_reactivate_persisted", ok: true });

    const testDate = tomorrowUyDate();
    const reason = `[${marker}] e2e agenda`;
    const exceptionForm = page.locator('[data-help-id="agenda-exceptions-form"]');
    await exceptionForm.locator('input[type="date"]').first().fill(testDate);
    await exceptionForm.locator('select').first().selectOption("bloqueo");
    await exceptionForm.locator('input[type="time"]').nth(0).fill("09:00");
    await exceptionForm.locator('input[type="time"]').nth(1).fill("10:00");
    await exceptionForm.locator('input[placeholder="Motivo (opcional)"]').fill(reason);
    await exceptionForm.getByRole("button", { name: /Agregar excepción|Agregar excepcion/i }).click();

    const exceptionList = page.locator('[data-help-id="agenda-exceptions-list"]');
    await exceptionList.getByText(reason).first().waitFor({ timeout: 15000 });

    const exceptionsResp = await page.request.get(
      `${baseUrl}/api/admin/agenda/excepciones?dateFrom=${encodeURIComponent(
        testDate
      )}&dateTo=${encodeURIComponent(testDate)}&page=1&pageSize=100`
    );
    const exceptionsBody = await parseApiOk(
      exceptionsResp,
      "GET /api/admin/agenda/excepciones"
    );
    const foundException = (exceptionsBody.data || []).find((item) => item.motivo === reason);
    exceptionId = foundException?.id ?? null;
    if (!exceptionId) {
      throw new Error("No se pudo identificar exceptionId para cleanup en e2e");
    }

    const availabilityResp = await page.request.get(
      `${baseUrl}/api/agenda/disponibilidad?fecha=${encodeURIComponent(testDate)}`
    );
    await assertStatus(availabilityResp, 200, "GET /api/agenda/disponibilidad");
    const availability = await parseJson(availabilityResp);
    const blocked = (availability?.data?.slots || []).some(
      (slot) => slot.hora === "09:00" && slot.reason === "blocked"
    );
    if (!blocked) {
      throw new Error("La excepción de bloqueo 09:00-10:00 no impactó la disponibilidad");
    }
    report.checks.push({ name: "agenda_exception_impacts_availability", ok: true });

    await page.screenshot({ path: path.join(artifactsDir, "admin-agenda-e2e.png"), fullPage: true });
    report.checks.push({ name: "e2e_screenshot", ok: true, file: "admin-agenda-e2e.png" });
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    report.checks.push({ name: "run", ok: false });
    await page.screenshot({ path: path.join(artifactsDir, "error.png"), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    try {
      await restoreAgendaConfig(page, baselineConfig);
      report.cleanup.restoredConfig = true;
    } catch (error) {
      report.cleanup.failures.push({
        type: "restore_config",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      await deleteException(page, exceptionId);
      report.cleanup.removedException = true;
    } catch (error) {
      report.cleanup.failures.push({
        type: "delete_exception",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    report.finishedAt = new Date().toISOString();
    await fs.writeFile(path.join(artifactsDir, "report.json"), JSON.stringify(report, null, 2));

    await context.close();
    await browser.close();

    if (report.cleanup.failures.length > 0) {
      console.error(`Cleanup incompleto en e2e: ${JSON.stringify(report.cleanup.failures)}`);
      process.exit(1);
    }
  }
}

run()
  .then(() => {
    console.log("E2E staging OK. Reporte en artifacts/staging/e2e/report.json");
  })
  .catch((error) => {
    console.error("test:e2e:staging fallo:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
