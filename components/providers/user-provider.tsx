"use client";

import { createContext, useContext, type ReactNode } from "react";

const UserContext = createContext<string | undefined>(undefined);

export function UserProvider({ userId, children }: { userId?: string; children: ReactNode }) {
  return <UserContext.Provider value={userId}>{children}</UserContext.Provider>;
}

export function useUserId() {
  const context = useContext(UserContext);
  if (!context) {
    console.warn("useUserId must be used within a UserProvider");
    return "anonymous";
  }
  return context;
}
