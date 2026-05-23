import type { OnboardingStep } from "./types";

export const INVERSIONES_TOUR_DESKTOP: OnboardingStep[] = [
  {
    id: "inversiones-welcome",
    type: "modal",
    title: "Hacé Crecer tu Capital",
    body: "Bienvenido a tu terminal de Inversiones. Acá podés trackear tus CEDEARs, acciones, cripto, bonos o plazos fijos. FiMe unifica todo y calcula rendimientos en tiempo real.",
    placement: "center",
  },
  {
    id: "inversiones-tabs",
    type: "spotlight",
    targetSelector: "#inversiones-tabs",
    title: "Portfolio y Transacciones",
    body: "Cambiá de solapa para analizar la distribución y rendimiento general de tus tenencias en 'Mi Portfolio', o revisá el historial completo y cargá transacciones en 'Historial'.",
    placement: "bottom",
  },
  {
    id: "inversiones-quick-add",
    type: "spotlight",
    targetSelector: "#inversiones-quick-add",
    title: "Nueva Operación",
    body: "Registrá compras, ventas o retiros de activos con este botón. FiMe recalculará automáticamente tu costo promedio y tus ganancias latentes.",
    placement: "left",
  },
];

export const INVERSIONES_TOUR_MOBILE: OnboardingStep[] = [
  {
    id: "inversiones-welcome",
    type: "modal",
    title: "Hacé Crecer tu Capital",
    body: "Bienvenido a tu terminal de Inversiones. Acá podés trackear tus CEDEARs, acciones, cripto, bonos o plazos fijos. FiMe unifica todo y calcula rendimientos en tiempo real.",
    placement: "center",
  },
  {
    id: "inversiones-tabs",
    type: "spotlight",
    targetSelector: "#inversiones-tabs",
    title: "Portfolio y Transacciones",
    body: "Alterná de vista para ver el rendimiento general en 'Mi Portfolio' o acceder al detalle de todas tus operaciones en 'Historial'.",
    placement: "top",
  },
  {
    id: "inversiones-quick-add",
    type: "spotlight",
    targetSelector: "#inversiones-quick-add",
    title: "Nueva Operación",
    body: "Registrá compras, ventas o retiros de activos de forma rápida. FiMe recalculará tu tenencia y rendimientos automáticamente.",
    placement: "top",
  },
];
