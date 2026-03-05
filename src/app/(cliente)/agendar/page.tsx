"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench,
  Calendar,
  CheckCircle,
  ChevronDown,
  Loader2,
  MessageCircle,
  AlertTriangle,
  PauseCircle,
} from "lucide-react";

const marcas = [
  "Honda",
  "Yamaha",
  "Zanella",
  "Motomel",
  "Suzuki",
  "Kawasaki",
  "Bajaj",
  "Corven",
  "Gilera",
  "Otra",
];

interface FormData {
  nombre: string;
  telefono: string;
  marca: string;
  modelo: string;
  kilometraje: string;
  fecha: string;
  horario: string;
  notas: string;
}

interface AgendaConfigData {
  acceptingBookings: boolean;
  status: "activa" | "pausada" | "deshabilitada";
  pauseReason?: string | null;
  pauseUntil?: string | null;
  timezone: "America/Montevideo";
  slotDurationMinutes: number;
  bookingWindow: { minDaysAhead: number; maxDaysAhead: number };
  supportWhatsapp: string;
}

interface AgendaSlot {
  hora: string;
  available: boolean;
  reason?: "booked" | "blocked" | "outside_window" | "agenda_paused";
  turnoId?: string;
}

interface ApiErrorResponse {
  ok?: boolean;
  error?: {
    message?: string;
  };
}

function addDays(date: Date, days: number): string {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy.toISOString().split("T")[0];
}

function reasonLabel(reason?: AgendaSlot["reason"]) {
  if (reason === "booked") return "ocupado";
  if (reason === "blocked") return "bloqueado";
  if (reason === "outside_window") return "fuera de ventana";
  if (reason === "agenda_paused") return "agenda pausada";
  return "";
}

