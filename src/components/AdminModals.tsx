"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  UserPlus,
  Wrench,
  Edit3,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import type { ClienteOperacionPrefill, Suscriptor } from "@/lib/types";
import { MapView } from "@/components/MapView";

interface ApiErrorResponse {
  ok?: boolean;
  error?: {
    message?: string;
  };
}

interface ClienteLookupResponse {
  ok: true;
  found: boolean;
  data?: {
    clienteId: string;
    nombre: string;
    telefono: string;
    email: string;
    vehiculos: Array<{ id: string; marca: string; modelo: string; label: string }>;
  };
}

async function assertApiOk(response: Response) {
  const data = (await response.json()) as ApiErrorResponse;
  if (!response.ok || data.ok === false) {
    throw new Error(data.error?.message || "No se pudo completar la acción");
  }
}

function ModalBase({
  isOpen,
  onClose,
  title,
  maxWidthClass = "max-w-md",
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`relative glass-card p-6 w-full ${maxWidthClass} max-h-[85vh] overflow-y-auto z-10`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">{title}</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 text-fede-muted hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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

export function NuevaMembresiaModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
    marca: "",
    modelo: "",
    plan: "basico" as "basico" | "premium",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      const response = await fetch("/api/suscripciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      await assertApiOk(response);
      await onSuccess();
      setForm({
        nombre: "",
        telefono: "",
        email: "",
        marca: "",
        modelo: "",
        plan: "basico",
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la membresía");
    } finally {
      setCargando(false);
    }
  };

  return (
    <ModalBase isOpen={isOpen} onClose={onClose} title="Nueva Membresía">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-fede-muted mb-1.5 block">
            Nombre completo
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Juan Pérez"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="input-dark"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-fede-muted mb-1.5 block">Teléfono</label>
            <input
              type="tel"
              required
              placeholder="099 123 456"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="input-dark"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-fede-muted mb-1.5 block">Email</label>
            <input
              type="email"
              required
              placeholder="email@ej.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-dark"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-fede-muted mb-1.5 block">Marca</label>
            <div className="relative">
              <select
                required
                value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
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
              value={form.modelo}
              onChange={(e) => setForm({ ...form, modelo: e.target.value })}
              className="input-dark"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-fede-muted mb-1.5 block">Plan</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, plan: "basico" })}
              className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                form.plan === "basico"
                  ? "border-fede-accent bg-fede-accent/10 text-fede-accent"
                  : "border-fede-border text-fede-muted hover:border-white/30"
              }`}
            >
              Básico - $990/mes
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, plan: "premium" })}
              className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                form.plan === "premium"
                  ? "border-fede-accent bg-fede-accent/10 text-fede-accent"
                  : "border-fede-border text-fede-muted hover:border-white/30"
              }`}
            >
              Premium - $1.990/mes
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300">
            {error}
          </p>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          type="submit"
          disabled={cargando}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          {cargando ? "Guardando..." : "Agregar Membresía"}
        </motion.button>
      </form>
    </ModalBase>
  );
}

export function CargarServicioModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    clienteNombre: "",
    telefono: "",
    marca: "",
    modelo: "",
    servicio: "",
    costo: 0,
    kilometraje: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      const response = await fetch("/api/servicios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      await assertApiOk(response);
      await onSuccess();
      setForm({
        clienteNombre: "",
        telefono: "",
        marca: "",
        modelo: "",
        servicio: "",
        costo: 0,
        kilometraje: 0,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el servicio");
    } finally {
      setCargando(false);
    }
  };

  return (
    <ModalBase isOpen={isOpen} onClose={onClose} title="Cargar Servicio">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-fede-muted mb-1.5 block">
              Nombre del cliente
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Martín Rodríguez"
              value={form.clienteNombre}
              onChange={(e) => setForm({ ...form, clienteNombre: e.target.value })}
              className="input-dark"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-fede-muted mb-1.5 block">Teléfono</label>
            <input
              type="tel"
              required
              placeholder="099 123 456"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="input-dark"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-fede-muted mb-1.5 block">Marca</label>
            <div className="relative">
              <select
                required
                value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
                className="input-dark appearance-none pr-8"
              >
                <option value="">Marca</option>
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
              placeholder="CG 150"
              value={form.modelo}
              onChange={(e) => setForm({ ...form, modelo: e.target.value })}
              className="input-dark"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-fede-muted mb-1.5 block">
            Servicio realizado
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Cambio de aceite + filtro"
            value={form.servicio}
            onChange={(e) => setForm({ ...form, servicio: e.target.value })}
            className="input-dark"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-fede-muted mb-1.5 block">Costo ($)</label>
            <input
              type="number"
              required
              min={0}
              placeholder="2800"
              value={form.costo || ""}
              onChange={(e) => setForm({ ...form, costo: Number(e.target.value) })}
              className="input-dark"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-fede-muted mb-1.5 block">
              Kilometraje
            </label>
            <input
              type="number"
              min={0}
              placeholder="12500"
              value={form.kilometraje || ""}
              onChange={(e) => setForm({ ...form, kilometraje: Number(e.target.value) })}
              className="input-dark"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300">
            {error}
          </p>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          type="submit"
          disabled={cargando}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
          {cargando ? "Guardando..." : "Registrar Servicio"}
        </motion.button>
      </form>
    </ModalBase>
  );
}

