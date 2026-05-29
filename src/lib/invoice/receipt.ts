import type { ServicioRegistro, OrdenTaller } from "@/lib/types";

export interface ReceiptIssuerConfig {
  name: string;
  phone: string;
  address: string;
}

export interface ReceiptViewModel {
  issuer: ReceiptIssuerConfig;
  receiptId: string;
  emissionDate: string;
  serviceDate: string;
  cliente: string;
  moto: string;
  servicio: string;
  kilometraje: string;
  estado: string;
  total: string;
}

function getIssuerConfig(): ReceiptIssuerConfig {
  return {
    name: process.env.NEXT_PUBLIC_RECEIPT_ISSUER_NAME || "Fede Motos Servicios",
    phone: process.env.NEXT_PUBLIC_RECEIPT_ISSUER_PHONE || "+598 99 123 456",
    address:
      process.env.NEXT_PUBLIC_RECEIPT_ISSUER_ADDRESS ||
      "Montevideo, Uruguay",
  };
}

function formatCurrency(value: number): string {
  return `$ ${value.toLocaleString("es-UY")}`;
}

function normalizeFilename(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

async function loadImageDataUrl(path: string): Promise<string | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function buildReceiptViewModel(servicio: ServicioRegistro): ReceiptViewModel {
  const issuer = getIssuerConfig();
  const serviceDate = new Date(servicio.fecha).toLocaleDateString("es-UY");
  const emissionDate = new Date().toLocaleDateString("es-UY");
  return {
    issuer,
    receiptId: servicio.id.split("-")[0]?.toUpperCase() || servicio.id,
    emissionDate,
    serviceDate,
    cliente: servicio.clienteNombre,
    moto: servicio.moto,
    servicio: servicio.servicio,
    kilometraje: `${servicio.kilometraje.toLocaleString("es-UY")} km`,
    estado: servicio.estado,
    total: formatCurrency(servicio.costo),
  };
}

export async function generateOperationalReceiptPdf(servicio: ServicioRegistro): Promise<void> {
  const { default: JsPdf } = await import("jspdf");
  const model = buildReceiptViewModel(servicio);
  const doc = new JsPdf({ unit: "mm", format: "a4" });

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  doc.setDrawColor(225, 225, 225);
  doc.rect(12, 12, 186, 273);

  const logoData = await loadImageDataUrl("/branding/logo-rayo.png");
  if (logoData) {
    doc.addImage(logoData, "PNG", 18, 18, 14, 14);
  }

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(model.issuer.name, 36, 23);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(85, 85, 85);
  doc.text(`Tel: ${model.issuer.phone}`, 36, 29);
  doc.text(model.issuer.address, 36, 34);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(239, 68, 68);
  doc.text("RECIBO OPERATIVO", 146, 23, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(55, 55, 55);
  doc.text(`Nro: ${model.receiptId}`, 146, 29, { align: "right" });
  doc.text(`Emision: ${model.emissionDate}`, 146, 34, { align: "right" });

  doc.setDrawColor(230, 230, 230);
  doc.line(18, 40, 192, 40);

  doc.setFillColor(248, 248, 248);
  doc.rect(18, 46, 174, 44, "F");
  doc.setDrawColor(234, 234, 234);
  doc.rect(18, 46, 174, 44);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(38, 38, 38);
  doc.text("Cliente", 22, 54);
  doc.text("Vehiculo", 22, 67);
  doc.text("Fecha service", 22, 80);

  doc.setFont("helvetica", "normal");
  doc.text(model.cliente, 54, 54);
  doc.text(model.moto, 54, 67);
  doc.text(model.serviceDate, 54, 80);

  doc.setFont("helvetica", "bold");
  doc.text("Estado", 122, 54);
  doc.text("Kilometraje", 122, 67);
  doc.text("ID operacion", 122, 80);

  doc.setFont("helvetica", "normal");
  doc.text(model.estado, 154, 54);
  doc.text(model.kilometraje, 154, 67);
  doc.text(model.receiptId, 154, 80);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(35, 35, 35);
  doc.text("Concepto", 22, 102);
  doc.text("Importe", 188, 102, { align: "right" });

  doc.setDrawColor(228, 228, 228);
  doc.line(18, 106, 192, 106);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const conceptLines = doc.splitTextToSize(model.servicio, 130);
  doc.text(conceptLines, 22, 114);
  doc.text(model.total, 188, 114, { align: "right" });

  const conceptHeight = Math.max(18, conceptLines.length * 5 + 8);
  const totalY = 114 + conceptHeight;

  doc.setDrawColor(228, 228, 228);
  doc.line(18, totalY - 6, 192, totalY - 6);

  doc.setFillColor(254, 242, 242);
  doc.rect(120, totalY, 72, 14, "F");
  doc.setDrawColor(252, 220, 220);
  doc.rect(120, totalY, 72, 14);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("TOTAL", 126, totalY + 9);
  doc.setTextColor(185, 28, 28);
  doc.text(model.total, 188, totalY + 9, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(115, 115, 115);
  doc.setFontSize(8.5);
  doc.text(
    "Documento operativo no fiscal. Conservar para seguimiento de garantia y mantenimiento.",
    18,
    272
  );

  const fileClient = normalizeFilename(servicio.clienteNombre || "cliente");
  doc.save(`Recibo_${fileClient}_${model.receiptId}.pdf`);
}

export async function generateOrderReceiptPdf(orden: OrdenTaller): Promise<void> {
  const { default: JsPdf } = await import("jspdf");
  const issuer = getIssuerConfig();

  const entryDate = orden.fechaIngreso ? new Date(orden.fechaIngreso).toLocaleDateString("es-UY") : "-";
  const deliveryDate = orden.entregadoAt 
    ? new Date(orden.entregadoAt).toLocaleDateString("es-UY") 
    : orden.updatedAt 
      ? new Date(orden.updatedAt).toLocaleDateString("es-UY") 
      : new Date().toLocaleDateString("es-UY");

  const emissionDate = new Date().toLocaleDateString("es-UY");
  const receiptId = orden.id.split("-")[0]?.toUpperCase() || orden.id;
  const totalVal = orden.costoFinal || orden.costoEstimado || 0;
  const total = formatCurrency(totalVal);

  const doc = new JsPdf({ unit: "mm", format: "a4" });

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  doc.setDrawColor(225, 225, 225);
  doc.rect(12, 12, 186, 273);

  const logoData = await loadImageDataUrl("/branding/logo-rayo.png");
  if (logoData) {
    doc.addImage(logoData, "PNG", 18, 18, 14, 14);
  }

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(issuer.name, 36, 23);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(85, 85, 85);
  doc.text(`Tel: ${issuer.phone}`, 36, 29);
  doc.text(issuer.address, 36, 34);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(239, 68, 68);
  doc.text("ORDEN DE TALLER / RECIBO", 146, 23, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(55, 55, 55);
  doc.text(`Orden Nro: ${receiptId}`, 146, 29, { align: "right" });
  doc.text(`Emisión: ${emissionDate}`, 146, 34, { align: "right" });

  doc.setDrawColor(230, 230, 230);
  doc.line(18, 40, 192, 40);

  // Cliente info box
  doc.setFillColor(248, 248, 248);
  doc.rect(18, 46, 174, 44, "F");
  doc.setDrawColor(234, 234, 234);
  doc.rect(18, 46, 174, 44);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(38, 38, 38);
  doc.text("Cliente", 22, 54);
  doc.text("Vehículo", 22, 67);
  doc.text("Fecha Ingreso", 22, 80);

  doc.setFont("helvetica", "normal");
  doc.text(orden.clienteNombre, 54, 54);
  doc.text(orden.vehiculo || "No registrado", 54, 67);
  doc.text(entryDate, 54, 80);

  doc.setFont("helvetica", "bold");
  doc.text("Estado", 122, 54);
  doc.text("Teléfono", 122, 67);
  doc.text("Fecha Entrega", 122, 80);

  doc.setFont("helvetica", "normal");
  doc.text(orden.estado.toUpperCase(), 154, 54);
  doc.text(orden.telefono, 154, 67);
  doc.text(deliveryDate, 154, 80);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(35, 35, 35);
  doc.text("Trabajo Realizado / Concepto", 22, 102);
  doc.text("Importe", 188, 102, { align: "right" });

  doc.setDrawColor(228, 228, 228);
  doc.line(18, 106, 192, 106);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Concept combines title and description/diagnóstico if present
  let fullConcept = orden.titulo;
  if (orden.descripcion) {
    fullConcept += `\nDescripción: ${orden.descripcion}`;
  }
  if (orden.diagnostico) {
    fullConcept += `\nDiagnóstico: ${orden.diagnostico}`;
  }

  const conceptLines = doc.splitTextToSize(fullConcept, 130);
  doc.text(conceptLines, 22, 114);
  doc.text(total, 188, 114, { align: "right" });

  const conceptHeight = Math.max(18, conceptLines.length * 5 + 8);
  const totalY = 114 + conceptHeight;

  doc.setDrawColor(228, 228, 228);
  doc.line(18, totalY - 6, 192, totalY - 6);

  doc.setFillColor(254, 242, 242);
  doc.rect(120, totalY, 72, 14, "F");
  doc.setDrawColor(252, 220, 220);
  doc.rect(120, totalY, 72, 14);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("TOTAL", 126, totalY + 9);
  doc.setTextColor(185, 28, 28);
  doc.text(total, 188, totalY + 9, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(115, 115, 115);
  doc.setFontSize(8.5);
  doc.text(
    "Documento operativo no fiscal. Conservar para seguimiento de garantía y mantenimiento.",
    18,
    272
  );

  const fileClient = normalizeFilename(orden.clienteNombre || "cliente");
  doc.save(`Recibo_Orden_${fileClient}_${receiptId}.pdf`);
}

