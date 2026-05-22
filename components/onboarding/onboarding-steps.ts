export type OnboardingStep = {
  id: string;
  type: "modal" | "spotlight";
  targetSelector?: string; // Selector CSS para el spotlight
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
};

export const ONBOARDING_STEPS_DESKTOP: OnboardingStep[] = [
  {
    id: "welcome",
    type: "modal",
    title: "Te damos la bienvenida a FiMe",
    body: "Tu centro de control financiero personal. Diseñado para darte claridad absoluta sobre tus gastos, ingresos, metas y portfolio en tiempo real. Te mostramos cómo funciona en menos de un minuto.",
    placement: "center",
  },
  {
    id: "hero-kpis",
    type: "spotlight",
    targetSelector: "#dashboard-hero-kpis",
    title: "Tu resumen financiero en tiempo real",
    body: "De un solo vistazo tenés tu Patrimonio Neto, tu Flujo Libre de caja, el rendimiento del Portfolio y tu Tasa de Ahorro. Todo en base a lo que registrás y a cotizaciones del mercado actualizadas.",
    placement: "bottom",
  },
  {
    id: "portfolio-snapshot",
    type: "spotlight",
    targetSelector: "#dashboard-portfolio-snapshot",
    title: "Portfolio y Rendimiento",
    body: "Esta tarjeta te da una foto rápida del rendimiento de tus inversiones (TWR) en los últimos 30 días y el top 5 de activos que componen tu portfolio. Hacé clic en cualquier parte de ella para ir al módulo completo de inversiones.",
    placement: "left",
  },
  {
    id: "goals-strip",
    type: "spotlight",
    targetSelector: "#dashboard-goals-strip",
    title: "Metas y Misiones activas",
    body: "Definí tus objetivos (desde armar un fondo de emergencia hasta comprar un activo o limitar un gasto). El sistema computa tu progreso automáticamente y te guía como una misión de juego.",
    placement: "top",
  },
  {
    id: "sidebar-nav",
    type: "spotlight",
    targetSelector: "#desktop-sidebar",
    title: "Navegación principal",
    body: "Desde este menú lateral accedés a todas las herramientas: cargá gastos, registrá tus ingresos, monitoreá tu portfolio, seguí tus metas y personalizá toda la plataforma a tu gusto.",
    placement: "right",
  },
  {
    id: "completion",
    type: "modal",
    title: "¡Listo! Ya estás en control",
    body: "Empezá cargando tus primeros movimientos. Cuanto más la uses, mejor será la foto de tus finanzas. Si alguna vez querés volver a ver esta guía, podés reactivarla desde Configuración.",
    placement: "center",
  },
];

export const ONBOARDING_STEPS_MOBILE: OnboardingStep[] = [
  {
    id: "welcome",
    type: "modal",
    title: "Te damos la bienvenida a FiMe",
    body: "Tu centro de control financiero personal. Diseñado para darte claridad absoluta sobre tus gastos, ingresos, metas y portfolio en tiempo real. Te mostramos cómo funciona en menos de un minuto.",
    placement: "center",
  },
  {
    id: "hero-kpis",
    type: "spotlight",
    targetSelector: "#dashboard-hero-kpis",
    title: "Tu resumen financiero en tiempo real",
    body: "De un solo vistazo tenés tu Patrimonio Neto, tu Flujo Libre de caja, el rendimiento del Portfolio y tu Tasa de Ahorro. Todo en base a lo que registrás y a cotizaciones del mercado actualizadas.",
    placement: "bottom",
  },
  {
    id: "portfolio-snapshot",
    type: "spotlight",
    targetSelector: "#dashboard-portfolio-snapshot",
    title: "Portfolio y Rendimiento",
    body: "Esta tarjeta te da una foto rápida del rendimiento de tus inversiones (TWR) en los últimos 30 días y el top 5 de activos que componen tu portfolio. Tocá sobre ella para ir al detalle completo de tus inversiones.",
    placement: "top",
  },
  {
    id: "goals-strip",
    type: "spotlight",
    targetSelector: "#dashboard-goals-strip",
    title: "Metas y Misiones activas",
    body: "Definí tus objetivos (desde armar un fondo de emergencia hasta comprar un activo o limitar un gasto). El sistema computa tu progreso automáticamente y te guía como una misión de juego.",
    placement: "top",
  },
  {
    id: "mobile-fab",
    type: "spotlight",
    targetSelector: "#mobile-fab-button",
    title: "Registrá en un toque",
    body: "El botón central '+' te permite registrar un nuevo gasto o inversión de forma instantánea y sumamente cómoda desde cualquier pantalla en la que te encuentres.",
    placement: "top",
  },
  {
    id: "mobile-nav",
    type: "spotlight",
    targetSelector: "#mobile-bottom-nav",
    title: "Navegación móvil",
    body: "Desde esta barra inferior podés saltar rápidamente entre tus gastos, tus ingresos, tus inversiones y tus metas. ¡Todo al alcance de tu pulgar!",
    placement: "top",
  },
  {
    id: "completion",
    type: "modal",
    title: "¡Listo! Ya estás en control",
    body: "Empezá cargando tus primeros movimientos. Cuanto más la uses, mejor será la foto de tus finanzas. Si alguna vez querés volver a ver esta guía, podés reactivarla desde Configuración.",
    placement: "center",
  },
];
