import type { OnboardingStep } from "./types";

export const METAS_TOUR_DESKTOP: OnboardingStep[] = [
  {
    id: "metas-welcome",
    type: "modal",
    title: "Hacé realidad tus proyectos",
    body: "Tus objetivos, a tu ritmo. Definí qué querés lograr: desde las próximas vacaciones o cambiar el auto, hasta el fondo para tu jubilación. FiMe sigue tu progreso paso a paso para que sepas exactamente cuándo lo vas a alcanzar",
    placement: "center",
  },
  {
    id: "metas-quest-board",
    type: "spotlight",
    targetSelector: "#metas-quest-board",
    title: "Tablero de Misiones",
    body: "Visualizá tus objetivos organizados por prioridad: Misiones Principales (tus hitos de vida más importantes) y Misiones Secundarias (metas de corto plazo o complementarias).",
    placement: "right",
  },
  {
    id: "metas-quick-add",
    type: "spotlight",
    targetSelector: "#metas-quick-add",
    title: "Trazar una Meta",
    body: "Establecé un nuevo objetivo financiero desde este panel. Podés definir el monto, la fecha límite y el tipo de meta. Además, la app te permite vincular activos financieros específicos (como acciones, crypto o bonos) para que respalden tu objetivo y el sistema mida tu avance automáticamente.",
    placement: "left",
  },
];

export const METAS_TOUR_MOBILE: OnboardingStep[] = [
  {
    id: "metas-welcome",
    type: "modal",
    title: "Hacé realidad tus proyectos",
    body: "Tus objetivos, a tu ritmo. Definí qué querés lograr: desde las próximas vacaciones o cambiar el auto, hasta el fondo para tu jubilación. FiMe sigue tu progreso paso a paso para que sepas exactamente cuándo lo vas a alcanzar",
    placement: "center",
  },
  {
    id: "metas-quest-board",
    type: "spotlight",
    targetSelector: "#metas-quest-board",
    title: "Tablero de Misiones",
    body: "Visualizá tus objetivos organizados por prioridad: Misiones Principales (tus hitos de vida más importantes) y Misiones Secundarias (metas de corto plazo o complementarias).",
    placement: "top",
  },
  {
    id: "metas-quick-add",
    type: "spotlight",
    targetSelector: "#metas-quick-add",
    title: "Trazar una Meta",
    body: "Establecé un nuevo objetivo financiero desde este panel. Podés definir el monto, la fecha límite y el tipo de meta. Además, la app te permite vincular activos financieros específicos (como acciones, crypto o bonos) para que respalden tu objetivo y el sistema mida tu avance automáticamente.",
    placement: "top",
  },
];
