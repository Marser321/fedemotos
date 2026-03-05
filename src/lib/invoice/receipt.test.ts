import { beforeEach, describe, expect, it } from "vitest";
import { buildReceiptViewModel } from "@/lib/invoice/receipt";
import type { ServicioRegistro } from "@/lib/types";

const servicioBase: ServicioRegistro = {
  id: "9f8e4a95-12ff-4b77-99a0-31d9f5f7e9d1",
  clienteNombre: "Federico Perez",
  moto: "Honda CB190",
  servicio: "Cambio de aceite y filtro",
  kilometraje: 18200,
  fecha: "2026-03-05T12:00:00.000Z",
  estado: "completado",
  costo: 2800,
};

describe("buildReceiptViewModel", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_RECEIPT_ISSUER_NAME;
    delete process.env.NEXT_PUBLIC_RECEIPT_ISSUER_PHONE;
    delete process.env.NEXT_PUBLIC_RECEIPT_ISSUER_ADDRESS;
  });

  it("aplica defaults de emisor cuando faltan env vars", () => {
    const model = buildReceiptViewModel(servicioBase);
    expect(model.issuer.name).toBe("Fede Motos Servicios");
    expect(model.total).toContain("$");
    expect(model.receiptId).toBe("9F8E4A95");
  });

  it("usa env vars de emisor cuando estan definidas", () => {
    process.env.NEXT_PUBLIC_RECEIPT_ISSUER_NAME = "Fede Motos HQ";
    process.env.NEXT_PUBLIC_RECEIPT_ISSUER_PHONE = "+598000000";
    process.env.NEXT_PUBLIC_RECEIPT_ISSUER_ADDRESS = "Av. 8 de Octubre 1234";

    const model = buildReceiptViewModel(servicioBase);
    expect(model.issuer.name).toBe("Fede Motos HQ");
    expect(model.issuer.phone).toBe("+598000000");
    expect(model.issuer.address).toContain("8 de Octubre");
  });
});
