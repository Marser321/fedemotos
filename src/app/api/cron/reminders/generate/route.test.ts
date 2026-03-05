import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generarRecordatoriosOperativos: vi.fn(),
}));

vi.mock("@/lib/services", () => ({
  generarRecordatoriosOperativos: mocks.generarRecordatoriosOperativos,
}));

vi.mock("@/lib/env", () => ({
  getCronSecret: () => "secret-test",
}));

import { POST } from "./route";

describe("POST /api/cron/reminders/generate", () => {
  beforeEach(() => {
    mocks.generarRecordatoriosOperativos.mockReset();
  });

  it("rechaza cron sin auth", async () => {
    const response = await POST(
      new Request("http://localhost/api/cron/reminders/generate", { method: "POST" })
    );

    expect(response.status).toBe(401);
  });

  it("genera cola con auth válida", async () => {
    mocks.generarRecordatoriosOperativos.mockResolvedValue({ created: 3, skipped: 2 });

    const response = await POST(
      new Request("http://localhost/api/cron/reminders/generate", {
        method: "POST",
        headers: { authorization: "Bearer secret-test" },
      })
    );

    const body = (await response.json()) as { ok: boolean; created: number; skipped: number };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.created).toBe(3);
    expect(body.skipped).toBe(2);
  });
});
