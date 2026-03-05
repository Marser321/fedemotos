/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminGuidedTour } from "@/components/admin-help/AdminGuidedTour";
import type { HelpProcedure } from "@/lib/types";

const procedure: HelpProcedure = {
  id: "agenda_reserva",
  title: "Tour de agenda",
  summary: "Resumen",
  assets: {
    screenshot: "/help/admin/agenda/01-ocupacion.png",
    animation: "/help/admin/animations/reserva-turno.svg",
    alt: "Agenda",
  },
  checklist: ["check"],
  steps: [
    {
      id: "step-1",
      title: "Abrir agenda",
      description: "Paso 1",
      target: "agenda-status-card",
      tab: "agenda",
    },
    {
      id: "step-2",
      title: "Revisar ocupacion",
      description: "Paso 2",
      target: "agenda-day-occupancy",
      tab: "agenda",
    },
  ],
};

beforeEach(() => {
  const target1 = document.createElement("div");
  target1.setAttribute("data-help-id", "agenda-status-card");
  target1.getBoundingClientRect = () =>
    ({ top: 10, left: 10, width: 100, height: 50, right: 110, bottom: 60, x: 10, y: 10, toJSON: () => ({}) }) as DOMRect;
  const target2 = document.createElement("div");
  target2.setAttribute("data-help-id", "agenda-day-occupancy");
  target2.getBoundingClientRect = () =>
    ({ top: 80, left: 10, width: 100, height: 50, right: 110, bottom: 130, x: 10, y: 80, toJSON: () => ({}) }) as DOMRect;
  document.body.appendChild(target1);
  document.body.appendChild(target2);

  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("AdminGuidedTour", () => {
  it("navega al siguiente paso y notifica tab", async () => {
    const onStepChange = vi.fn();
    const onNavigateTab = vi.fn();

    render(
      <AdminGuidedTour
        procedure={procedure}
        stepIndex={0}
        onStepChange={onStepChange}
        onClose={vi.fn()}
        onComplete={vi.fn()}
        onReset={vi.fn()}
        onNavigateTab={onNavigateTab}
      />
    );

    expect(screen.getByText("Abrir agenda")).toBeTruthy();

    await waitFor(() => {
      expect(onNavigateTab).toHaveBeenCalledWith("agenda");
    });

    fireEvent.click(screen.getByRole("button", { name: /Siguiente paso/i }));
    expect(onStepChange).toHaveBeenCalledWith(1);
  });
});
