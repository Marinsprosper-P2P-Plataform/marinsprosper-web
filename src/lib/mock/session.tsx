"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Rótulo de capacidade dentro de UMA ordem específica — não é mais a
 * identidade fixa do usuário. A mesma conta pode ser "cliente" numa
 * ordem e "caixeiro" em outra, exatamente como nas plataformas de
 * referência (STM, Eldorado, AirTM): ser aprovado como caixeiro não
 * impede a pessoa de continuar comprando/vendendo como qualquer
 * cliente. Ver `authorRole` em `src/types/chat.ts` para o mesmo
 * princípio aplicado ao chat.
 */
export type MockRole = "cliente" | "caixeiro";

export interface MockUser {
  id: string;
  name: string;
  /** Toda conta pode criar ordens como cliente — isso não depende de
   * nenhuma flag. `isCashier` só indica se a conta TAMBÉM tem status
   * de caixeiro aprovado (caução registrada), habilitando aceitar
   * ofertas além de continuar podendo comprar/vender normalmente. */
  isCashier: boolean;
  /** Só relevante quando `isCashier` — limite disponível pra aceitar
   * novas ordens (derivado da caução no backend real; fixo aqui). */
  cashierAvailableLimit?: number;
}

const ANA: MockUser = { id: "user-client-1", name: "Ana Cliente", isCashier: false };
const BETO: MockUser = {
  id: "user-cashier-1",
  name: "Beto Caixeiro",
  isCashier: true,
  cashierAvailableLimit: 3000,
};

export const MOCK_ACCOUNTS: MockUser[] = [ANA, BETO];

interface MockSessionContextValue {
  user: MockUser;
  switchAccount: (userId: string) => void;
}

const MockSessionContext = createContext<MockSessionContextValue | null>(null);

/**
 * Sem autenticação real ainda (Sprint 4), então "quem está logado" é
 * simulado aqui — um switcher (`AccountSwitcher`) permite alternar
 * entre duas contas fake pra revisar o protótipo sem precisar de dois
 * logins reais. Isso substitui inteiramente Sprint 4, quando a
 * identidade vem do JWT e o status de caixeiro do cadastro aprovado.
 */
export function MockSessionProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState(ANA.id);
  const value = useMemo<MockSessionContextValue>(
    () => ({
      user: MOCK_ACCOUNTS.find((account) => account.id === userId) ?? ANA,
      switchAccount: setUserId,
    }),
    [userId],
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
