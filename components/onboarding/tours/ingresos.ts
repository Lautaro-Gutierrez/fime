import type { OnboardingStep } from "./types";

export const INGRESOS_TOUR_DESKTOP: OnboardingStep[] = [
  {
    id: "ingresos-welcome",
    type: "modal",
    title: "Optimizá tus Ingresos",
    body: "Este es el panel donde registrás tu sueldo, proyectos freelance u otros cobros. Acá podés planificar cómo distribuir cada ingreso apenas lo recibís.",
    placement: "center",
  },
  {
    id: "ingresos-distribution",
    type: "spotlight",
    targetSelector: "#ingresos-distribution",
    title: "Distribución del Dinero (Método 50/30/20)",
    body: "Visualizá cómo se reparte tu dinero en base a tus reglas. Asigná porcentajes para gastos fijos, variables, inversiones y ahorro para mantener un flujo saludable. Tené en cuenta que los gastos fijos y variables están vinculados directamente con el módulo de Gastos.",
    placement: "right",
  },
  {
    id: "ingresos-quick-add",
    type: "spotlight",
    targetSelector: "#ingresos-quick-add",
    title: "Registrar Ingreso",
    body: "Cargá nuevos ingresos de forma sencilla. Indicá origen, monto y dejá que FiMe aplique tu distribución automática favorita al instante.",
    placement: "left",
  },
];

export const INGRESOS_TOUR_MOBILE: OnboardingStep[] = [
  {
    id: "ingresos-welcome",
    type: "modal",
    title: "Optimizá tus Ingresos",
    body: "Este es el panel donde registrás tu sueldo, proyectos freelance u otros cobros. Acá podés planificar cómo distribuir cada ingreso apenas lo recibís.",
    placement: "center",
  },
  {
    id: "ingresos-distribution",
    type: "spotlight",
    targetSelector: "#ingresos-distribution",
    title: "Distribución del Dinero (Método 50/30/20)",
    body: "Visualizá cómo se reparte tu dinero en base a tus reglas. Asigná porcentajes para gastos fijos, variables, inversiones y ahorro para mantener un flujo saludable. Tené en cuenta que los gastos fijos y variables están vinculados directamente con el módulo de Gastos.",
    placement: "top",
  },
  {
    id: "ingresos-quick-add",
    type: "spotlight",
    targetSelector: "#ingresos-quick-add",
    title: "Registrar Ingreso",
    body: "Cargá tus ingresos de forma rápida. Indicá el origen, monto y dejá que FiMe se encargue de aplicar la distribución al instante.",
    placement: "top",
  },
];
