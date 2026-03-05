"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Compass,
  ExternalLink,
  PlayCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import Image from "next/image";
import type { HelpProcedure, HelpProcedureId } from "@/lib/types";

type HelpTab = "guides" | "tour" | "verification";

export interface TourProgressSnapshot {
  procedureId: HelpProcedureId;
  stepIndex: number;
  completed: boolean;
  updatedAt: string;
}

export function AdminHelpCenter({
  isOpen,
  procedures,
  onClose,
  onStartTour,
  progress,
}: {
  isOpen: boolean;
  procedures: HelpProcedure[];
  onClose: () => void;
  onStartTour: (procedureId: HelpProcedureId, mode: "start" | "resume") => void;
  progress: TourProgressSnapshot | null;
}) {
  const [activeTab, setActiveTab] = useState<HelpTab>("guides");
  const [selectedProcedureId, setSelectedProcedureId] = useState<HelpProcedureId>(
    procedures[0]?.id ?? "operacion_general"
  );
  const [animationError, setAnimationError] = useState(false);

  const selectedProcedure = useMemo(
    () => procedures.find((item) => item.id === selectedProcedureId) ?? procedures[0],
    [procedures, selectedProcedureId]
  );

  if (!isOpen || !selectedProcedure) return null;

  const canResume =
    progress && !progress.completed && progress.procedureId === selectedProcedure.id;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl border border-fede-border bg-fede-black shadow-[0_16px_60px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-fede-border px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Ayuda operativa</h3>
            <p className="text-xs text-fede-muted">
              Guias visuales para agenda, persistencia y procedimientos del panel admin.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-fede-border p-2 text-fede-muted hover:text-white"
            onClick={onClose}
            aria-label="Cerrar ayuda"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-fede-border px-5 py-3">
          <div className="flex flex-wrap gap-2">
            <HelpTabButton
              active={activeTab === "guides"}
              icon={<BookOpen className="h-4 w-4" />}
              label="Guias rapidas"
              onClick={() => setActiveTab("guides")}
            />
            <HelpTabButton
              active={activeTab === "tour"}
              icon={<Compass className="h-4 w-4" />}
              label="Tour guiado"
              onClick={() => setActiveTab("tour")}
            />
            <HelpTabButton
              active={activeTab === "verification"}
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Verificacion"
              onClick={() => setActiveTab("verification")}
            />
          </div>
        </div>

        <div className="grid h-[calc(92vh-138px)] grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[280px_1fr]">
          <aside className="border-r border-fede-border overflow-auto p-3">
            {procedures.map((procedure) => {
              const isActive = procedure.id === selectedProcedure.id;
              const isProgress =
                progress && progress.procedureId === procedure.id && !progress.completed;
              return (
                <button
                  key={procedure.id}
                  type="button"
                  onClick={() => {
                    setAnimationError(false);
                    setSelectedProcedureId(procedure.id);
                  }}
                  className={`mb-2 w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "border-fede-accent bg-fede-accent/10"
                      : "border-fede-border hover:border-white/30"
                  }`}
                >
                  <p className="text-sm font-medium text-white">{procedure.title}</p>
                  <p className="mt-1 text-xs text-fede-muted">{procedure.summary}</p>
                  {isProgress ? (
                    <p className="mt-1 text-[11px] text-fede-accent">Tour en progreso</p>
                  ) : null}
                </button>
              );
            })}
          </aside>

          <section className="overflow-auto p-4">
            {activeTab === "guides" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-fede-border bg-fede-card p-3">
                  <Image
                    src={selectedProcedure.assets.screenshot}
                    alt={selectedProcedure.assets.alt}
                    width={1365}
                    height={768}
                    className="h-auto w-full rounded-lg border border-fede-border object-cover"
                  />
                  <p className="mt-2 text-xs text-fede-muted">
                    Captura operativa del flujo. Se actualiza con `npm run help:capture:staging`.
                  </p>
                </div>

                <div className="rounded-xl border border-fede-border bg-fede-card p-3">
                  {!animationError ? (
                    <Image
                      src={selectedProcedure.assets.animation}
                      alt={`Animacion ${selectedProcedure.title}`}
                      width={640}
                      height={280}
                      className="h-auto w-full rounded-lg border border-fede-border"
                      onError={() => setAnimationError(true)}
                    />
                  ) : (
                    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-300">
                      No se pudo cargar la animacion SVG. Segui el checklist textual.
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-fede-border bg-fede-card p-3">
                  <h4 className="text-sm font-medium text-white">Checklist de verificacion</h4>
                  <ul className="mt-2 space-y-1.5">
                    {selectedProcedure.checklist.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-fede-muted">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-fede-accent" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "tour" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-fede-border bg-fede-card p-4">
                  <h4 className="text-sm font-medium text-white">{selectedProcedure.title}</h4>
                  <p className="mt-1 text-sm text-fede-muted">{selectedProcedure.summary}</p>
                  <p className="mt-3 text-xs text-fede-muted">
                    Pasos del tour: {selectedProcedure.steps.length}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {selectedProcedure.steps.map((step, index) => (
                      <li key={step.id} className="rounded-lg border border-fede-border px-3 py-2">
                        <p className="text-xs font-semibold text-white">
                          {index + 1}. {step.title}
                        </p>
                        <p className="text-xs text-fede-muted">{step.description}</p>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary inline-flex items-center gap-1 text-xs px-3 py-2"
                      onClick={() => onStartTour(selectedProcedure.id, "start")}
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      Iniciar tour de este flujo
                    </button>
                    <button
                      type="button"
                      className="btn-outline inline-flex items-center gap-1 text-xs px-3 py-2"
                      disabled={!canResume}
                      onClick={() => onStartTour(selectedProcedure.id, "resume")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Reanudar ultimo paso
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "verification" && (
              <div className="space-y-3 rounded-xl border border-fede-border bg-fede-card p-4 text-sm text-fede-muted">
                <p className="font-medium text-white">Checklist tecnico recomendado antes de publicar</p>
                <ul className="space-y-2">
                  <li className="rounded-lg border border-fede-border px-3 py-2">
                    1. Ejecutar `npm run test:release:staging` y revisar evidencia generada.
                  </li>
                  <li className="rounded-lg border border-fede-border px-3 py-2">
                    2. Verificar read-after-write en agenda: pausar, reactivar y crear excepcion.
                  </li>
                  <li className="rounded-lg border border-fede-border px-3 py-2">
                    3. Confirmar que `preview/development` apuntan a backend staging, no produccion.
                  </li>
                  <li className="rounded-lg border border-fede-border px-3 py-2">
                    4. Regenerar capturas con `npm run help:capture:staging` antes de entregar.
                  </li>
                </ul>
                {progress ? (
                  <p className="text-xs text-fede-muted">
                    Ultimo tour: {progress.procedureId} · paso {progress.stepIndex + 1} ·
                    {" "}
                    {progress.completed ? "completado" : "en progreso"}
                  </p>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function HelpTabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
        active
          ? "border-fede-accent bg-fede-accent/10 text-fede-accent"
          : "border-fede-border text-fede-muted hover:border-white/30 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
