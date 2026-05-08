"use client";

import { useState } from "react";
import Image from "next/image";
import { 
  FileText, 
  Bitcoin, 
  Coins, 
  Banknote, 
  PiggyBank, 
  LineChart, 
  Globe2, 
  Landmark,
  ScrollText
} from "lucide-react";
import { AssetType } from "@/types/database";
import { cn } from "@/lib/utils";

type Props = {
  assetType: AssetType;
  ticker: string | null;
  issuer?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const GENERIC_ICONS: Record<string, any> = {
  usd_cash: Banknote,
  time_deposit: PiggyBank,
  crypto: Bitcoin,
  stock_us: LineChart,
  cedear: Globe2,
  stock_ar: Landmark,
  bond_ar: ScrollText,
  on: FileText,
};

// Mapping for common ON issuers to their logo domains
const ISSUER_DOMAINS: Record<string, string> = {
  ypf: "ypf.com",
  pae: "pan-energy.com",
  telecom: "telecom.com.ar",
  pampa: "pampaenergia.com",
  irsa: "irsa.com.ar",
  tgn: "tgn.com.ar",
  tgs: "tgs.com.ar",
  aluar: "aluar.com.ar",
  edenor: "edenor.com",
  cresud: "cresud.com.ar",
  galicia: "galicia.com.ar",
  macro: "bancomacro.com.ar",
};

export function AssetLogo({ assetType, ticker, issuer, size = "md", className }: Props) {
  const [error, setError] = useState(false);
  
  const sizeClasses = {
    sm: "size-6 text-[10px]",
    md: "size-10 text-xs",
    lg: "size-12 text-sm",
  };

  const iconSize = {
    sm: 12,
    md: 20,
    lg: 24,
  };

  const cleanTicker = ticker?.split(":")[0]?.toUpperCase() ?? "";
  // For CEDEARs, use the underlying ticker if possible (e.g., AAPL.BA -> AAPL)
  const logoTicker = cleanTicker.includes(".") ? cleanTicker.split(".")[0] : cleanTicker;

  let logoUrl = "";

  if (!error) {
    if (assetType === "crypto") {
      // Using a reliable crypto icon CDN
      logoUrl = `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${cleanTicker.toLowerCase()}.png`;
    } else if (assetType === "stock_us" || assetType === "cedear" || assetType === "stock_ar") {
      // Parqet logo service is quite good for tickers
      logoUrl = `https://assets.parqet.com/logos/symbol/${logoTicker}`;
    } else if (assetType === "on" && issuer) {
      const lowerIssuer = issuer.toLowerCase();
      const domain = Object.entries(ISSUER_DOMAINS).find(([key]) => lowerIssuer.includes(key))?.[1];
      if (domain) {
        logoUrl = `https://logo.clearbit.com/${domain}`;
      }
    }
  }

  const FallbackIcon = GENERIC_ICONS[assetType] || Coins;

  return (
    <div className={cn(
      "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/[0.08] transition-all group-hover:ring-white/20",
      sizeClasses[size],
      className
    )}>
      {!error && logoUrl ? (
        <Image
          src={logoUrl}
          alt={ticker || "Logo"}
          width={48}
          height={48}
          className="h-full w-full object-contain p-1 filter grayscale-[40%] brightness-[0.9] transition-all group-hover:grayscale-0 group-hover:brightness-100"
          onError={() => setError(true)}
          unoptimized
        />
      ) : ticker ? (
        <span className="font-mono font-bold text-white/40 uppercase tracking-tighter">
          {cleanTicker.slice(0, 2)}
        </span>
      ) : (
        <FallbackIcon className="text-white/20" size={iconSize[size]} />
      )}
    </div>
  );
}
