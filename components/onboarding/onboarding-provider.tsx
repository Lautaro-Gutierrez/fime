"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePrefsContext } from "@/components/providers/preferences-provider";
import { useUpdatePreferences } from "@/hooks/use-preferences";
import {
  ONBOARDING_STEPS_DESKTOP,
  ONBOARDING_STEPS_MOBILE,
  type OnboardingStep,
} from "./onboarding-steps";
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
  const { onboardingCompleted, isLoading } = usePrefsContext();
  const { mutate: updatePrefs } = useUpdatePreferences();
  const pathname = usePathname();

  const [isMobile, setIsMobile] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Detectar responsive para ajustar los elementos de spotlight
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  const steps = isMobile ? ONBOARDING_STEPS_MOBILE : ONBOARDING_STEPS_DESKTOP;
  const currentStep = steps[currentStepIndex] || null;
  const totalSteps = steps.length;

  // Activar onboarding solo si:
  // 1. El usuario no lo ha completado aún (`onboardingCompleted` es false).
  // 2. No está cargando los datos iniciales de preferencias.
  // 3. Está en la página del Dashboard (`/`), que es la página de bienvenida principal.
  useEffect(() => {
    if (!isLoading && !onboardingCompleted && pathname === "/") {
      setIsActive(true);
    } else {
      setIsActive(false);
    }
  }, [isLoading, onboardingCompleted, pathname]);

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

  const skip = () => {
    setIsActive(false);
    updatePrefs({ onboarding_completed: true });
  };

  const complete = () => {
    setIsActive(false);
    updatePrefs({ onboarding_completed: true });
  };

  const restart = () => {
    setCurrentStepIndex(0);
    // Primero actualizamos en base de datos para que onboardingCompleted sea false
    updatePrefs({ onboarding_completed: false });
    // Y forzamos la activación visual
    setIsActive(true);
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
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
