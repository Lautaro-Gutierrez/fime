import type { OnboardingStep } from "./types";

export const INVERSIONES_TOUR_DESKTOP: OnboardingStep[] = [
  {
    id: "inv-welcome",
    type: "modal",
    title: "Tu capital en movimiento",
    body: "Este es el panel de control de tus activos. Acá podés registrar operaciones, analizar tu distribución y comparar tu rendimiento histórico directamente contra el índice S&P 500.",
    placement: "center",
  },
  {
    id: "inv-tabs",
    type: "spotlight",
    targetSelector: "#inv-tabs",
    title: "Dos vistas clave",
    body: "Usá la 'Bitácora' para registrar cada nueva compra o venta que hagas (CEDEARs, ONs, Crypto, etc.), y cambiá a 'Portfolio' para ver tus gráficos y evaluar cómo rinde tu estrategia frente al mercado.",
    placement: "bottom",
  },
  {
    id: "inv-initial",
    type: "spotlight",
    targetSelector: "#inv-initial",
    title: "Traé tu historial",
    body: "Si ya venías invirtiendo antes de usar FiMe, este botón es clave. Cargá acá tus tenencias previas y el sistema las sumará automáticamente a tus métricas actuales.",
    placement: "left",
  },
];

export const INVERSIONES_TOUR_MOBILE: OnboardingStep[] = [
  {
    id: "inv-welcome",
    type: "modal",
    title: "Tu capital en movimiento",
    body: "Este es el panel de control de tus activos. Acá podés registrar operaciones, analizar tu distribución y comparar tu rendimiento histórico directamente contra el índice S&P 500.",
    placement: "center",
  },
  {
    id: "inv-tabs",
    type: "spotlight",
    targetSelector: "#inv-tabs",
    title: "Dos vistas clave",
    body: "Usá la 'Bitácora' para registrar cada nueva compra o venta que hagas (CEDEARs, ONs, Crypto, etc.), y cambiá a 'Portfolio' para ver tus gráficos y evaluar cómo rinde tu estrategia frente al mercado.",
    placement: "top",
  },
  {
    id: "inv-initial",
    type: "spotlight",
    targetSelector: "#inv-initial",
    title: "Traé tu historial",
    body: "Si ya venías invirtiendo antes de usar FiMe, este botón es clave. Cargá acá tus tenencias previas y el sistema las sumará automáticamente a tus métricas actuales.",
    placement: "top",
  },
];
