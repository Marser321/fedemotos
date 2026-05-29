import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  destruirSesion: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  destruirSesion: mocks.destruirSesion,
}));

import { POST } from "./route";

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    mocks.destruirSesion.mockReset();
  });

  it("destruye la sesión y responde ok", async () => {
    mocks.destruirSesion.mockResolvedValue(undefined);

    const response = await POST();
    const body = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.destruirSesion).toHaveBeenCalledTimes(1);
  });
});
