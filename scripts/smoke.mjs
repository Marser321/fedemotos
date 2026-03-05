#!/usr/bin/env node

const baseUrl = process.env.SMOKE_BASE_URL;

if (!baseUrl) {
  console.error("SMOKE_BASE_URL es obligatorio. Ejemplo: https://fede-motos.vercel.app");
  process.exit(1);
}

const failures = [];

function fail(name, detail) {
  failures.push(`${name}: ${detail}`);
}

async function jsonRequest(path, init = {}) {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    headers,
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { response, body };
}

async function run() {
  const loginPage = await fetch(new URL("/login", baseUrl));
  if (loginPage.status !== 200) {
    fail("GET /login", `status ${loginPage.status}`);
  }

  const adminGate = await fetch(new URL("/admin", baseUrl), {
    redirect: "manual",
  });
  if (![302, 307, 308].includes(adminGate.status)) {
    fail("GET /admin", `esperaba redirect sin sesión y llegó ${adminGate.status}`);
  }

  const session = await jsonRequest("/api/auth/sesion");
  if (session.response.status !== 200) {
    fail("GET /api/auth/sesion", `status ${session.response.status}`);
  }
  if (!session.body || typeof session.body.authenticated !== "boolean") {
    fail("GET /api/auth/sesion", "respuesta inválida");
  }

  const agendaConfig = await jsonRequest("/api/agenda/config");
  if (agendaConfig.response.status !== 200) {
    fail("GET /api/agenda/config", `status ${agendaConfig.response.status}`);
  }
  if (
    !agendaConfig.body?.data ||
    typeof agendaConfig.body.data.acceptingBookings !== "boolean"
  ) {
    fail("GET /api/agenda/config", "respuesta inválida");
  }

  const invalidAvailability = await jsonRequest("/api/agenda/disponibilidad");
  if (invalidAvailability.response.status !== 400) {
    fail(
      "GET /api/agenda/disponibilidad (sin fecha)",
      `esperaba 400 y llegó ${invalidAvailability.response.status}`
    );
  }

  const invalidAdmin = await jsonRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ mode: "admin", pin: "0000" }),
  });
  if (invalidAdmin.response.status !== 401) {
    fail("POST /api/auth/login (invalid pin)", `status ${invalidAdmin.response.status}`);
  }

  const invalidTurno = await jsonRequest("/api/turnos", {
    method: "POST",
    body: JSON.stringify({ nombre: "x" }),
  });
  if (invalidTurno.response.status !== 400) {
    fail("POST /api/turnos (payload inválido)", `status ${invalidTurno.response.status}`);
  }

  const adminLookupAnon = await jsonRequest("/api/admin/clientes/lookup?telefono=099123456");
  if (adminLookupAnon.response.status !== 403) {
    fail(
      "GET /api/admin/clientes/lookup (anon)",
      `esperaba 403 y llegó ${adminLookupAnon.response.status}`
    );
  }
  if (adminLookupAnon.body?.error?.code !== "FORBIDDEN") {
    fail(
      "GET /api/admin/clientes/lookup (anon)",
      `error code esperado FORBIDDEN y llegó ${adminLookupAnon.body?.error?.code || "n/a"}`
    );
  }

  const markSentAnon = await jsonRequest("/api/admin/reminders/rem-1/mark-sent", {
    method: "POST",
  });
  if (markSentAnon.response.status !== 403) {
    fail(
      "POST /api/admin/reminders/:id/mark-sent (anon)",
      `esperaba 403 y llegó ${markSentAnon.response.status}`
    );
  }
  if (markSentAnon.body?.error?.code !== "FORBIDDEN") {
    fail(
      "POST /api/admin/reminders/:id/mark-sent (anon)",
      `error code esperado FORBIDDEN y llegó ${markSentAnon.body?.error?.code || "n/a"}`
    );
  }

  const adminAgendaConfigAnon = await jsonRequest("/api/admin/agenda/config");
  if (adminAgendaConfigAnon.response.status !== 403) {
    fail(
      "GET /api/admin/agenda/config (anon)",
      `esperaba 403 y llegó ${adminAgendaConfigAnon.response.status}`
    );
  }
  if (adminAgendaConfigAnon.body?.error?.code !== "FORBIDDEN") {
    fail(
      "GET /api/admin/agenda/config (anon)",
      `error code esperado FORBIDDEN y llegó ${adminAgendaConfigAnon.body?.error?.code || "n/a"}`
    );
  }

  if (failures.length > 0) {
    console.error("Smoke checks fallaron:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Smoke checks OK");
}

run().catch((error) => {
  console.error("Smoke checks error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
