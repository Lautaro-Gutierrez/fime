"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePrefsContext } from "@/components/providers/preferences-provider";
import { useUpdatePreferences } from "@/hooks/use-preferences";
import { getTourSteps, type OnboardingStep } from "./tours";
import { TOUR_REGISTRY } from "./tour-registry";
import { usePathname } from "next/navigation";

type OnboardingContextValue = {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: OnboardingStep | null;
  totalSteps: number;
  steps: OnboardingStep[];
  next: () => void;
  prev: () => void;
  skip: () => void;
  complete: () => void;
  restart: () => void;
  restartAll: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding debe usarse dentro de un OnboardingProvider");
  }
  return ctx;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { completedTours, isLoading } = usePrefsContext();
  const { mutate: updatePrefs } = useUpdatePreferences();
  const pathname = usePathname();

  const [isMobile, setIsMobile] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentTourId, setCurrentTourId] = useState<string | null>(null);

  // Detectar responsive para ajustar los elementos de spotlight
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Obtener los pasos del tour activo
  const steps = currentTourId ? getTourSteps(currentTourId, isMobile) : [];
  const currentStep = steps[currentStepIndex] || null;
  const totalSteps = steps.length;

  // Lógica de disparo contextual con delay de 600ms
  useEffect(() => {
    if (isLoading) return;

    const tourId = TOUR_REGISTRY[pathname];

    if (!tourId) {
      setIsActive(false);
      setCurrentTourId(null);
      return;
    }

    const isCompleted = completedTours.includes(tourId);

    if (isCompleted) {
      setIsActive(false);
      setCurrentTourId(null);
      return;
    }

    // Activar el tour tras un delay de 600ms para asegurar renderizado correcto y fin de animaciones
    const timer = setTimeout(() => {
      setCurrentTourId(tourId);
      setCurrentStepIndex(0);
      setIsActive(true);
    }, 600);

    return () => clearTimeout(timer);
  }, [pathname, completedTours, isLoading]);

  const next = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      complete();
    }
  };

  const prev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const markCurrentTourAsCompleted = () => {
    if (!currentTourId) return;
    setIsActive(false);

    if (!completedTours.includes(currentTourId)) {
      const nextCompleted = [...completedTours, currentTourId];
      updatePrefs({ completed_tours: nextCompleted });

      // Compatibilidad legacy: si completa el dashboard, también marcar onboarding_completed
      if (currentTourId === "dashboard") {
        updatePrefs({ onboarding_completed: true });
      }
    }
  };

  const skip = () => {
    markCurrentTourAsCompleted();
  };

  const complete = () => {
    markCurrentTourAsCompleted();
  };

  // Reinicia el tour de la página actual
  const restart = () => {
    const tourId = TOUR_REGISTRY[pathname];
    if (!tourId) return;

    const nextCompleted = completedTours.filter((id) => id !== tourId);
    updatePrefs({ completed_tours: nextCompleted });

    setCurrentTourId(tourId);
    setCurrentStepIndex(0);
    setIsActive(true);
  };

  // Reinicia todos los tours globales (UX Reset)
  const restartAll = () => {
    setIsActive(false);
    setCurrentTourId(null);
    updatePrefs({ completed_tours: [] });
    // Legacy support
    updatePrefs({ onboarding_completed: false });
  };

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStepIndex,
        currentStep,
        totalSteps,
        steps,
        next,
        prev,
        skip,
        complete,
        restart,
        restartAll,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
