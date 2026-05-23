import type { OnboardingStep } from "./types";

export const GASTOS_TOUR_DESKTOP: OnboardingStep[] = [
  {
    id: "gastos-welcome",
    type: "modal",
    title: "Controlá tus Gastos",
    body: "Llegaste al centro de control de consumos. FiMe te ayuda a clasificar tus gastos de forma inteligente para que sepas exactamente a dónde va cada peso.",
    placement: "center",
  },
  {
    id: "gastos-donut",
    type: "spotlight",
    targetSelector: "#gastos-donut",
    title: "Distribución de Consumo",
    body: "Este gráfico muestra de forma visual la división de tus gastos. Distinguí claramente entre Gastos Fijos (obligatorios) y Variables (deseables) para tomar mejores decisiones.",
    placement: "right",
  },
  {
    id: "gastos-quick-add",
    type: "spotlight",
    targetSelector: "#gastos-quick-add",
    title: "Carga Express",
    body: "Usá este botón para registrar un gasto en segundos. Podés indicar categoría, método de pago y si es fijo o variable de forma súper simple.",
    placement: "left",
  },
];

export const GASTOS_TOUR_MOBILE: OnboardingStep[] = [
  {
    id: "gastos-welcome",
    type: "modal",
    title: "Controlá tus Gastos",
    body: "Llegaste al centro de control de consumos. FiMe te ayuda a clasificar tus gastos de forma inteligente para que sepas exactamente a dónde va cada peso.",
    placement: "center",
  },
  {
    id: "gastos-donut",
    type: "spotlight",
    targetSelector: "#gastos-donut",
    title: "Distribución de Consumo",
    body: "Este gráfico muestra de forma visual la división de tus gastos. Distinguí claramente entre Gastos Fijos (obligatorios) y Variables (deseables) para tomar mejores decisiones.",
    placement: "top",
  },
  {
    id: "gastos-quick-add",
    type: "spotlight",
    targetSelector: "#gastos-quick-add",
    title: "Carga Express",
    body: "Registrá tus consumos al instante desde el botón de acceso rápido. Indicá los detalles de forma cómoda y sin rodeos.",
    placement: "top",
  },
];
