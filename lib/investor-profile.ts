export type InvestorProfileType = "conservador" | "moderado" | "agresivo";

export interface ProfileOption {
  value: number; // score: 1, 2, or 3
  text: string;
}

export interface ProfileQuestion {
  id: string;
  question: string;
  options: ProfileOption[];
  isMultiSelect?: boolean;
}

export const INVESTOR_QUESTIONS: ProfileQuestion[] = [
  {
    id: "horizon",
    question: "¿En cuánto tiempo estimás que vas a necesitar el dinero invertido?",
    options: [
      { value: 1, text: "Menos de 1 año — Lo voy a necesitar pronto" },
      { value: 2, text: "Entre 1 y 3 años — Tengo cierto margen" },
      { value: 3, text: "Más de 3 años — No lo voy a necesitar a corto plazo" },
    ],
  },
  {
    id: "knowledge",
    question: "¿Qué instrumentos financieros conocés u operaste alguna vez?",
    isMultiSelect: true,
    options: [
      { value: 1, text: "Solo plazo fijo, cuentas remuneradas o fondos money market" },
      { value: 2, text: "Bonos (soberanos o corporativos), ONs (Obligaciones Negociables)" },
      { value: 3, text: "Acciones, CEDEARs, ETFs, Criptomonedas, Futuros u Opciones" },
    ],
  },
  {
    id: "stress",
    question: "Imaginá que tu portafolio cae un 20% en un mes. ¿Qué harías?",
    options: [
      { value: 1, text: "Vendo todo o gran parte para frenar las pérdidas" },
      { value: 2, text: "Espero a que se recupere sin hacer cambios" },
      { value: 3, text: "Aprovecho la oportunidad y compro más a precios de descuento" },
    ],
  },
  {
    id: "objective",
    question: "¿Cuál es tu principal objetivo al invertir?",
    options: [
      { value: 1, text: "Preservar mi capital y no perder dinero" },
      { value: 2, text: "Obtener rendimientos que logren ganarle a la inflación" },
      { value: 3, text: "Crecimiento agresivo del capital, aceptando alta volatilidad" },
    ],
  },
  {
    id: "allocation",
    question: "¿Qué porcentaje de tus ahorros totales destinarías a inversiones de renta variable o volátiles?",
    options: [
      { value: 1, text: "Menos del 20% — Solo una parte muy pequeña" },
      { value: 2, text: "Entre 20% y 50% — Una porción moderada y diversificada" },
      { value: 3, text: "Más del 50% — La mayor parte buscando alto crecimiento" },
    ],
  },
];

export interface ProfileResultDetails {
  name: string;
  emoji: string;
  color: string; // TailWind color text/bg class or hex code
  hexColor: string;
  description: string;
}

export const PROFILE_RESULTS: Record<InvestorProfileType, ProfileResultDetails> = {
  conservador: {
    name: "Conservador",
    emoji: "🛡️",
    color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5",
    hexColor: "#22D3EE",
    description: "Priorizás la seguridad de tu capital. Tu estrategia se apoya en instrumentos de renta fija, plazos fijos y fondos money market. Buscás rendimientos estables y predecibles limitando el impacto de la volatilidad.",
  },
  moderado: {
    name: "Moderado",
    emoji: "⚖️",
    color: "text-amber-400 border-amber-500/20 bg-amber-500/5",
    hexColor: "#FBBF24",
    description: "Buscás un equilibrio entre riesgo y rendimiento. Combinás instrumentos de renta fija con exposición controlada a renta variable. Tolerás volatilidad moderada a cambio de mejores retornos a mediano plazo.",
  },
  agresivo: {
    name: "Agresivo",
    emoji: "🚀",
    color: "text-orange-400 border-orange-500/20 bg-orange-500/5",
    hexColor: "#F97316",
    description: "Estás dispuesto a asumir riesgos elevados buscando la mayor rentabilidad posible. Tu cartera se compone principalmente de renta variable y activos de alto potencial de crecimiento, tolerando fuertes oscilaciones temporales.",
  },
};

export function calculateProfile(score: number): InvestorProfileType {
  if (score <= 8) return "conservador";
  if (score <= 11) return "moderado";
  return "agresivo";
}
