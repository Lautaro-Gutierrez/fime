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
    body: "Creá un nuevo objetivo financiero con este botón. Podés definir monto objetivo, fecha límite y el tipo de meta (ahorro, límite de gasto, tasa de ahorro, etc.) para que FiMe empiece a medir tu avance diario.",
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
    body: "Creá un nuevo objetivo financiero indicando monto objetivo, fecha límite y tipo de meta para que FiMe empiece a medir tu avance al instante.",
    placement: "top",
  },
];