type SuscriptorEditable = Suscriptor;

export function EditarSuscriptorModal({
  isOpen,
  onClose,
  onSuccess,
  suscriptor,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
  suscriptor: SuscriptorEditable | null;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
    plan: "basico" as "basico" | "premium",
    estado: "pendiente" as "activo" | "pendiente" | "inactivo",
  });

  useEffect(() => {
    if (!isOpen || !suscriptor) return;
    setForm({
      nombre: suscriptor.nombre,
      telefono: suscriptor.telefono,
      email: suscriptor.email,
      plan: suscriptor.plan,
      estado: suscriptor.estado,
    });
    setError("");
  }, [isOpen, suscriptor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suscriptor) return;
    setCargando(true);
    setError("");
    try {
      const response = await fetch("/api/suscripciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: suscriptor.id, _action: "edit" }),
      });
      await assertApiOk(response);
      await onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo editar el suscriptor");
    } finally {
      setCargando(false);
    }
  };

  return (
    <ModalBase isOpen={isOpen} onClose={onClose} title="Editar Suscriptor">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-fede-muted mb-1.5 block">Nombre</label>
          <input
            type="text"
            required
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="input-dark"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-fede-muted mb-1.5 block">Teléfono</label>
            <input
              type="tel"
              required
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="input-dark"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-fede-muted mb-1.5 block">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-dark"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-fede-muted mb-1.5 block">Plan</label>
          <div className="grid grid-cols-2 gap-2">
            {(["basico", "premium"] as const).map((plan) => (
              <button
                key={plan}
                type="button"
                onClick={() => setForm({ ...form, plan })}
                className={`py-2 rounded-xl border text-xs font-medium transition-all capitalize ${
                  form.plan === plan
                    ? "border-fede-accent bg-fede-accent/10 text-fede-accent"
                    : "border-fede-border text-fede-muted hover:border-white/30"
                }`}
              >
                {plan}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-fede-muted mb-1.5 block">Estado</label>
          <div className="grid grid-cols-3 gap-2">
            {(["activo", "pendiente", "inactivo"] as const).map((est) => (
              <button
                key={est}
                type="button"
                onClick={() => setForm({ ...form, estado: est })}
                className={`py-2 rounded-xl border text-xs font-medium transition-all capitalize ${
                  form.estado === est
                    ? est === "activo"
                      ? "border-green-500 bg-green-500/10 text-green-400"
                      : est === "pendiente"
                      ? "border-yellow-500 bg-yellow-500/10 text-yellow-400"
                      : "border-red-500 bg-red-500/10 text-red-400"
                    : "border-fede-border text-fede-muted hover:border-white/30"
                }`}
              >
                {est}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300">
            {error}
          </p>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          type="submit"
          disabled={cargando}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
          {cargando ? "Guardando..." : "Guardar Cambios"}
        </motion.button>
      </form>
    </ModalBase>
  );
}

export function NuevaOperacionModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [lookupState, setLookupState] = useState<
    "idle" | "loading" | "found" | "not_found" | "error"
  >("idle");
  const [lookupError, setLookupError] = useState("");
  const [clientePrefill, setClientePrefill] = useState<ClienteOperacionPrefill>({
    found: false,
  });
  const [vehiculoMode, setVehiculoMode] = useState<"existente" | "nuevo">("nuevo");
  const [vehiculoSeleccionadoId, setVehiculoSeleccionadoId] = useState("");

  const [form, setForm] = useState({
    tipo: "auxilio" as "auxilio" | "traslado",
    prioridad: "media" as "baja" | "media" | "alta" | "urgente",
    clienteNombre: "",
    clienteTelefono: "",
    clienteEmail: "",
    marca: "",
    modelo: "",
    origenLat: "",
    origenLng: "",
    origenReferencia: "",
    destinoLat: "",
    destinoLng: "",
    destinoReferencia: "",
    motivo: "",
    notasInternas: "",
  });

  const vehiculosLookup = useMemo(() => clientePrefill.vehiculos ?? [], [clientePrefill.vehiculos]);
  const selectedVehiculo = useMemo(
    () => vehiculosLookup.find((item) => item.id === vehiculoSeleccionadoId) ?? null,
    [vehiculosLookup, vehiculoSeleccionadoId]
  );

  useEffect(() => {
    if (!isOpen) {
      setLookupState("idle");
      setLookupError("");
      setClientePrefill({ found: false });
      setVehiculoMode("nuevo");
      setVehiculoSeleccionadoId("");
      return;
    }

    const phone = form.clienteTelefono.trim();
    if (phone.length < 6) {
      setLookupState("idle");
      setLookupError("");
      setClientePrefill({ found: false });
      setVehiculoMode("nuevo");
      setVehiculoSeleccionadoId("");
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLookupState("loading");
      setLookupError("");
      try {
        const response = await fetch(
          `/api/admin/clientes/lookup?telefono=${encodeURIComponent(phone)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );
        const json = (await response.json()) as ClienteLookupResponse | ApiErrorResponse;
        if (!response.ok || ("ok" in json && json.ok === false)) {
          throw new Error(
            "error" in json ? json.error?.message || "No se pudo buscar el cliente" : "No se pudo buscar el cliente"
          );
        }
        if (!("found" in json) || !json.found || !json.data) {
          setLookupState("not_found");
          setClientePrefill({ found: false });
          setVehiculoMode("nuevo");
          setVehiculoSeleccionadoId("");
          return;
        }

        const prefill: ClienteOperacionPrefill = {
          found: true,
          clienteId: json.data.clienteId,
          nombre: json.data.nombre,
          telefono: json.data.telefono,
          email: json.data.email,
          vehiculos: json.data.vehiculos,
        };
        setLookupState("found");
        setClientePrefill(prefill);

        const firstVehiculo = json.data.vehiculos[0];
        setForm((prev) => ({
          ...prev,
          clienteNombre: json.data?.nombre || prev.clienteNombre,
          clienteEmail: json.data?.email || "",
          marca: firstVehiculo?.marca || prev.marca,
          modelo: firstVehiculo?.modelo || prev.modelo,
        }));

        if (json.data.vehiculos.length > 0) {
          setVehiculoMode("existente");
          setVehiculoSeleccionadoId(json.data.vehiculos[0].id);
        } else {
          setVehiculoMode("nuevo");
          setVehiculoSeleccionadoId("");
        }
      } catch (lookupErr) {
        if (controller.signal.aborted) return;
        setLookupState("error");
        setLookupError(
          lookupErr instanceof Error ? lookupErr.message : "No se pudo buscar el cliente"
        );
      }
    }, 400);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [form.clienteTelefono, isOpen]);

  const baseCenter: [number, number] = [-34.8833, -56.1667];
  const originLat = Number(form.origenLat);
  const originLng = Number(form.origenLng);
  const origenCenter: [number, number] = [
    Number.isFinite(originLat) ? originLat : baseCenter[0],
    Number.isFinite(originLng) ? originLng : baseCenter[1],
  ];

  const destinationLat = Number(form.destinoLat);
  const destinationLng = Number(form.destinoLng);
  const destinoCenter: [number, number] = [
    Number.isFinite(destinationLat) ? destinationLat : origenCenter[0],
    Number.isFinite(destinationLng) ? destinationLng : origenCenter[1],
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");

    try {
      const payload = {
        tipo: form.tipo,
        prioridad: form.prioridad,
        cliente: {
          nombre: form.clienteNombre,
          telefono: form.clienteTelefono,
          email: form.clienteEmail || undefined,
        },
        vehiculo:
          vehiculoMode === "existente" && vehiculoSeleccionadoId
            ? {
                id: vehiculoSeleccionadoId,
              }
            : {
                marca: form.marca,
                modelo: form.modelo,
              },
        origen: {
          lat: Number(form.origenLat),
          lng: Number(form.origenLng),
          referencia: form.origenReferencia || undefined,
        },
        destino:
          form.tipo === "traslado"
            ? {
                lat: Number(form.destinoLat),
                lng: Number(form.destinoLng),
                referencia: form.destinoReferencia || undefined,
              }
            : undefined,
        motivo: form.motivo,
        notasInternas: form.notasInternas || undefined,
      };

      const response = await fetch("/api/admin/auxilios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await assertApiOk(response);
      await onSuccess();
      onClose();
      setForm({
        tipo: "auxilio",
        prioridad: "media",
        clienteNombre: "",
        clienteTelefono: "",
        clienteEmail: "",
        marca: "",
        modelo: "",
        origenLat: "",
        origenLng: "",
        origenReferencia: "",
        destinoLat: "",
        destinoLng: "",
        destinoReferencia: "",
        motivo: "",
        notasInternas: "",
      });
      setLookupState("idle");
      setLookupError("");
      setClientePrefill({ found: false });
      setVehiculoMode("nuevo");
      setVehiculoSeleccionadoId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la solicitud");
    } finally {
      setCargando(false);
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Solicitud Operativa"
      maxWidthClass="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-fede-muted mb-1.5 block">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(["auxilio", "traslado"] as const).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setForm({ ...form, tipo })}
                  className={`py-2 rounded-xl border text-xs font-medium transition-all capitalize ${
                    form.tipo === tipo
                      ? "border-fede-accent bg-fede-accent/10 text-fede-accent"
                      : "border-fede-border text-fede-muted hover:border-white/30"
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-fede-muted mb-1.5 block">
              Prioridad
            </label>
            <select
              value={form.prioridad}
              onChange={(e) =>
                setForm({
                  ...form,
                  prioridad: e.target.value as "baja" | "media" | "alta" | "urgente",
                })
              }
              className="input-dark"
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-fede-muted mb-1.5 block">Cliente</label>
            <input
              required
              value={form.clienteNombre}
              onChange={(e) => setForm({ ...form, clienteNombre: e.target.value })}
              className="input-dark"
              placeholder="Nombre completo"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-fede-muted mb-1.5 block">Teléfono</label>
            <input
              required
              value={form.clienteTelefono}
              onChange={(e) => setForm({ ...form, clienteTelefono: e.target.value })}
              className="input-dark"
              placeholder="099 123 456"
            />
            <p className="text-xs text-fede-muted mt-1">
              {lookupState === "loading" && "Buscando cliente..."}
              {lookupState === "found" && "Cliente encontrado. Datos autocargados."}
              {lookupState === "not_found" && "No existe cliente previo con ese teléfono."}
              {lookupState === "error" && lookupError}
              {lookupState === "idle" && "Ingresá teléfono para autocompletar datos."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={form.clienteEmail}
            onChange={(e) => setForm({ ...form, clienteEmail: e.target.value })}
            className="input-dark col-span-3"
            placeholder="Email (opcional)"
            type="email"
          />

          {vehiculosLookup.length > 0 && (
            <div className="col-span-3 rounded-xl border border-fede-border p-3 space-y-2">
              <p className="text-xs text-fede-muted">Vehículo</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVehiculoMode("existente")}
                  className={`py-2 rounded-xl border text-xs font-medium transition-all ${
                    vehiculoMode === "existente"
                      ? "border-fede-accent bg-fede-accent/10 text-fede-accent"
                      : "border-fede-border text-fede-muted hover:border-white/30"
                  }`}
                >
                  Usar existente
                </button>
                <button
                  type="button"
                  onClick={() => setVehiculoMode("nuevo")}
                  className={`py-2 rounded-xl border text-xs font-medium transition-all ${
                    vehiculoMode === "nuevo"
                      ? "border-fede-accent bg-fede-accent/10 text-fede-accent"
                      : "border-fede-border text-fede-muted hover:border-white/30"
                  }`}
                >
                  Crear nuevo
                </button>
              </div>
            </div>
          )}

          {vehiculoMode === "existente" && vehiculosLookup.length > 0 ? (
            <div className="col-span-3 space-y-2">
              <select
                className="input-dark"
                value={vehiculoSeleccionadoId}
                onChange={(e) => {
                  const id = e.target.value;
                  setVehiculoSeleccionadoId(id);
                  const selected = vehiculosLookup.find((item) => item.id === id);
                  if (selected) {
                    setForm((prev) => ({
                      ...prev,
                      marca: selected.marca,
                      modelo: selected.modelo,
                    }));
                  }
                }}
              >
                {vehiculosLookup.map((vehiculo) => (
                  <option key={vehiculo.id} value={vehiculo.id}>
                    {vehiculo.label}
                  </option>
                ))}
              </select>
              {selectedVehiculo && (
                <p className="text-xs text-fede-muted">
                  Seleccionado: {selectedVehiculo.marca} {selectedVehiculo.modelo}
                </p>
              )}
            </div>
          ) : (
            <>
              <input
                required
                value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
                className="input-dark"
                placeholder="Marca"
              />
              <input
                required
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                className="input-dark md:col-span-2"
                placeholder="Modelo"
              />
            </>
          )}
        </div>

        <div className="rounded-xl border border-fede-border p-3 space-y-3">
          <p className="text-sm font-medium">Origen</p>
          <MapView
            height="h-44"
            center={origenCenter}
            interactive
            selectedPin={{
              lat: origenCenter[0],
              lng: origenCenter[1],
              label: "Origen",
            }}
            onMapClick={(coords) =>
              setForm((prev) => ({
                ...prev,
                origenLat: coords.lat.toFixed(7),
                origenLng: coords.lng.toFixed(7),
              }))
            }
          />
          <p className="text-xs text-fede-muted">Click en el mapa para fijar coordenadas.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            required
            value={form.origenLat}
            onChange={(e) => setForm({ ...form, origenLat: e.target.value })}
            className="input-dark"
            placeholder="Origen latitud"
            type="number"
            step="0.0000001"
          />
          <input
            required
            value={form.origenLng}
            onChange={(e) => setForm({ ...form, origenLng: e.target.value })}
            className="input-dark"
            placeholder="Origen longitud"
            type="number"
            step="0.0000001"
          />
          <input
            value={form.origenReferencia}
            onChange={(e) => setForm({ ...form, origenReferencia: e.target.value })}
            className="input-dark col-span-2"
            placeholder="Referencia de origen"
          />
        </div>

        {form.tipo === "traslado" && (
          <div className="rounded-xl border border-fede-border p-3 space-y-3">
            <p className="text-sm font-medium">Destino (traslado)</p>
            <MapView
              height="h-44"
              center={destinoCenter}
              interactive
              selectedPin={{
                lat: destinoCenter[0],
                lng: destinoCenter[1],
                label: "Destino",
              }}
              onMapClick={(coords) =>
                setForm((prev) => ({
                  ...prev,
                  destinoLat: coords.lat.toFixed(7),
                  destinoLng: coords.lng.toFixed(7),
                }))
              }
            />
            <p className="text-xs text-fede-muted">Click en el mapa para fijar destino.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                required
                value={form.destinoLat}
                onChange={(e) => setForm({ ...form, destinoLat: e.target.value })}
                className="input-dark"
                placeholder="Destino latitud"
                type="number"
                step="0.0000001"
              />
              <input
                required
                value={form.destinoLng}
                onChange={(e) => setForm({ ...form, destinoLng: e.target.value })}
                className="input-dark"
                placeholder="Destino longitud"
                type="number"
                step="0.0000001"
              />
              <input
                value={form.destinoReferencia}
                onChange={(e) => setForm({ ...form, destinoReferencia: e.target.value })}
                className="input-dark md:col-span-2"
                placeholder="Referencia de destino"
              />
            </div>
          </div>
        )}

        <textarea
          required
          value={form.motivo}
          onChange={(e) => setForm({ ...form, motivo: e.target.value })}
          className="input-dark min-h-20"
          placeholder="Motivo de la solicitud"
        />
        <textarea
          value={form.notasInternas}
          onChange={(e) => setForm({ ...form, notasInternas: e.target.value })}
          className="input-dark min-h-20"
          placeholder="Notas internas (opcional)"
        />

        {error && (
          <p className="text-sm rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
          {cargando ? "Guardando..." : "Crear solicitud"}
        </button>
      </form>
    </ModalBase>
  );
}
