"use client";

import React, { createContext, useContext } from "react";
import { usePortfolio } from "@/hooks/use-portfolio";

type PortfolioContextType = ReturnType<typeof usePortfolio>;

const PortfolioContext = createContext<PortfolioContextType | null>(null);

export function PortfolioProvider({
  children,
  portfolioId = "ALL",
}: {
  children: React.ReactNode;
  portfolioId?: string | "ALL";
}) {
  const portfolio = usePortfolio(portfolioId);

  return (
    <PortfolioContext.Provider value={portfolio}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolioContext(): PortfolioContextType {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error("usePortfolioContext must be used within a PortfolioProvider");
  }
  return context;
}
