"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Lock,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  KeyRound,
  Mail,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type LoginMode = "cliente" | "admin";
type ClienteStep = "request" | "verify";

interface ApiResponse {
  ok?: boolean;
  role?: "admin" | "cliente";
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

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const modeHint = searchParams.get("mode");

  const [mode, setMode] = useState<LoginMode>(modeHint === "admin" ? "admin" : "cliente");
  const [clienteStep, setClienteStep] = useState<ClienteStep>("request");
  const [telefono, setTelefono] = useState("");
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [destination, setDestination] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>(undefined);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");

    try {
      if (mode === "admin") {
        const data = await postJson("/api/auth/login", { mode: "admin", pin });
        if (data.role === "admin") {
          router.push("/admin");
          return;
        }
      } else if (clienteStep === "request") {
        const data = await postJson("/api/auth/login", { mode: "cliente", telefono });
        setClienteStep("verify");
        setDestination(data.destination || "");
        setDevCode(data.devCode);
      } else {
        await postJson("/api/auth/verificar", {
          purpose: "login",
          telefono,
          code,
        });
        router.push(redirectTo === "/" ? "/mi-cuenta" : redirectTo);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión. Intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  const resetClienteFlow = () => {
    setClienteStep("request");
    setCode("");
    setDestination("");
    setDevCode(undefined);
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
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
            Fede <span className="text-fede-accent">Motos</span>
          </h1>
          <p className="text-fede-muted text-sm mt-1">Iniciá sesión para continuar</p>
        </div>

        <div className="flex gap-1 mb-6 bg-fede-card rounded-xl p-1 border border-fede-border">
          <button
            onClick={() => {
              setMode("cliente");
              setError("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
              mode === "cliente"
                ? "bg-fede-accent text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                : "text-fede-muted hover:text-white"
            }`}
          >
            <Phone className="w-4 h-4" />
            Soy Cliente
          </button>
          <button
            onClick={() => {
              setMode("admin");
              setError("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
              mode === "admin"
                ? "bg-fede-accent text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                : "text-fede-muted hover:text-white"
            }`}
          >
            <Lock className="w-4 h-4" />
            Soy Admin
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={`${mode}-${clienteStep}`}
            initial={{ opacity: 0, x: mode === "cliente" ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === "cliente" ? 20 : -20 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="glass-card p-6 space-y-5"
          >
            {mode === "cliente" ? (
              <>
                {clienteStep === "request" ? (
                  <div>
                    <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                      Tu número de WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fede-muted" />
                      <input
                        type="tel"
                        required
                        placeholder="099 123 456"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className="input-dark pl-10"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-fede-muted mt-2">
                      Te enviamos un código al email asociado a tu cuenta.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                        Código de verificación
                      </label>
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
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-fede-muted">
                      <p className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-fede-accent" />
                        Código enviado a {destination || "tu email"}
                      </p>
                      {devCode ? (
                        <p className="mt-2 text-amber-300">
                          Código dev: <span className="font-mono">{devCode}</span>
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="text-xs text-fede-accent hover:text-red-400 transition-colors"
                      onClick={resetClienteFlow}
                    >
                      Cambiar teléfono
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div>
                <label className="text-sm font-medium text-fede-muted mb-1.5 block">
                  Código de acceso
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fede-muted" />
                  <input
                    type="password"
                    required
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="input-dark pl-10 tracking-[0.3em] text-center text-lg"
                    maxLength={20}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-fede-muted mt-2">Ingresá el PIN de administrador</p>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={cargando}
              className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Procesando...
                </>
              ) : mode === "admin" ? (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Acceder al Panel
                </>
              ) : clienteStep === "request" ? (
                <>
                  <ArrowRight className="w-5 h-5" />
                  Enviar Código
                </>
              ) : (
                <>
                  <KeyRound className="w-5 h-5" />
                  Verificar e Ingresar
                </>
              )}
            </button>
          </motion.form>
        </AnimatePresence>

        <p className="text-center text-fede-muted text-sm mt-6">
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="text-fede-accent hover:text-red-400 transition-colors font-medium">
            Registrate
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
