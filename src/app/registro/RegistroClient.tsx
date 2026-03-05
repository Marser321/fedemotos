"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  User,
  Mail,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Bike,
  KeyRound,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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

interface ApiResponse {
  ok?: boolean;
  step?: "code_sent";
  destination?: string;
  devCode?: string;
  error?: {
    message?: string;
  };
}

async function postJson(path: string, payload: unknown): Promise<ApiResponse> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as ApiResponse;
  if (!response.ok || data.ok === false) {
    throw new Error(data.error?.message || "No se pudo completar la operación");
  }

  return data;
}

export default function RegistroClient() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
    marca: "",
    modelo: "",
  });
  const [step, setStep] = useState<"form" | "verify" | "done">("form");
  const [code, setCode] = useState("");
  const [destination, setDestination] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>(undefined);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const handleSubmitRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      const data = await postJson("/api/auth/registro", form);
      setDestination(data.destination || "");
      setDevCode(data.devCode);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión. Intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      await postJson("/api/auth/verificar", {
        purpose: "registro",
        telefono: form.telefono,
        code,
      });
      setStep("done");
      setTimeout(() => {
        router.push("/mi-cuenta");
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo verificar el código");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(239,68,68,0.08),transparent_60%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-fede-border flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.2)] mb-4 overflow-hidden">
            <Image src="/icon-192.png" alt="Fede Motos" width={46} height={46} />
          </div>
          <h1 className="text-xl font-bold">
            Creá tu <span className="text-fede-accent">Cuenta</span>
          </h1>
          <p className="text-fede-muted text-sm mt-1 text-center">
            Registro con verificación por código
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={handleSubmitRegistro}
              className="glass-card p-6 space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                  Nombre completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fede-muted" />
                  <input
                    type="text"
                    required
                    placeholder="Ej: Juan Pérez"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="input-dark pl-10"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                  Número de WhatsApp
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fede-muted" />
                  <input
                    type="tel"
                    required
                    placeholder="099 123 456"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="input-dark pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fede-muted" />
                  <input
                    type="email"
                    required
                    placeholder="juan@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-dark pl-10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Bike className="w-4 h-4 text-fede-accent" />
                <span className="text-sm font-medium text-fede-accent">Tu moto</span>
                <div className="flex-1 h-px bg-fede-border" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                    Marca
                  </label>
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
                  <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                    Modelo
                  </label>
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

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cargando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando código...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-5 h-5" />
                    Solicitar Código
                  </>
                )}
              </button>
            </motion.form>
          )}

          {step === "verify" && (
            <motion.form
              key="verify"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              onSubmit={handleVerify}
              className="glass-card p-6 space-y-4"
            >
              <h2 className="text-lg font-semibold text-center">Verificá tu código</h2>
              <p className="text-sm text-fede-muted text-center">
                Te enviamos un código a {destination || form.email}
              </p>

              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fede-muted" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="input-dark pl-10 tracking-[0.25em] text-center text-lg"
                  autoFocus
                />
              </div>

              {devCode ? (
                <p className="text-xs text-amber-300 text-center">
                  Código dev: <span className="font-mono">{devCode}</span>
                </p>
              ) : null}

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cargando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Verificar y Crear Cuenta
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setCode("");
                  setError("");
                }}
                className="w-full text-xs text-fede-muted hover:text-white transition-colors"
              >
                Volver y editar datos
              </button>
            </motion.form>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 text-center"
            >
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">¡Cuenta verificada!</h2>
              <p className="text-fede-muted text-sm">Redirigiendo a tu panel...</p>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-fede-muted text-sm mt-6">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-fede-accent hover:text-red-400 transition-colors font-medium">
            Iniciá sesión
          </Link>
        </p>

        <p className="text-center text-fede-muted text-xs mt-3">
          <Link href="/" className="hover:text-white transition-colors underline underline-offset-2">
            Volver al inicio
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
