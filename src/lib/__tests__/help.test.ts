import { describe, expect, it } from "vitest";
import { getHelpProcedureById, listHelpProcedures } from "@/lib/help";

describe("help procedures", () => {
  it("expone procedimientos con steps y checklist", () => {
    const procedures = listHelpProcedures();
    expect(procedures.length).toBeGreaterThanOrEqual(5);

    for (const procedure of procedures) {
      expect(procedure.steps.length).toBeGreaterThan(0);
      expect(procedure.checklist.length).toBeGreaterThan(0);
      expect(procedure.assets.screenshot).toContain("/help/admin/");
      expect(procedure.assets.animation).toContain("/help/admin/animations/");
    }
  });

  it("resuelve un procedimiento por id", () => {
    const procedure = getHelpProcedureById("agenda_reserva");
    expect(procedure?.id).toBe("agenda_reserva");
    expect(procedure?.steps[0]?.target).toBeTruthy();
  });
});
