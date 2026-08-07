"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type MockRole = "cliente" | "caixeiro";

interface MockUser {
  id: string;
  name: string;
  role: MockRole;
  /** Só relevante pro caixeiro — limite disponível pra aceitar novas
   * ordens (derivado da caução no backend real; fixo aqui). */
  cashierAvailableLimit?: number;
}

const MOCK_CLIENT: MockUser = { id: "user-client-1", name: "Ana Cliente", role: "cliente" };
const MOCK_CASHIER: MockUser = {
  id: "user-cashier-1",
  name: "Beto Caixeiro",
  role: "caixeiro",
  cashierAvailableLimit: 3000,
};

interface MockSessionContextValue {
  user: MockUser;
  setRole: (role: MockRole) => void;
}

const MockSessionContext = createContext<MockSessionContextValue | null>(null);

/**
 * Sem autenticação real ainda (Sprint 4), então "quem está logado" é
 * simulado aqui — um switcher permite alternar entre as duas
 * perspectivas (cliente/caixeiro) pra revisar o protótipo sem precisar
 * de dois logins reais. Isso substitui inteiramente Sprint 4, quando o
 * papel vem do JWT.
 */
export function MockSessionProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<MockRole>("cliente");
  const value = useMemo<MockSessionContextValue>(
    () => ({
      user: role === "cliente" ? MOCK_CLIENT : MOCK_CASHIER,
      setRole,
    }),
    [role],
  );

  return (
    <MockSessionContext.Provider value={value}>{children}</MockSessionContext.Provider>
  );
}

export function useMockSession() {
  const ctx = useContext(MockSessionContext);
  if (!ctx) {
    throw new Error("useMockSession precisa estar dentro de MockSessionProvider");
  }
  return ctx;
}
