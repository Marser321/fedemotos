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

    // Parsear VCF a contactos
    const parsearVCF = (texto: string): ContactoPreview[] => {
        const vcards = texto.split(/BEGIN:VCARD/i);
        const contactosParsed: ContactoPreview[] = [];

        for (const card of vcards) {
            if (!card.trim()) continue;

            let nombre = "";
            let telefono = "";
            let email = "";

            const lineas = card.split(/\r?\n/);
            for (const linea of lineas) {
                const limpia = linea.trim();
                const upper = limpia.toUpperCase();
                if (upper.startsWith("FN:") || upper.startsWith("FN;")) {
                    const index = limpia.indexOf(":");
                    if (index !== -1) {
                        nombre = limpia.slice(index + 1).trim();
                    }
                } else if (upper.startsWith("TEL:") || upper.startsWith("TEL;")) {
                    const index = limpia.indexOf(":");
                    if (index !== -1) {
                        const numRaw = limpia.slice(index + 1).trim();
                        // Conservar solo dígitos y el signo +
                        telefono = numRaw.replace(/[^\d+]/g, "");
                    }
                } else if (upper.startsWith("EMAIL:") || upper.startsWith("EMAIL;")) {
                    const index = limpia.indexOf(":");
                    if (index !== -1) {
                        email = limpia.slice(index + 1).trim();
                    }
                }
            }

            if (nombre || telefono) {
                contactosParsed.push({
                    nombre: nombre || "Contacto sin nombre",
                    telefono: telefono || "",
                    email: email || undefined,
                });
            }
        }
        return contactosParsed;
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

    // Manejar archivo subido
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const contenido = ev.target?.result as string;
            // Detectar si tiene encabezado (primera línea con "nombre" o "name")
            const lineas = contenido.split("\n");
            const primeraLinea = lineas[0]?.toLowerCase() || "";
            const tieneEncabezado = !primeraLinea.includes("begin:vcard") && (primeraLinea.includes("nombre") || primeraLinea.includes("name"));
            const textoFinal = tieneEncabezado ? lineas.slice(1).join("\n") : contenido;
            setTextoCSV(textoFinal);
        };
        reader.readAsText(file);
    };

    // Preview de los datos
    const handlePreview = () => {
        const isVCF = textoCSV.toUpperCase().includes("BEGIN:VCARD");
        const parsed = isVCF ? parsearVCF(textoCSV) : parsearCSV(textoCSV);
        if (parsed.length === 0) {
            setError(isVCF ? "No se encontraron contactos en formato VCF." : "No se encontraron contactos. Pegá los datos en formato CSV o VCF.");
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

    // Manejar cambios en la edición manual
    const updateContacto = (index: number, field: keyof ContactoPreview, value: string) => {
        setContactos((prev) =>
            prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
        );
    };

    const eliminarContacto = (index: number) => {
        setContactos((prev) => prev.filter((_, i) => i !== index));
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
            // Sanitizar los contactos para evitar campos vacíos no válidos (e.g. emails vacíos)
            const contactosSanitizados = contactos
                .map((c) => {
                    const emailLimpio = c.email?.trim() || "";
                    return {
                        nombre: c.nombre?.trim() || "Contacto sin nombre",
                        telefono: c.telefono?.trim() || "",
                        email: emailLimpio ? emailLimpio : undefined,
                        marca: c.marca?.trim() || undefined,
                        modelo: c.modelo?.trim() || undefined,
                    };
                })
                .filter((c) => c.telefono);

            const res = await fetch("/api/clientes/carga-masiva", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contactos: contactosSanitizados }),
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
                    className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl"
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-700 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-fede-accent/15 rounded-lg">
                                <Users className="w-5 h-5 text-fede-accent" />
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
                                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 space-y-3">
                                    <div>
                                        <h3 className="text-sm font-semibold text-zinc-300 mb-1.5 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-fede-accent" />
                                            Formatos de Importación Soportados
                                        </h3>
                                        <p className="text-xs text-zinc-400 leading-normal">
                                            Pegá o subí archivos en formato **CSV** o **VCF (vCard)**. Nombre y teléfono son obligatorios.
                                        </p>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                                        <div className="bg-zinc-900/40 p-2.5 rounded border border-zinc-800">
                                            <p className="font-semibold text-zinc-300 mb-1">Ejemplo CSV:</p>
                                            <code className="text-[10px] text-zinc-500 block leading-tight">
                                                Juan Pérez, 099123456, juan@mail.com, Honda, CG 150<br/>
                                                María López, 098654321
                                            </code>
                                        </div>
                                        <div className="bg-zinc-900/40 p-2.5 rounded border border-zinc-800">
                                            <p className="font-semibold text-zinc-300 mb-1">¿Cómo exportar de WhatsApp?</p>
                                            <p className="text-[10px] text-zinc-500 leading-normal">
                                                1. Sincronizá tu cel con **Google Contacts** y exportalos a **VCF** desde contacts.google.com.<br/>
                                                2. O usá extensiones de Chrome (como *WA Web Plus* o *CoCo*) en WhatsApp Web para bajar la lista a CSV.
                                            </p>
                                        </div>
                                    </div>
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
                                        className="w-full h-48 bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-fede-accent focus:ring-1 focus:ring-fede-accent/50 outline-none resize-none font-mono"
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
                                    className="w-full py-3 border-2 border-dashed border-zinc-600 rounded-lg text-sm text-zinc-400 hover:border-fede-accent hover:text-fede-accent transition-colors flex items-center justify-center gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    Subir archivo .csv o .vcf (vCard)
                                </button>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept=".csv,.txt,.vcf,.vcard"
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
                                    className="btn-primary w-full py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <ChevronDown className="w-4 h-4" />
                                    Vista Previa
                                </button>
                            </div>
                        )}

                        {/* ============ PASO 2: PREVIEW ============ */}
                        {paso === "preview" && (
                            <div className="space-y-4">
                                {/* Tabla preview editable */}
                                <div className="overflow-x-auto max-h-[350px] border border-zinc-800 rounded-lg">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-700 z-10">
                                            <tr className="text-zinc-400 font-medium text-xs">
                                                <th className="text-left py-2 px-2">#</th>
                                                <th className="text-left py-2 px-2 w-[180px]">Nombre *</th>
                                                <th className="text-left py-2 px-2 w-[130px]">Teléfono *</th>
                                                <th className="text-left py-2 px-2 hidden sm:table-cell w-[180px]">Email</th>
                                                <th className="text-left py-2 px-2 hidden sm:table-cell w-[110px]">Marca</th>
                                                <th className="text-left py-2 px-2 hidden sm:table-cell w-[110px]">Modelo</th>
                                                <th className="text-center py-2 px-2 w-[60px]">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {contactos.map((c, i) => (
                                                <tr key={i} className="border-b border-zinc-800/80 hover:bg-zinc-850 bg-zinc-900/30">
                                                    <td className="py-2 px-2 text-zinc-500 text-xs">{i + 1}</td>
                                                    <td className="py-1 px-1">
                                                        <input
                                                            type="text"
                                                            value={c.nombre}
                                                            onChange={(e) => updateContacto(i, "nombre", e.target.value)}
                                                            className="bg-transparent border border-transparent hover:border-zinc-700 focus:border-fede-accent focus:bg-zinc-800 rounded px-2 py-1 text-xs text-white w-full outline-none transition-colors"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="py-1 px-1">
                                                        <input
                                                            type="text"
                                                            value={c.telefono}
                                                            onChange={(e) => updateContacto(i, "telefono", e.target.value)}
                                                            className="bg-transparent border border-transparent hover:border-zinc-700 focus:border-fede-accent focus:bg-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 w-full outline-none transition-colors"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="py-1 px-1 hidden sm:table-cell">
                                                        <input
                                                            type="text"
                                                            value={c.email || ""}
                                                            onChange={(e) => updateContacto(i, "email", e.target.value)}
                                                            placeholder="—"
                                                            className="bg-transparent border border-transparent hover:border-zinc-700 focus:border-fede-accent focus:bg-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 w-full outline-none transition-colors"
                                                        />
                                                    </td>
                                                    <td className="py-1 px-1 hidden sm:table-cell">
                                                        <input
                                                            type="text"
                                                            value={c.marca || ""}
                                                            onChange={(e) => updateContacto(i, "marca", e.target.value)}
                                                            placeholder="—"
                                                            className="bg-transparent border border-transparent hover:border-zinc-700 focus:border-fede-accent focus:bg-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 w-full outline-none transition-colors"
                                                        />
                                                    </td>
                                                    <td className="py-1 px-1 hidden sm:table-cell">
                                                        <input
                                                            type="text"
                                                            value={c.modelo || ""}
                                                            onChange={(e) => updateContacto(i, "modelo", e.target.value)}
                                                            placeholder="—"
                                                            className="bg-transparent border border-transparent hover:border-zinc-700 focus:border-fede-accent focus:bg-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 w-full outline-none transition-colors"
                                                        />
                                                    </td>
                                                    <td className="py-1 px-1 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => eliminarContacto(i)}
                                                            className="p-1 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded transition-colors"
                                                            title="Eliminar contacto"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Resumen */}
                                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 flex items-center justify-between">
                                    <span className="text-sm text-zinc-300">
                                        Total: <strong className="text-white">{contactos.length}</strong> contactos para importar
                                    </span>
                                    <span className="text-xs text-zinc-500">
                                        {contactos.filter((c) => !c.nombre || !c.telefono).length > 0 &&
                                            `⚠️ ${contactos.filter((c) => !c.nombre || !c.telefono).length} incompletos`}
                                    </span>
                                </div>

                                {/* Acciones */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setPaso("input")}
                                        className="flex-1 py-3 bg-zinc-700 rounded-lg text-white font-semibold text-sm hover:bg-zinc-600 transition-colors"
                                    >
                                        ← Volver
                                    </button>
                                    <button
                                        onClick={handleCargar}
                                        className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2"
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
                                    <Loader2 className="w-12 h-12 text-fede-accent mx-auto" />
                                </motion.div>
                                <p className="text-white font-semibold">Cargando contactos...</p>
                                <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-fede-accent to-fede-accent-glow rounded-full"
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
                                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                                        <p className="text-2xl font-bold text-emerald-400">{resultado.nuevos}</p>
                                        <p className="text-xs text-emerald-300/70">Nuevos</p>
                                    </div>
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
                                        <Copy className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                                        <p className="text-2xl font-bold text-yellow-400">{resultado.duplicados}</p>
                                        <p className="text-xs text-yellow-300/70">Duplicados</p>
                                    </div>
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
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
                                    className="btn-primary w-full py-3 text-sm"
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
