"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CircleX, RotateCcw } from "lucide-react";
import type { HelpProcedure, HelpStep } from "@/lib/types";

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function readTargetRect(step: HelpStep): HighlightRect | null {
  const target = document.querySelector(`[data-help-id=\"${step.target}\"]`);
  if (!target) return null;
  const rect = target.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    top: Math.max(8, rect.top - 6),
    left: Math.max(8, rect.left - 6),
    width: rect.width + 12,
    height: rect.height + 12,
  };
}

function scrollTargetIntoView(step: HelpStep) {
  const target = document.querySelector(`[data-help-id=\"${step.target}\"]`);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
}

export function AdminGuidedTour({
  procedure,
  stepIndex,
  onStepChange,
  onClose,
  onComplete,
  onReset,
  onNavigateTab,
}: {
  procedure: HelpProcedure | null;
  stepIndex: number;
  onStepChange: (index: number) => void;
  onClose: () => void;
  onComplete: () => void;
  onReset: () => void;
  onNavigateTab: (
    tab: "overview" | "auxilios" | "membresias" | "agenda" | "reminders" | "servicios"
  ) => void;
}) {
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);
  const [viewport, setViewport] = useState({ width: 1280, height: 900 });

  const step = useMemo(() => {
    if (!procedure) return null;
    return procedure.steps[stepIndex] ?? null;
  }, [procedure, stepIndex]);

  useEffect(() => {
    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (!step) return;
    if (step.tab) {
      onNavigateTab(step.tab);
    }

    const refresh = () => {
      setHighlight(readTargetRect(step));
    };

    const timeout = window.setTimeout(() => {
      scrollTargetIntoView(step);
      window.setTimeout(refresh, 220);
    }, 120);

    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, true);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    };
  }, [step, onNavigateTab]);

  if (!procedure || !step) return null;

  const isLast = stepIndex >= procedure.steps.length - 1;

  const tooltipTop = highlight
    ? Math.min(viewport.height - 240, highlight.top + highlight.height + 12)
    : 16;
  const tooltipLeft = highlight
    ? Math.min(viewport.width - 420, Math.max(16, highlight.left))
    : 16;

  return (
    <div className="fixed inset-0 z-[140]">
      <div className="absolute inset-0 bg-black/70" />
      {highlight ? (
        <div
          className="absolute rounded-xl border-2 border-fede-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.62)] pointer-events-none"
          style={{
            top: `${highlight.top}px`,
            left: `${highlight.left}px`,
            width: `${highlight.width}px`,
            height: `${highlight.height}px`,
          }}
        />
      ) : null}

      <div
        className="absolute w-[min(420px,calc(100vw-2rem))] rounded-xl border border-fede-border bg-fede-black p-4 shadow-[0_10px_34px_rgba(0,0,0,0.42)]"
        style={{ top: `${tooltipTop}px`, left: `${tooltipLeft}px` }}
      >
        <p className="text-xs text-fede-accent">Tour guiado</p>
        <h4 className="mt-1 text-sm font-semibold text-white">{step.title}</h4>
        <p className="mt-1 text-sm text-fede-muted">{step.description}</p>
        <p className="mt-3 text-xs text-fede-muted">
          Paso {stepIndex + 1} de {procedure.steps.length}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-outline inline-flex items-center gap-1 px-3 py-2 text-xs"
            disabled={stepIndex <= 0}
            onClick={() => onStepChange(Math.max(0, stepIndex - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Paso anterior
          </button>
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-1 px-3 py-2 text-xs"
            onClick={() => {
              if (isLast) {
                onComplete();
                return;
              }
              onStepChange(stepIndex + 1);
            }}
          >
            {isLast ? "Finalizar tour" : "Siguiente paso"}
            {!isLast ? <ChevronRight className="h-3.5 w-3.5" /> : null}
          </button>
          <button
            type="button"
            className="btn-outline inline-flex items-center gap-1 px-3 py-2 text-xs"
            onClick={onReset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Repetir tour
          </button>
          <button
            type="button"
            className="btn-outline inline-flex items-center gap-1 px-3 py-2 text-xs"
            onClick={onClose}
          >
            <CircleX className="h-3.5 w-3.5" />
            Salir y guardar paso
          </button>
        </div>
      </div>
    </div>
  );
}
