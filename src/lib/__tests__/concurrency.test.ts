import { describe, expect, it, vi } from "vitest";
import { AppError } from "../errors";

// Mock env variables so that database clients initialize
vi.mock("../env", () => ({
  getRequiredEnv: (name: string) => {
    if (name === "SESSION_SECRET") return "super-secret-key-at-least-32-chars-long";
    if (name === "ADMIN_PIN") return "123456";
    return "test-value";
  },
  isProductionEnv: () => false,
}));

// We'll dynamically change this in the test
let turnosTallerCallCount = 0;

const mockDatabase = {
  rpc: vi.fn(),
  from: vi.fn((table: string) => {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => {
        if (table === "clientes") {
          return {
            data: { id: "cli-1", nombre_completo: "Juan Perez", telefono: "59899123456", email: null },
            error: null,
          };
        }
        if (table === "vehiculos") {
          return {
            data: { id: "veh-1", cliente_id: "cli-1", marca: "Honda", modelo: "CB190", kilometraje_historico: 12000 },
            error: null,
          };
        }
        if (table === "turnos_taller") {
          turnosTallerCallCount++;
          if (turnosTallerCallCount === 1) {
            return {
              data: { id: "turno-1" },
              error: null,
            };
          } else {
            return {
              data: null,
              error: { code: "23505", message: "duplicate key value violates unique constraint" },
            };
          }
        }
        return { data: null, error: null };
      }),
    };
  }),
};

vi.mock("../insforge", () => ({
  getInsforgeServiceClient: () => ({
    database: mockDatabase,
  }),
  insforgePublic: {},
}));

vi.mock("../agenda", () => ({
  validarSlotAgendaReserva: vi.fn().mockResolvedValue({
    fechaSlot: "2026-06-01",
    horaSlot: "10:00",
    fechaTurnoIso: "2026-06-01T10:00:00Z",
  }),
}));

import { crearTurnoTaller, crearSolicitudAuxilio } from "../services";

describe("Simulacion de Reserva Concurrente de Turnos", () => {
  it("crearTurnoTaller maneja correctamente la concurrencia delegando al constraint unico de la base de datos (uq_turnos_fecha_hora_activos)", async () => {
    turnosTallerCallCount = 0;

    const bookingData = {
      nombre: "Juan Perez",
      telefono: "+59899123456",
      marca: "Honda",
      modelo: "CB190",
      kilometraje: "12000",
      fecha: "2026-06-01",
      horario: "10:00",
      notes: "Service de 12k",
    };

    // Ejecutamos ambas reservas concurrentemente
    const [res1, res2] = await Promise.allSettled([
      crearTurnoTaller(bookingData),
      crearTurnoTaller(bookingData),
    ]);

    // La primera debe ser exitosa
    expect(res1.status).toBe("fulfilled");
    if (res1.status === "fulfilled") {
      expect(res1.value).toEqual({ id: "turno-1" });
    }

    // La segunda debe fallar por SLOT_UNAVAILABLE (409) debido al unique constraint index
    expect(res2.status).toBe("rejected");
    if (res2.status === "rejected") {
      const error = res2.reason as AppError;
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe("SLOT_UNAVAILABLE");
      expect(error.status).toBe(409);
      expect(error.message).toContain("ya fue reservado");
    }

    // Verificamos que se llamó a la base de datos para turnos_taller dos veces
    expect(turnosTallerCallCount).toBe(2);
  });
});

describe("Validación de Límites de Auxilios y Membresía", () => {
  it("crearSolicitudAuxilio arroja error NO_AUXILIOS_REMAINING (403) si se han agotado los auxilios mensuales", async () => {
    mockDatabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "El cliente ha agotado sus 3 auxilios mensuales" },
    });

    const action = crearSolicitudAuxilio({
      clienteId: "cli-1",
      lat: -34.9011,
      lng: -56.1645,
      descripcion: "Pinchazo de rueda",
    });

    await expect(action).rejects.toThrowError(AppError);
    await expect(action).rejects.toThrowError("El cliente ha agotado sus 3 auxilios mensuales");
    try {
      await action;
    } catch (e) {
      const err = e as AppError;
      expect(err.code).toBe("NO_AUXILIOS_REMAINING");
      expect(err.status).toBe(403);
    }
  });

  it("crearSolicitudAuxilio arroja error NO_ACTIVE_MEMBERSHIP (403) si el cliente no posee membresía activa", async () => {
    mockDatabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "El cliente no tiene una membresía activa" },
    });

    const action = crearSolicitudAuxilio({
      clienteId: "cli-2",
      lat: -34.9011,
      lng: -56.1645,
      descripcion: "Problema eléctrico",
    });

    await expect(action).rejects.toThrowError(AppError);
    await expect(action).rejects.toThrowError("El cliente no tiene una membresía activa");
    try {
      await action;
    } catch (e) {
      const err = e as AppError;
      expect(err.code).toBe("NO_ACTIVE_MEMBERSHIP");
      expect(err.status).toBe(403);
    }
  });
});
