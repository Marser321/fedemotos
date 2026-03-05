/** @vitest-environment jsdom */
/* eslint-disable @next/next/no-img-element */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminHelpCenter } from "@/components/admin-help/AdminHelpCenter";
import { listHelpProcedures } from "@/lib/help";

vi.mock("next/image", () => ({
  default: (props: { [key: string]: unknown }) => <img {...(props as Record<string, string>)} alt={String(props.alt || "")} />,
}));

describe("AdminHelpCenter", () => {
  it("renderiza modal y permite iniciar tour", () => {
    const onClose = vi.fn();
    const onStartTour = vi.fn();

    render(
      <AdminHelpCenter
        isOpen
        procedures={listHelpProcedures()}
        onClose={onClose}
        onStartTour={onStartTour}
        progress={null}
      />
    );

    expect(screen.getByText("Ayuda operativa")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Tour guiado/i }));
    fireEvent.click(screen.getByRole("button", { name: /Iniciar tour de este flujo/i }));

    expect(onStartTour).toHaveBeenCalledTimes(1);
  });
});
