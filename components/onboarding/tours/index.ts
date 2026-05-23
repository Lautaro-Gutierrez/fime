import type { OnboardingStep } from "./types";
import { DASHBOARD_TOUR_DESKTOP, DASHBOARD_TOUR_MOBILE } from "./dashboard";
import { GASTOS_TOUR_DESKTOP, GASTOS_TOUR_MOBILE } from "./gastos";
import { INVERSIONES_TOUR_DESKTOP, INVERSIONES_TOUR_MOBILE } from "./inversiones";
import { INGRESOS_TOUR_DESKTOP, INGRESOS_TOUR_MOBILE } from "./ingresos";
import { METAS_TOUR_DESKTOP, METAS_TOUR_MOBILE } from "./metas";

export type { OnboardingStep };

export function getTourSteps(tourId: string, isMobile: boolean): OnboardingStep[] {
  switch (tourId) {
    case "dashboard":
      return isMobile ? DASHBOARD_TOUR_MOBILE : DASHBOARD_TOUR_DESKTOP;
    case "gastos":
      return isMobile ? GASTOS_TOUR_MOBILE : GASTOS_TOUR_DESKTOP;
    case "inversiones":
      return isMobile ? INVERSIONES_TOUR_MOBILE : INVERSIONES_TOUR_DESKTOP;
    case "ingresos":
      return isMobile ? INGRESOS_TOUR_MOBILE : INGRESOS_TOUR_DESKTOP;
    case "metas":
      return isMobile ? METAS_TOUR_MOBILE : METAS_TOUR_DESKTOP;
    default:
      return [];
  }
}
