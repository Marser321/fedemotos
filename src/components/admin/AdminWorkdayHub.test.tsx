/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminWorkdayHub } from "./AdminWorkdayHub";
import type { AdminWorkdaySummary } from "@/lib/types";

// Mock de next/navigation para evitar fallos por useRouter()
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      refresh: mockRefresh,
    };
  },
}));

const dataLlena: AdminWorkdaySummary = {
  stats: {
    totalSuscriptores: 10,
    suscriptoresActivos: 8,
    auxiliosEsteMes: 3,
    facturacionMensual: 12000,
    serviciosCompletados: 5,
  },
  operacionesAbiertas: [
    {
      id: "op-1",
      clienteNombre: "Pedro Picapiedra",
      telefono: "59899111222",
      vehiculo: "Yamaha R3",
      prioridad: "alta",
      motivo: "Pinchadura rueda trasera",
    }
  ],
  turnosHoy: [
    {
      id: "tur-1",
      clienteNombre: "Pablo Marmol",
      servicio: "Cambio de aceite",
      hora: "10:00",
    }
  ],
  ordenesActivas: [
    {
      id: "ord-1",
      clienteId: "cli-1",
      clienteNombre: "Juan Perez",
      telefono: "59899123456",
      vehiculoId: "veh-1",
      vehiculo: "Honda CB190",
      turnoId: null,
      estado: "diagnostico",
      titulo: "Service completo",
      descripcion: null,
      diagnostico: null,
      notasInternas: null,
      costoEstimado: 2500,
      costoFinal: 0,
      fechaIngreso: "2026-05-26T12:00:00Z",
      fechaPrometida: null,
      createdAt: "2026-05-26T12:00:00Z",
      updatedAt: "2026-05-26T12:00:00Z",
    },
  ],
  recordatoriosPendientes: [],
  alertas: [
    {
      id: "ordenes-listas",
      level: "info",
      title: "Motos listas para entrega",
      detail: "Avisar clientes.",
      href: "/admin/ordenes",
    },
  ],
};

const dataVacia: AdminWorkdaySummary = {
  stats: {
    totalSuscriptores: 0,
    suscriptoresActivos: 0,
    auxiliosEsteMes: 0,
    facturacionMensual: 0,
    serviciosCompletados: 0,
  },
  operacionesAbiertas: [],
  turnosHoy: [],
  ordenesActivas: [],
  comunicacionesPendientes: [],
  recordatoriosPendientes: [],
  alertas: [],
};

describe("AdminWorkdayHub", () => {
  it("renderiza el resumen operativo, estadísticas y órdenes activas", () => {
    render(<AdminWorkdayHub data={dataLlena} />);

    expect(screen.getByText("Panel operativo")).toBeTruthy();
    expect(screen.getByText("Service completo")).toBeTruthy();
    expect(screen.getByText("Motos listas para entrega")).toBeTruthy();
    expect(screen.getByText("$12.000")).toBeTruthy();
    expect(screen.getByText("Pedro Picapiedra")).toBeTruthy();
    expect(screen.getByText("Pablo Marmol")).toBeTruthy();
  });

  it("renderiza correctamente los estados vacíos refinados", () => {
    render(<AdminWorkdayHub data={dataVacia} />);

    expect(screen.getByText("¡Todo al día!")).toBeTruthy();
    expect(screen.getByText("Sin turnos agendados")).toBeTruthy();
    expect(screen.getByText("Taller libre")).toBeTruthy();
    expect(screen.getByText("Cola limpia")).toBeTruthy();
  });

  it("permite actualizar datos usando el botón de refresco", () => {
    vi.useFakeTimers();
    render(<AdminWorkdayHub data={dataVacia} />);

    const refreshButton = screen.getByTitle("Actualizar datos");
    expect(refreshButton).toBeTruthy();

    fireEvent.click(refreshButton);
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
