"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileText, CheckCircle2, AlertCircle, Copy, Loader2, Users, ChevronDown } from "lucide-react";

interface ContactoPreview {
    nombre: string;
    telefono: string;
    email?: string;
    marca?: string;
    modelo?: string;
}

interface ResultadoCarga {
    ok?: boolean;
    nuevos: number;
    duplicados: number;
    errores: number;
    detalles: { nombre: string; telefono: string; estado: "nuevo" | "duplicado" | "error"; mensaje?: string }[];
}

type Paso = "input" | "preview" | "cargando" | "resultado";

export function CargaMasivaModal({
    isOpen,
    onClose,
    onSuccess,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => Promise<void> | void;
}) {
    const [paso, setPaso] = useState<Paso>("input");
    const [textoCSV, setTextoCSV] = useState("");
    const [contactos, setContactos] = useState<ContactoPreview[]>([]);
    const [resultado, setResultado] = useState<ResultadoCarga | null>(null);
    const [progreso, setProgreso] = useState(0);
    const [error, setError] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    // Resetear al cerrar
    const handleClose = () => {
        setPaso("input");
        setTextoCSV("");
        setContactos([]);
        setResultado(null);
        setProgreso(0);
        setError("");
        onClose();
    };

    // Parsear CSV a contactos
    const parsearCSV = (texto: string): ContactoPreview[] => {
        const lineas = texto
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

        return lineas.map((linea) => {
            // Soportar separadores: coma, punto y coma, tab
            const partes = linea.split(/[,;\t]/).map((p) => p.trim());
            return {
                nombre: partes[0] || "",
                telefono: partes[1] || "",
                email: partes[2] || undefined,
                marca: partes[3] || undefined,
                modelo: partes[4] || undefined,
            };
        });
    };

    // Manejar archivo CSV subido
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const contenido = ev.target?.result as string;
            // Detectar si tiene encabezado (primera línea con "nombre")
            const lineas = contenido.split("\n");
            const primeraLinea = lineas[0]?.toLowerCase() || "";
            const tieneEncabezado = primeraLinea.includes("nombre") || primeraLinea.includes("name");
            const textoFinal = tieneEncabezado ? lineas.slice(1).join("\n") : contenido;
            setTextoCSV(textoFinal);
        };
        reader.readAsText(file);
    };

    // Preview de los datos
    const handlePreview = () => {
        const parsed = parsearCSV(textoCSV);
        if (parsed.length === 0) {
            setError("No se encontraron contactos. Pegá los datos en formato CSV.");
            return;
        }
        // Filtrar los que no tienen datos
        const validos = parsed.filter((c) => c.nombre || c.telefono);
        if (validos.length === 0) {
            setError("Ningún contacto tiene nombre o teléfono válido.");
            return;
        }
        setError("");
        setContactos(validos);
        setPaso("preview");
    };

    // Ejecutar la carga
    const handleCargar = async () => {
        setPaso("cargando");
        setProgreso(0);

        // Simular progreso visual mientras se hace la request
        const interval = setInterval(() => {
            setProgreso((prev) => {
                if (prev >= 90) {
                    clearInterval(interval);
                    return 90;
                }
                return prev + Math.random() * 15;
            });
        }, 300);

        try {
            const res = await fetch("/api/clientes/carga-masiva", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contactos }),
            });

            clearInterval(interval);
            setProgreso(100);

            const data = (await res.json()) as
                | (ResultadoCarga & { ok: true })
                | { ok: false; error?: { message?: string } };

            if (!res.ok || ("ok" in data && data.ok === false)) {
                const message = "error" in data ? data.error?.message : undefined;
                throw new Error(message || "Error del servidor");
            }

            setResultado(data);
            setPaso("resultado");

            if (data.nuevos > 0) {
                await onSuccess();
            }
        } catch (err) {
            clearInterval(interval);
            setError(err instanceof Error ? err.message : "Error inesperado");
            setPaso("input");
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

                {/* Modal */}
                <motion.div
                    className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl"
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-700 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/20 rounded-lg">
                                <Users className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Carga Masiva de Clientes</h2>
                                <p className="text-xs text-zinc-400">
                                    {paso === "input" && "Pegá los contactos o subí un archivo CSV"}
                                    {paso === "preview" && `${contactos.length} contactos listos para cargar`}
                                    {paso === "cargando" && "Procesando contactos..."}
                                    {paso === "resultado" && "Carga finalizada"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-zinc-400" />
                        </button>
                    </div>

                    <div className="p-6">
                        {/* ============ PASO 1: INPUT ============ */}
                        {paso === "input" && (
                            <div className="space-y-4">
                                {/* Instrucciones */}
                                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                                    <h3 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-red-400" />
                                        Formato esperado (CSV)
                                    </h3>
                                    <code className="text-xs text-zinc-400 block whitespace-pre leading-relaxed">
                                        {`Nombre, Teléfono, Email, Marca, Modelo\nJuan Pérez, 099123456, juan@mail.com, Honda, CG 150\nMaría López, 098654321\nCarlos García, 097111222, , Yamaha, YBR 125`}
                                    </code>
                                    <p className="text-xs text-zinc-500 mt-2">
                                        Solo <strong>Nombre</strong> y <strong>Teléfono</strong> son obligatorios. Separadores válidos: coma, punto y coma, o tab.
                                    </p>
                                </div>

                                {/* Textarea */}
                                <div>
                                    <label className="text-sm text-zinc-300 mb-1 block">Pegá los contactos acá:</label>
                                    <textarea
                                        value={textoCSV}
                                        onChange={(e) => {
                                            setTextoCSV(e.target.value);
                                            setError("");
                                        }}
                                        placeholder="Juan Pérez, 099123456, juan@email.com, Honda, CG 150"
                                        className="w-full h-48 bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50 outline-none resize-none font-mono"
                                    />
                                </div>

                                {/* O subir archivo */}
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-px bg-zinc-700" />
                                    <span className="text-xs text-zinc-500">o</span>
                                    <div className="flex-1 h-px bg-zinc-700" />
                                </div>

                                <button
                                    onClick={() => fileRef.current?.click()}
                                    className="w-full py-3 border-2 border-dashed border-zinc-600 rounded-xl text-sm text-zinc-400 hover:border-red-500 hover:text-red-400 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    Subir archivo .csv
                                </button>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept=".csv,.txt"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />

                                {/* Error */}
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-sm text-red-400 flex items-center gap-2"
                                    >
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </motion.p>
                                )}

                                {/* Botón Preview */}
                                <button
                                    onClick={handlePreview}
                                    disabled={!textoCSV.trim()}
                                    className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 rounded-xl text-white font-semibold text-sm hover:from-red-500 hover:to-red-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <ChevronDown className="w-4 h-4" />
                                    Vista Previa
                                </button>
                            </div>
                        )}

                        {/* ============ PASO 2: PREVIEW ============ */}
                        {paso === "preview" && (
                            <div className="space-y-4">
                                {/* Tabla preview */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-zinc-700">
                                                <th className="text-left py-2 px-2 text-zinc-400 font-medium">#</th>
                                                <th className="text-left py-2 px-2 text-zinc-400 font-medium">Nombre</th>
                                                <th className="text-left py-2 px-2 text-zinc-400 font-medium">Teléfono</th>
                                                <th className="text-left py-2 px-2 text-zinc-400 font-medium hidden sm:table-cell">Email</th>
                                                <th className="text-left py-2 px-2 text-zinc-400 font-medium hidden sm:table-cell">Moto</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {contactos.slice(0, 20).map((c, i) => (
                                                <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                                                    <td className="py-2 px-2 text-zinc-500">{i + 1}</td>
                                                    <td className="py-2 px-2 text-white">{c.nombre || <span className="text-red-400">—</span>}</td>
                                                    <td className="py-2 px-2 text-zinc-300">{c.telefono || <span className="text-red-400">—</span>}</td>
                                                    <td className="py-2 px-2 text-zinc-400 hidden sm:table-cell">{c.email || "—"}</td>
                                                    <td className="py-2 px-2 text-zinc-400 hidden sm:table-cell">
                                                        {c.marca ? `${c.marca} ${c.modelo || ""}`.trim() : "—"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {contactos.length > 20 && (
                                    <p className="text-xs text-zinc-500 text-center">
                                        ...y {contactos.length - 20} contactos más
                                    </p>
                                )}

                                {/* Resumen */}
                                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 flex items-center justify-between">
                                    <span className="text-sm text-zinc-300">
                                        Total: <strong className="text-white">{contactos.length}</strong> contactos
                                    </span>
                                    <span className="text-xs text-zinc-500">
                                        {contactos.filter((c) => !c.nombre || !c.telefono).length > 0 &&
                                            `⚠️ ${contactos.filter((c) => !c.nombre || !c.telefono).length} con datos incompletos`}
                                    </span>
                                </div>

                                {/* Acciones */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setPaso("input")}
                                        className="flex-1 py-3 bg-zinc-700 rounded-xl text-white font-semibold text-sm hover:bg-zinc-600 transition-colors"
                                    >
                                        ← Volver
                                    </button>
                                    <button
                                        onClick={handleCargar}
                                        className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-500 rounded-xl text-white font-semibold text-sm hover:from-red-500 hover:to-red-400 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Cargar {contactos.length} contactos
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ============ PASO 3: CARGANDO ============ */}
                        {paso === "cargando" && (
                            <div className="py-12 space-y-6 text-center">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                    className="inline-block"
                                >
                                    <Loader2 className="w-12 h-12 text-red-400 mx-auto" />
                                </motion.div>
                                <p className="text-white font-semibold">Cargando contactos...</p>
                                <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                                        initial={{ width: "0%" }}
                                        animate={{ width: `${progreso}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                                <p className="text-sm text-zinc-400">{Math.round(progreso)}% completado</p>
                            </div>
                        )}

                        {/* ============ PASO 4: RESULTADO ============ */}
                        {paso === "resultado" && resultado && (
                            <div className="space-y-4">
                                {/* Cards de resumen */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                                        <p className="text-2xl font-bold text-emerald-400">{resultado.nuevos}</p>
                                        <p className="text-xs text-emerald-300/70">Nuevos</p>
                                    </div>
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                                        <Copy className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                                        <p className="text-2xl font-bold text-yellow-400">{resultado.duplicados}</p>
                                        <p className="text-xs text-yellow-300/70">Duplicados</p>
                                    </div>
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                                        <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-1" />
                                        <p className="text-2xl font-bold text-red-400">{resultado.errores}</p>
                                        <p className="text-xs text-red-300/70">Errores</p>
                                    </div>
                                </div>

                                {/* Detalle scrolleable */}
                                {resultado.detalles.length > 0 && (
                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                        {resultado.detalles.map((d, i) => (
                                            <div
                                                key={i}
                                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${d.estado === "nuevo"
                                                        ? "bg-emerald-500/5 text-emerald-300"
                                                        : d.estado === "duplicado"
                                                            ? "bg-yellow-500/5 text-yellow-300"
                                                            : "bg-red-500/5 text-red-300"
                                                    }`}
                                            >
                                                <span className="truncate flex-1">{d.nombre}</span>
                                                <span className="text-zinc-500 mx-2">{d.telefono}</span>
                                                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-black/20">
                                                    {d.estado}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Cerrar */}
                                <button
                                    onClick={handleClose}
                                    className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 rounded-xl text-white font-semibold text-sm hover:from-red-500 hover:to-red-400 transition-all"
                                >
                                    Cerrar
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