export default function AgendarPage() {
  const fallbackSupportWhatsapp =
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER || "59899123456";

  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    telefono: "",
    marca: "",
    modelo: "",
    kilometraje: "",
    fecha: "",
    horario: "",
    notas: "",
  });

  const [agendaConfig, setAgendaConfig] = useState<AgendaConfigData | null>(null);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [agendaError, setAgendaError] = useState("");

  const [slots, setSlots] = useState<AgendaSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");

  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const supportWhatsapp = agendaConfig?.supportWhatsapp || fallbackSupportWhatsapp;

  const minDate = useMemo(() => {
    const today = new Date();
    return addDays(today, agendaConfig?.bookingWindow.minDaysAhead ?? 1);
  }, [agendaConfig?.bookingWindow.minDaysAhead]);

  const maxDate = useMemo(() => {
    const today = new Date();
    return addDays(today, agendaConfig?.bookingWindow.maxDaysAhead ?? 30);
  }, [agendaConfig?.bookingWindow.maxDaysAhead]);

  useEffect(() => {
    const loadConfig = async () => {
      setAgendaLoading(true);
      setAgendaError("");
      try {
        const response = await fetch("/api/agenda/config", { cache: "no-store" });
        const json = (await response.json()) as
          | { ok: true; data: AgendaConfigData }
          | ApiErrorResponse;

        if (!response.ok || ("ok" in json && json.ok === false) || !("data" in json)) {
          throw new Error(
            "error" in json
              ? json.error?.message || "No se pudo cargar agenda"
              : "No se pudo cargar agenda"
          );
        }

        setAgendaConfig(json.data);
        setFormData((prev) => ({
          ...prev,
          fecha: prev.fecha || addDays(new Date(), json.data.bookingWindow.minDaysAhead),
        }));
      } catch (loadError) {
        setAgendaError(loadError instanceof Error ? loadError.message : "No se pudo cargar agenda");
      } finally {
        setAgendaLoading(false);
      }
    };

    void loadConfig();
  }, []);

  useEffect(() => {
    const fecha = formData.fecha;
    if (!fecha || !agendaConfig) {
      setSlots([]);
      return;
    }

    const loadSlots = async () => {
      setSlotsLoading(true);
      setSlotsError("");
      try {
        const response = await fetch(`/api/agenda/disponibilidad?fecha=${fecha}`, {
          cache: "no-store",
        });
        const json = (await response.json()) as
          | { ok: true; data: { fecha: string; slots: AgendaSlot[] } }
          | ApiErrorResponse;

        if (!response.ok || ("ok" in json && json.ok === false) || !("data" in json)) {
          throw new Error(
            "error" in json
              ? json.error?.message || "No se pudo cargar disponibilidad"
              : "No se pudo cargar disponibilidad"
          );
        }

        setSlots(json.data.slots);
      } catch (loadError) {
        setSlotsError(
          loadError instanceof Error ? loadError.message : "No se pudo cargar disponibilidad"
        );
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };

    void loadSlots();
  }, [formData.fecha, agendaConfig]);

  useEffect(() => {
    if (!formData.horario) return;
    const selected = slots.find((slot) => slot.hora === formData.horario);
    if (!selected || !selected.available) {
      setFormData((prev) => ({ ...prev, horario: "" }));
    }
  }, [slots, formData.horario]);

  const availableSlots = useMemo(() => slots.filter((slot) => slot.available), [slots]);
  const canBook = Boolean(
    agendaConfig &&
      agendaConfig.acceptingBookings &&
      formData.horario &&
      availableSlots.some((slot) => slot.hora === formData.horario)
  );

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "fecha" ? { horario: "" } : {}),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");

    try {
      if (!agendaConfig?.acceptingBookings) {
        throw new Error(
          agendaConfig?.pauseReason
            ? `Agenda pausada: ${agendaConfig.pauseReason}`
            : "La agenda no está disponible en este momento"
        );
      }
      if (!canBook) {
        throw new Error("Seleccioná un horario disponible");
      }

      const response = await fetch("/api/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = (await response.json()) as ApiErrorResponse;
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error?.message || "No se pudo reservar el turno");
      }

      setEnviado(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo reservar el turno");
    } finally {
      setCargando(false);
    }
  };

  const generarWhatsAppUrl = () => {
    const fechaFormateada = formData.fecha
      ? new Date(formData.fecha + "T12:00:00").toLocaleDateString("es-UY", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : "";
    const mensaje = encodeURIComponent(
      `Hola Fede Motos 🏍️\n\nReservé un turno desde la app:\n\n` +
        `👤 ${formData.nombre}\n` +
        `📱 ${formData.telefono}\n` +
        `🏍️ ${formData.marca} ${formData.modelo}\n` +
        `📏 ${Number(formData.kilometraje).toLocaleString()} km\n` +
        `📅 ${fechaFormateada} a las ${formData.horario} hs\n` +
        (formData.notas ? `📝 ${formData.notas}\n` : "") +
        `\n¡Espero confirmación!`
    );
    return `https://wa.me/${supportWhatsapp}?text=${mensaje}`;
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.06),transparent_50%)]" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-lg mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-fede-accent/10 border border-fede-accent/20 text-fede-accent text-xs font-medium mb-4">
            <Calendar className="w-3.5 h-3.5" />
            Reserva online
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Agendá tu <span className="text-fede-accent">service</span>
          </h1>
          <p className="text-fede-muted text-sm">
            Elegí un horario disponible y te confirmamos por WhatsApp.
          </p>
        </motion.div>
      </section>

      <section className="px-4 pb-12 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {!enviado ? (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={handleSubmit}
              className="glass-card p-6 space-y-5"
            >
              {agendaLoading ? (
                <div className="rounded-xl border border-fede-border px-3 py-2 text-xs text-fede-muted inline-flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Cargando disponibilidad de agenda...
                </div>
              ) : null}

              {agendaError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 inline-flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {agendaError}
                </div>
              )}

              {agendaConfig && !agendaConfig.acceptingBookings && (
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-3 text-xs text-yellow-200 space-y-2">
                  <p className="inline-flex items-center gap-2">
                    <PauseCircle className="w-4 h-4" />
                    Agenda pausada temporalmente
                  </p>
                  {agendaConfig.pauseReason ? <p>{agendaConfig.pauseReason}</p> : null}
                  <a
                    href={`https://wa.me/${supportWhatsapp}?text=${encodeURIComponent(
                      "Hola Fede Motos, quiero coordinar un turno de service."
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline text-[11px] px-2 py-1 inline-flex items-center gap-1"
                  >
                    <MessageCircle className="w-3 h-3" />
                    Consultar por WhatsApp
                  </a>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-fede-muted mb-1.5 block">Tu nombre</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez"
                  value={formData.nombre}
                  onChange={(e) => handleChange("nombre", e.target.value)}
                  className="input-dark"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  placeholder="099 123 456"
                  value={formData.telefono}
                  onChange={(e) => handleChange("telefono", e.target.value)}
                  className="input-dark"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-fede-muted mb-1.5 block">Marca</label>
                  <div className="relative">
                    <select
                      required
                      value={formData.marca}
                      onChange={(e) => handleChange("marca", e.target.value)}
                      className="input-dark appearance-none pr-8"
                    >
                      <option value="">Seleccioná</option>
                      {marcas.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fede-muted pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-fede-muted mb-1.5 block">Modelo</label>
                  <input
                    type="text"
                    required
                    placeholder="CG 150 Titan"
                    value={formData.modelo}
                    onChange={(e) => handleChange("modelo", e.target.value)}
                    className="input-dark"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                  Kilometraje actual
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ej: 12500"
                  value={formData.kilometraje}
                  onChange={(e) => handleChange("kilometraje", e.target.value)}
                  className="input-dark"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-fede-muted mb-1.5 block">Fecha</label>
                  <input
                    type="date"
                    required
                    min={minDate}
                    max={maxDate}
                    value={formData.fecha}
                    onChange={(e) => handleChange("fecha", e.target.value)}
                    className="input-dark"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-fede-muted mb-1.5 block">Horario</label>
                  <div className="relative">
                    <select
                      required
                      value={formData.horario}
                      onChange={(e) => handleChange("horario", e.target.value)}
                      className="input-dark appearance-none pr-8"
                      disabled={slotsLoading || !agendaConfig?.acceptingBookings}
                    >
                      <option value="">
                        {slotsLoading ? "Cargando..." : "Elegí horario"}
                      </option>
                      {slots.map((slot) => (
                        <option
                          key={slot.hora}
                          value={slot.hora}
                          disabled={!slot.available}
                        >
                          {slot.available
                            ? slot.hora
                            : `${slot.hora} - ${reasonLabel(slot.reason)}`}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fede-muted pointer-events-none" />
                  </div>
                </div>
              </div>

              {slotsError && (
                <p className="text-xs text-yellow-200 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
                  {slotsError}
                </p>
              )}

              <div>
                <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  placeholder="Ej: Hace un ruido raro al frenar..."
                  rows={3}
                  value={formData.notas}
                  onChange={(e) => handleChange("notas", e.target.value)}
                  className="input-dark resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={cargando || !canBook}
                className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cargando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Reservando...
                  </>
                ) : (
                  <>
                    <Wrench className="w-5 h-5" />
                    Reservar turno
                  </>
                )}
              </button>

              {error && (
                <p className="text-sm rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300">
                  {error}
                </p>
              )}
            </motion.form>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
              >
                <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
              </motion.div>

              <h2 className="text-2xl font-bold mb-2">Turno reservado</h2>
              <p className="text-fede-muted text-sm mb-6">
                Te confirmamos por WhatsApp al{" "}
                <span className="text-white font-medium">{formData.telefono}</span>
              </p>

              <div className="glass-card p-4 text-left space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-fede-muted">Moto</span>
                  <span className="font-medium">
                    {formData.marca} {formData.modelo}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fede-muted">Kilometraje</span>
                  <span className="font-medium">
                    {Number(formData.kilometraje).toLocaleString()} km
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fede-muted">Fecha</span>
                  <span className="font-medium">
                    {new Date(formData.fecha + "T12:00:00").toLocaleDateString("es-UY", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fede-muted">Horario</span>
                  <span className="font-medium">{formData.horario} hs</span>
                </div>
              </div>

              <a
                href={generarWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 mb-4"
              >
                <MessageCircle className="w-5 h-5" />
                Confirmar por WhatsApp
              </a>

              <button
                onClick={() => {
                  setEnviado(false);
                  setFormData({
                    nombre: "",
                    telefono: "",
                    marca: "",
                    modelo: "",
                    kilometraje: "",
                    fecha: minDate,
                    horario: "",
                    notas: "",
                  });
                }}
                className="btn-outline text-sm"
              >
                Reservar otro turno
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

