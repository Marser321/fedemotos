"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Printer, Download, Receipt, Wrench, Calendar, ClipboardList } from "lucide-react";
import type { ServicioRegistro, OrdenTaller } from "@/lib/types";
import { generateOperationalReceiptPdf } from "@/lib/invoice/receipt";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  servicio?: ServicioRegistro | null;
  orden?: OrdenTaller | null;
}

export function ReceiptModal({ isOpen, onClose, servicio, orden }: ReceiptModalProps) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const handleDownloadPdf = async () => {
    setCargando(true);
    setError("");
    try {
      if (servicio) {
        await generateOperationalReceiptPdf(servicio);
      } else if (orden) {
        // Dinámicamente importamos generateOrderReceiptPdf para evitar problemas de dependencias circulares o cargas iniciales pesadas
        const { generateOrderReceiptPdf } = await import("@/lib/invoice/receipt");
        await generateOrderReceiptPdf(orden);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al descargar el PDF");
    } finally {
      setCargando(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || (!servicio && !orden)) return null;

  // Extraemos variables comunes
  const isOrden = Boolean(orden);
  const id = orden ? (orden.id.split("-")[0]?.toUpperCase() || orden.id) : (servicio?.id.split("-")[0]?.toUpperCase() || "");
  const clienteNombre = orden ? orden.clienteNombre : (servicio?.clienteNombre ?? "");
  const telefono = orden ? orden.telefono : "";
  const moto = orden ? (orden.vehiculo || "No registrada") : (servicio?.moto ?? "No registrada");
  const servicioDetalle = orden ? orden.titulo : (servicio?.servicio ?? "");
  const kilometraje = orden ? "" : (servicio?.kilometraje ? `${servicio.kilometraje.toLocaleString("es-UY")} km` : "—");
  const costo = orden ? (orden.costoFinal || orden.costoEstimado || 0) : (servicio?.costo ?? 0);
  const estado = orden ? orden.estado : (servicio?.estado ?? "completado");

  // Fechas
  const fechaIngreso = orden 
    ? (orden.fechaIngreso ? new Date(orden.fechaIngreso).toLocaleDateString("es-UY") : "—") 
    : (servicio?.fecha ? new Date(servicio.fecha).toLocaleDateString("es-UY") : "—");

  const fechaEntrega = orden 
    ? (orden.entregadoAt 
        ? new Date(orden.entregadoAt).toLocaleDateString("es-UY") 
        : orden.updatedAt 
          ? new Date(orden.updatedAt).toLocaleDateString("es-UY") 
          : new Date().toLocaleDateString("es-UY"))
    : (servicio?.fecha ? new Date(servicio.fecha).toLocaleDateString("es-UY") : "—");

  // Descripción adicional para órdenes
  const descripcionAdicional = orden ? (orden.descripcion || "") : "";
  const diagnosticoTecnico = orden ? (orden.diagnostico || "") : "";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto print:absolute print:inset-0 print:p-0"
        >
          {/* Overlay (oculto en impresión) */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm print:hidden" onClick={onClose} />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative z-10 w-full max-w-2xl bg-zinc-900/95 border border-zinc-700/80 rounded-xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh] print:border-none print:shadow-none print:p-0 print:bg-white print:w-full print:max-h-full print:relative print:z-0"
          >
            {/* Embedded styles para control de impresión */}
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                .print-area, .print-area * {
                  visibility: visible;
                }
                .print-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 190mm;
                  color: #000000 !important;
                  background-color: #ffffff !important;
                }
                .print-bg-gray {
                  background-color: #f4f4f5 !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .print-border {
                  border: 1px solid #e4e4e7 !important;
                }
                .print-text-dark {
                  color: #18181b !important;
                }
                .print-text-muted {
                  color: #71717a !important;
                }
                .print-brand-red {
                  color: #AC1C1D !important;
                }
                .print-brand-bg-red {
                  background-color: #fef2f2 !important;
                  border: 1px solid #fca5a5 !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            `}</style>

            {/* Acciones del Modal (Ocultas en impresión) */}
            <header className="flex items-center justify-between border-b border-zinc-700/80 pb-4 mb-4 print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-fede-accent" />
                <h3 className="font-bold text-white text-base">Comprobante de Servicio</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="btn-outline flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                  title="Imprimir"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </button>
                <button
                  onClick={handleDownloadPdf}
                  disabled={cargando}
                  className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                  title="Descargar PDF"
                >
                  {cargando ? (
                    <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {cargando ? "Cargando..." : "Descargar"}
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Print Area */}
            <div className="print-area flex-1 overflow-y-auto pr-1 text-zinc-300 font-poppins text-sm leading-relaxed space-y-5">
              {/* Header de la Factura (Logo & Datos del Taller) */}
              <div className="flex justify-between items-start border-b border-zinc-800/80 pb-4 print:border-zinc-200">
                <div className="flex items-center gap-3">
                  <img
                    src="/branding/logo-rayo.png"
                    alt="Fede Moto Servicio"
                    className="w-12 h-12 object-contain"
                  />
                  <div>
                    <h2 className="text-lg font-bold text-white print:text-black">FEDE MOTO SERVICIO</h2>
                    <p className="text-xs text-zinc-400 print:text-zinc-500">Mantenimiento y Auxilio Mecánico</p>
                    <p className="text-xs text-zinc-500 print:text-zinc-400">Tel: +598 99 123 456 · Montevideo</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-0.5 rounded-full border border-fede-accent/20 bg-fede-accent/10 text-[10px] uppercase font-bold text-fede-accent tracking-wider print:border-red-200 print:bg-red-50">
                    RECIBO OPERATIVO
                  </span>
                  <p className="text-xs text-zinc-400 mt-2 print:text-zinc-500">
                    Nro: <span className="font-semibold text-white print:text-black">{id}</span>
                  </p>
                  <p className="text-[11px] text-zinc-500 print:text-zinc-400">
                    Emisión: {new Date().toLocaleDateString("es-UY")}
                  </p>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 print:hidden">
                  {error}
                </div>
              )}

              {/* Bloque de Información de Cliente, Vehículo y Fechas */}
              <div className="grid gap-3 sm:grid-cols-2 bg-zinc-800/40 border border-zinc-800 rounded-lg p-4 print:bg-zinc-50 print:border-zinc-200 print:bg-gray print:print-bg-gray print:print-border">
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider print:text-zinc-400">Cliente</p>
                    <p className="font-semibold text-white print:text-zinc-900">{clienteNombre}</p>
                    {telefono && <p className="text-xs text-zinc-400 print:text-zinc-500">{telefono}</p>}
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider print:text-zinc-400">Vehículo</p>
                    <p className="font-medium text-white print:text-zinc-900">{moto}</p>
                    {kilometraje && kilometraje !== "—" && (
                      <p className="text-xs text-zinc-400 print:text-zinc-500">Kilometraje: {kilometraje}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider print:text-zinc-400">Fecha Ingreso</p>
                    <p className="font-medium text-zinc-300 print:text-zinc-900">{fechaIngreso}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider print:text-zinc-400">Fecha Entrega / Cierre</p>
                    <p className="font-medium text-zinc-300 print:text-zinc-900">{fechaEntrega}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider print:text-zinc-400">Estado de Orden</p>
                    <span className="text-xs font-semibold uppercase text-emerald-400 print:text-emerald-600">
                      {estado.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detalle del Concepto/Servicios */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-white print:text-zinc-900 border-b border-zinc-800 pb-1 print:border-zinc-200">
                  DESGLOSE DE SERVICIOS
                </h4>
                <div className="rounded-lg border border-zinc-800 overflow-hidden print:border-zinc-200">
                  <div className="bg-zinc-850 px-4 py-2 flex justify-between font-semibold text-xs text-zinc-400 print:bg-zinc-100 print:text-zinc-700 print:print-bg-gray">
                    <span>Concepto</span>
                    <span>Total</span>
                  </div>
                  <div className="divide-y divide-zinc-850 bg-zinc-900/20 px-4 py-3 space-y-3 print:divide-zinc-200">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-white print:text-zinc-900">{servicioDetalle}</p>
                        {descripcionAdicional && (
                          <p className="text-xs text-zinc-400 print:text-zinc-500 whitespace-pre-wrap">
                            {descripcionAdicional}
                          </p>
                        )}
                        {diagnosticoTecnico && (
                          <div className="mt-2 text-xs border-l-2 border-fede-accent/40 pl-2 bg-fede-accent/5 py-1 rounded print:border-red-400 print:bg-red-50/50 print:print-brand-bg-red">
                            <span className="font-semibold text-fede-accent block print:print-brand-red">Diagnóstico Técnico:</span>
                            <span className="text-zinc-300 print:text-zinc-700">{diagnosticoTecnico}</span>
                          </div>
                        )}
                      </div>
                      <span className="font-semibold text-white print:text-zinc-900">
                        $ {costo.toLocaleString("es-UY")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloque Total */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-72 rounded-lg border border-red-500/35 bg-fede-accent/5 p-4 flex items-center justify-between shadow-[0_4px_24px_rgba(172,28,29,0.1)] print:border-red-300 print:bg-red-50/50 print:print-brand-bg-red">
                  <span className="text-sm font-bold text-white print:text-zinc-900">TOTAL NETO</span>
                  <span className="text-lg font-bold text-fede-accent print:print-brand-red">
                    $ {costo.toLocaleString("es-UY")}
                  </span>
                </div>
              </div>

              {/* Términos & Garantía */}
              <div className="border-t border-zinc-800/80 pt-4 text-[10px] text-zinc-500 space-y-1 print:border-zinc-200 print:text-zinc-500 leading-normal">
                <p className="font-semibold uppercase print:text-zinc-700">Garantía & Condiciones Operativas</p>
                <p>
                  * Los servicios mecánicos cuentan con una garantía de 30 días en mano de obra a partir de la fecha de entrega.
                </p>
                <p>
                  * Los repuestos e insumos instalados conservan la garantía provista por su fabricante/distribuidor.
                </p>
                <p className="italic pt-2">
                  Documento operativo de uso interno y control técnico del taller. No posee valor como factura fiscal.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
