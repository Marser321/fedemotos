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

const outputs = {
  overview: "public/help/admin/overview/01-panel-general.png",
  ocupacion: "public/help/admin/agenda/01-ocupacion.png",
  pausa: "public/help/admin/agenda/02-pausa.png",
  reactivar: "public/help/admin/agenda/03-reactivar.png",
  excepcion: "public/help/admin/agenda/04-excepcion.png",
  persistencia: "public/help/admin/agenda/05-persistencia.png",
};

const artifactsDir = "artifacts/staging/help";

async function ensureDirs() {
  await Promise.all([
    ...Object.values(outputs).map((file) => fs.mkdir(path.dirname(file), { recursive: true })),
    fs.mkdir(artifactsDir, { recursive: true }),
  ]);
}

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

async function parseApiResponse(response, label) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.ok === false) {
    throw new Error(
      `${label} fallo (${response.status()}): ${JSON.stringify(body?.error || body)}`
    );
  }
  return body;
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

async function captureFlow(page, state) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: outputs.overview, fullPage: true });

  await page.locator('[data-help-id="admin-tab-agenda"]').click();
  await page.locator('[data-help-id="agenda-status-card"]').waitFor({ timeout: 20000 });
  await page.waitForTimeout(500);

  await page.screenshot({ path: outputs.ocupacion, fullPage: true });

  const statusCard = page.locator('[data-help-id="agenda-status-card"]');
  await statusCard.getByRole("button", { name: /pausada/i }).click();
  await statusCard.locator('[data-help-id="agenda-status-save"]').click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: outputs.pausa, fullPage: true });

  await statusCard.getByRole("button", { name: /activa/i }).click();
  await statusCard.locator('[data-help-id="agenda-status-save"]').click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: outputs.reactivar, fullPage: true });

  const exceptionReason = `[${marker}] auto-capture`;
  state.exceptionReason = exceptionReason;
  state.exceptionDate = tomorrowUyDate();

  const form = page.locator('[data-help-id="agenda-exceptions-form"]');
  await form.locator('input[type="date"]').first().fill(state.exceptionDate);
  await form.locator('select').first().selectOption("bloqueo");
  await form.locator('input[type="time"]').nth(0).fill("09:00");
  await form.locator('input[type="time"]').nth(1).fill("10:00");
  await form.locator('input[placeholder="Motivo (opcional)"]').fill(exceptionReason);
  await form.getByRole("button", { name: /Agregar excepción|Agregar excepcion/i }).click();

  const list = page.locator('[data-help-id="agenda-exceptions-list"]');
  await list.getByText(exceptionReason).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: outputs.excepcion, fullPage: true });

  const exceptionsResp = await page.request.get(
    `${baseUrl}/api/admin/agenda/excepciones?dateFrom=${encodeURIComponent(
      state.exceptionDate
    )}&dateTo=${encodeURIComponent(state.exceptionDate)}&page=1&pageSize=100`
  );
  const exceptionsBody = await parseApiResponse(
    exceptionsResp,
    "GET /api/admin/agenda/excepciones"
  );

  const found = (exceptionsBody.data || []).find(
    (item) => item.motivo === exceptionReason
  );
  if (!found?.id) {
    throw new Error("No se pudo ubicar la excepción creada para cleanup");
  }
  state.createdExceptionIds.push(found.id);

  await page.locator('[data-help-id="agenda-turnos-table"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: outputs.persistencia, fullPage: true });
}

async function assertExpectedCaptures() {
  const missing = [];
  for (const output of Object.values(outputs)) {
    try {
      await fs.access(output);
    } catch {
      missing.push(output);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Faltan capturas esperadas: ${missing.join(", ")}`);
  }
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

  await parseApiResponse(response, "PATCH /api/admin/agenda/config (restore)");
}

async function cleanupExceptions(page, ids) {
  const failures = [];
  for (const id of ids) {
    const response = await page.request.delete(`${baseUrl}/api/admin/agenda/excepciones/${id}`);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      failures.push({ id, status: response.status(), body });
    }
  }
  return failures;
}

async function main() {
  await ensureDirs();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 768 } });
  const page = await context.newPage();

  const report = {
    runId,
    marker,
    baseUrl,
    startedAt: new Date().toISOString(),
    createdExceptionIds: [],
    cleanup: { restoredConfig: false, removedExceptions: true, failures: [] },
  };

  const state = {
    baselineConfig: null,
    createdExceptionIds: [],
    exceptionDate: "",
    exceptionReason: "",
  };

  try {
    await loginAdmin(page);

    const baselineResp = await page.request.get(`${baseUrl}/api/admin/agenda/config`);
    const baselineBody = await parseApiResponse(
      baselineResp,
      "GET /api/admin/agenda/config (baseline)"
    );
    state.baselineConfig = baselineBody.data;

    await captureFlow(page, state);
    report.createdExceptionIds = [...state.createdExceptionIds];

    await assertExpectedCaptures();
    console.log("Capturas de ayuda generadas en public/help/admin");
  } finally {
    try {
      await restoreAgendaConfig(page, state.baselineConfig);
      report.cleanup.restoredConfig = true;
    } catch (error) {
      report.cleanup.failures.push({
        type: "restore_config",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const cleanupFailures = await cleanupExceptions(page, state.createdExceptionIds);
    if (cleanupFailures.length > 0) {
      report.cleanup.removedExceptions = false;
      report.cleanup.failures.push({ type: "delete_exceptions", failures: cleanupFailures });
    }

    report.finishedAt = new Date().toISOString();
    await fs.writeFile(
      path.join(artifactsDir, "help-capture-report.json"),
      JSON.stringify(report, null, 2)
    );

    await context.close();
    await browser.close();

    if (report.cleanup.failures.length > 0) {
      throw new Error(`Cleanup incompleto en help capture: ${JSON.stringify(report.cleanup.failures)}`);
    }
  }
}

main().catch((error) => {
  console.error(
    "help:capture:staging fallo:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
