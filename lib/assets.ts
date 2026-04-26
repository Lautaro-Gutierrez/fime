import {
  Bitcoin,
  LineChart,
  Globe2,
  Landmark,
  ScrollText,
  PiggyBank,
  Banknote,
  type LucideIcon,
} from "lucide-react";
import type { AssetType, TxType } from "@/types/database";

export type MetadataField = {
  key: string;
  label: string;
  type: "number" | "text" | "date" | "percent";
  required: boolean;
  placeholder?: string;
};

export type AssetConfig = {
  id: AssetType;
  label: string;
  short: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: LucideIcon;
  allowedTxTypes: TxType[];
  requiresTicker: boolean;
  requiresPrice: boolean;
  metadataFields: MetadataField[];
};

export const ASSETS: AssetConfig[] = [
  {
    id: "crypto",
    label: "Crypto",
    short: "Crypto",
    color: "#F97316",
    bgClass: "bg-orange-500/15",
    textClass: "text-orange-400",
    borderClass: "border-orange-500/30",
    icon: Bitcoin,
    allowedTxTypes: ["buy", "sell"],
    requiresTicker: true,
    requiresPrice: true,
    metadataFields: [],
  },
  {
    id: "stock_us",
    label: "Acciones US",
    short: "Stocks US",
    color: "#6366F1",
    bgClass: "bg-indigo-500/15",
    textClass: "text-indigo-400",
    borderClass: "border-indigo-500/30",
    icon: LineChart,
    allowedTxTypes: ["buy", "sell"],
    requiresTicker: true,
    requiresPrice: true,
    metadataFields: [],
  },
  {
    id: "cedear",
    label: "CEDEARs",
    short: "CEDEARs",
    color: "#06B6D4",
    bgClass: "bg-cyan-500/15",
    textClass: "text-cyan-400",
    borderClass: "border-cyan-500/30",
    icon: Globe2,
    allowedTxTypes: ["buy", "sell"],
    requiresTicker: true,
    requiresPrice: true,
    metadataFields: [
      {
        key: "ratio",
        label: "Ratio de conversión",
        type: "number",
        required: true,
        placeholder: "Ej: 10 (para AAPL) o 20 (para KO)",
      },
    ],
  },
  {
    id: "stock_ar",
    label: "Acciones AR",
    short: "Stocks AR",
    color: "#0EA5E9",
    bgClass: "bg-sky-500/15",
    textClass: "text-sky-400",
    borderClass: "border-sky-500/30",
    icon: Landmark,
    allowedTxTypes: ["buy", "sell"],
    requiresTicker: true,
    requiresPrice: true,
    metadataFields: [],
  },
  {
    id: "bond_ar",
    label: "Bonos AR",
    short: "Bonos",
    color: "#14B8A6",
    bgClass: "bg-teal-500/15",
    textClass: "text-teal-400",
    borderClass: "border-teal-500/30",
    icon: ScrollText,
    allowedTxTypes: ["buy", "sell"],
    requiresTicker: true,
    requiresPrice: true,
    metadataFields: [
      {
        key: "maturity",
        label: "Vencimiento",
        type: "date",
        required: false,
      },
    ],
  },
  {
    id: "time_deposit",
    label: "Plazo Fijo",
    short: "PF",
    color: "#F59E0B",
    bgClass: "bg-amber-500/15",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/30",
    icon: PiggyBank,
    allowedTxTypes: ["deposit", "withdraw"],
    requiresTicker: false,
    requiresPrice: false,
    metadataFields: [
      {
        key: "tna",
        label: "TNA (%)",
        type: "percent",
        required: true,
        placeholder: "Ej: 85",
      },
      {
        key: "opening_date",
        label: "Fecha de apertura",
        type: "date",
        required: true,
      },
      {
        key: "maturity_date",
        label: "Fecha de vencimiento",
        type: "date",
        required: true,
      },
      {
        key: "currency",
        label: "Moneda original",
        type: "text",
        required: true,
        placeholder: "ARS o USD",
      },
    ],
  },
  {
    id: "usd_cash",
    label: "USD en efectivo",
    short: "USD",
    color: "#22C55E",
    bgClass: "bg-green-500/15",
    textClass: "text-green-400",
    borderClass: "border-green-500/30",
    icon: Banknote,
    allowedTxTypes: ["deposit", "withdraw"],
    requiresTicker: false,
    requiresPrice: false,
    metadataFields: [],
  },
];

export const ASSETS_BY_ID: Record<AssetType, AssetConfig> = Object.fromEntries(
  ASSETS.map((a) => [a.id, a]),
) as Record<AssetType, AssetConfig>;

export const TX_TYPE_LABELS: Record<TxType, string> = {
  buy: "Compra",
  sell: "Venta",
  deposit: "Depósito",
  withdraw: "Retiro",
};
