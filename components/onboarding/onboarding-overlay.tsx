"use client";

import { useEffect, useState, useRef } from "react";
import { useOnboarding } from "./onboarding-provider";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Coords = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function OnboardingOverlay() {
  const {
    isActive,
    currentStepIndex,
    currentStep,
    totalSteps,
    next,
    prev,
    skip,
  } = useOnboarding();

  const [coords, setCoords] = useState<Coords | null>(null);
  const [tooltipPlacement, setTooltipPlacement] = useState<"top" | "bottom" | "left" | "right" | "center">("center");
  const overlayRef = useRef<HTMLDivElement>(null);

  // Recalcular las coordenadas del spotlight cuando cambia el paso
  useEffect(() => {
    if (!isActive || !currentStep) return;

    if (currentStep.type === "modal" || !currentStep.targetSelector) {
      setCoords(null);
      setTooltipPlacement("center");
      // Desplazar al tope cuando es un modal central
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const updateCoords = () => {
      const element = document.querySelector(currentStep.targetSelector!);
      if (element) {
        // Asegurarse de que el elemento es visible antes de enfocar
        element.scrollIntoView({ behavior: "smooth", block: "center" });

        // Un pequeño delay para esperar a que termine el scroll y transiciones de tamaño
        setTimeout(() => {
          const rect = element.getBoundingClientRect();

          setCoords({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });

          // Decidir placement dinámico si se sale de la pantalla
          let placement = currentStep.placement || "bottom";
          
          // Clampear placements si no hay espacio físico
          if (placement === "bottom" && rect.bottom + 200 > window.innerHeight) {
            placement = "top";
          } else if (placement === "top" && rect.top - 200 < 0) {
            placement = "bottom";
          } else if (placement === "right" && rect.right + 400 > window.innerWidth) {
            placement = "left";
          } else if (placement === "left" && rect.left - 400 < 0) {
            placement = "right";
          }

          setTooltipPlacement(placement);
        }, 150);
      } else {
        // Fallback a modal si no encontramos el elemento target en el DOM
        setCoords(null);
        setTooltipPlacement("center");
      }
    };

    updateCoords();
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords);

    // Pequeño timeout por si cambian de ruta o cargan elementos dinámicos
    const timer = setTimeout(updateCoords, 300);

    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords);
      clearTimeout(timer);
    };
  }, [isActive, currentStep, currentStepIndex]);

  if (!isActive || !currentStep) return null;

  // Lógica para posicionar el Tooltip
  const getTooltipStyle = () => {
    if (tooltipPlacement === "center" || !coords) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        position: "fixed" as const,
      };
    }

    const gap = 16;
    const style: React.CSSProperties = {
      position: "absolute",
    };

    switch (tooltipPlacement) {
      case "top":
        style.bottom = `${window.innerHeight - coords.top + gap}px`;
        style.left = `${coords.left + coords.width / 2}px`;
        style.transform = "translateX(-50%)";
        break;
      case "bottom":
        style.top = `${coords.top + coords.height + gap}px`;
        style.left = `${coords.left + coords.width / 2}px`;
        style.transform = "translateX(-50%)";
        break;
      case "left":
        style.right = `${window.innerWidth - coords.left + gap}px`;
        style.top = `${coords.top + coords.height / 2}px`;
        style.transform = "translateY(-50%)";
        break;
      case "right":
        style.left = `${coords.left + coords.width + gap}px`;
        style.top = `${coords.top + coords.height / 2}px`;
        style.transform = "translateY(-50%)";
        break;
    }

    return style;
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-black/40 pointer-events-auto h-dvh scrollbar-none"
    >
      {/* 1. SPOTLIGHT EFFECT (MÁSCARA) */}
      {coords && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute rounded-xl pointer-events-none z-40 transition-all duration-300"
          style={{
            top: coords.top - 8,
            left: coords.left - 8,
            width: coords.width + 16,
            height: coords.height + 16,
            boxShadow: "0 0 0 9999px rgba(3, 4, 8, 0.85)", // Deep background
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
        />
      )}

      {/* OVERLAY COMPLETO CUANDO ES MODAL */}
      {!coords && (
        <div className="fixed inset-0 bg-[#030408]/85 z-40 backdrop-blur-xs" />
      )}

      {/* 2. TOOLTIP CARD */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, scale: 0.96, y: coords ? 0 : 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={getTooltipStyle()}
          className={cn(
            "z-50 w-full max-w-sm rounded-2xl p-6",
            "border border-white/[0.08] bg-[#0A0F1D]/80 backdrop-blur-xl",
            "shadow-2xl shadow-black/80 ring-1 ring-white/[0.05]",
            coords ? "mx-4 my-2" : ""
          )}
        >
          {/* Botón de cerrar / saltar en la esquina */}
          <button
            onClick={skip}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5"
            aria-label="Saltar tutorial"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Contenido */}
          <div className="flex flex-col gap-3">
            <h4 className="text-lg font-bold tracking-tight text-white pr-6">
              {currentStep.title}
            </h4>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {currentStep.body}
            </p>
          </div>

          {/* Controles de navegación */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.06]">
            {/* Indicador de pasos */}
            <div className="flex gap-1.5 items-center">
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    idx === currentStepIndex
                      ? "w-4 bg-theme-500"
                      : "w-1.5 bg-white/20"
                  )}
                />
              ))}
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <Button
                  onClick={prev}
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Anterior
                </Button>
              )}
              
              <Button
                onClick={next}
                variant="default"
                size="sm"
                className="h-8 gap-1.5 text-xs bg-theme-600 hover:bg-theme-500 text-white font-medium shadow-md shadow-theme-900/30"
              >
                {currentStepIndex === totalSteps - 1 ? (
                  "Entendido"
                ) : (
                  <>
                    Siguiente
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
