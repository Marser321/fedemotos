#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_STAGING_BASE_URL;
const adminPin = process.env.E2E_STAGING_ADMIN_PIN || process.env.ADMIN_PIN;

if (!baseUrl) {
  console.error("E2E_STAGING_BASE_URL es obligatorio");
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

async function ensureDirs() {
  await Promise.all(
    Object.values(outputs).map((file) => fs.mkdir(path.dirname(file), { recursive: true }))
  );
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

async function loginAdmin(page) {
  await page.goto(`${baseUrl}/login?mode=admin`, { waitUntil: "networkidle" });
  await page.locator('input[type="password"]').fill(adminPin);
  await page.getByRole("button", { name: /Acceder al Panel/i }).click();
  await page.waitForURL(/\/admin/, { timeout: 20000 });
  await page.locator('[data-help-id="admin-tabs"]').waitFor({ timeout: 20000 });
}

async function captureFlow(page) {
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

  const exceptionReason = `Auto capture ${Date.now()}`;
  const form = page.locator('[data-help-id="agenda-exceptions-form"]');
  await form.locator('input[type="date"]').first().fill(tomorrowUyDate());
  await form.locator('select').first().selectOption('bloqueo');
  await form.locator('input[type="time"]').nth(0).fill('09:00');
  await form.locator('input[type="time"]').nth(1).fill('10:00');
  await form.locator('input[placeholder="Motivo (opcional)"]').fill(exceptionReason);
  await form.getByRole("button", { name: /Agregar excepción|Agregar excepcion/i }).click();

  const list = page.locator('[data-help-id="agenda-exceptions-list"]');
  await list.getByText(exceptionReason).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: outputs.excepcion, fullPage: true });

  await page.locator('[data-help-id="agenda-turnos-table"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: outputs.persistencia, fullPage: true });

  const row = list.locator('div', { hasText: exceptionReason }).first();
  if (await row.count()) {
    await row.getByRole("button", { name: /Eliminar/i }).click();
    await page.waitForTimeout(400);
  }
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

async function main() {
  await ensureDirs();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 768 } });
  const page = await context.newPage();

  try {
    await loginAdmin(page);
    await captureFlow(page);
    await assertExpectedCaptures();
    console.log("Capturas de ayuda generadas en public/help/admin");
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error("help:capture:staging fallo:", error instanceof Error ? error.message : error);
  process.exit(1);
});
