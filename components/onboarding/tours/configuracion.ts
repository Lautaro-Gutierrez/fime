import type { OnboardingStep } from "./types";

export const CONFIG_TOUR_DESKTOP: OnboardingStep[] = [
  {
    id: "config-welcome",
    type: "modal",
    title: "El Centro de Control",
    body: "Acá ajustás FiMe a tu medida. Desde gestionar tu identidad y tarjetas, hasta personalizar los colores y proteger tu privacidad financiera.",
    placement: "center",
  },
  {
    id: "config-cards",
    type: "spotlight",
    targetSelector: "#config-cards",
    title: "Tus ciclos de pago",
    body: "Registrá tus tarjetas de crédito y definí sus días de cierre y vencimiento. Esto le permite a FiMe saber exactamente en qué mes imputar cada uno de tus gastos.",
    placement: "bottom",
  },
  {
    id: "config-theme",
    type: "spotlight",
    targetSelector: "#config-theme",
    title: "FiMe, a tu estilo",
    body: "Elegí entre un modo OLED puro o un gris profundo, cambiá el color de acento y ajustá la densidad de la interfaz para que trabajar con tus finanzas sea un placer visual.",
    placement: "bottom",
  },
];

export const CONFIG_TOUR_MOBILE: OnboardingStep[] = [
  {
    id: "config-welcome",
    type: "modal",
    title: "El Centro de Control",
    body: "Acá ajustás FiMe a tu medida. Desde gestionar tu identidad y tarjetas, hasta personalizar los colores y proteger tu privacidad financiera.",
    placement: "center",
  },
  {
    id: "config-cards",
    type: "spotlight",
    targetSelector: "#config-cards",
    title: "Tus ciclos de pago",
    body: "Registrá tus tarjetas de crédito y definí sus días de cierre y vencimiento. Esto le permite a FiMe saber exactamente en qué mes imputar cada uno de tus gastos.",
    placement: "top",
  },
  {
    id: "config-theme",
    type: "spotlight",
    targetSelector: "#config-theme",
    title: "FiMe, a tu estilo",
    body: "Elegí entre un modo OLED puro o un gris profundo, cambiá el color de acento y ajustá la densidad de la interfaz para que trabajar con tus finanzas sea un placer visual.",
    placement: "top",
  },
];
