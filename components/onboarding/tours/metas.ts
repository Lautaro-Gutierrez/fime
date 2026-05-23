import type { OnboardingStep } from "./types";

export const METAS_TOUR_DESKTOP: OnboardingStep[] = [
  {
    id: "metas-welcome",
    type: "modal",
    title: "Alcanzá tus Metas",
    body: "El módulo de Metas funciona como el tablero de misiones de un RPG. Definí tus objetivos financieros y convertilos en logros visuales.",
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
    title: "Alcanzá tus Metas",
    body: "El módulo de Metas funciona como el tablero de misiones de un RPG. Definí tus objetivos financieros y convertilos en logros visuales.",
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
