export type OnboardingStep = {
  id: string;
  type: "modal" | "spotlight";
  targetSelector?: string; // Selector CSS para el spotlight
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
};
