"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Rótulo de capacidade dentro de UMA ordem específica — não é uma
 * identidade fixa do usuário. A mesma conta pode ser "cliente" numa
 * ordem e "caixeiro" em outra, exatamente como nas plataformas de
 * referência (STM, Eldorado, AirTM). Ver `authorRole` em
 * `src/types/chat.ts` para o mesmo princípio aplicado ao chat.
 */
export type MockRole = "cliente" | "caixeiro";

export interface MockUser {
  id: string;
  name: string;
  /** `@username` — único e imutável, definido no cadastro (ver
   * `(auth)/register`). Não existe tela de edição dele em lugar nenhum,
   * de propósito. */
  username: string;
  /** CPF/CNPJ fake "do KYC" desta conta — único dado que a Página de
   * Perfil usa pra validar, só na UI, a trava de titularidade das
   * chaves PIX (a chave PIX tem que pertencer ao mesmo documento do
   * titular da conta). Ver `src/lib/mock/pix-keys.ts`. */
  document: string;
  /** Id de `COUNTRIES` (`src/lib/validations/auth.ts`). */
  country: string;
  city: string;
  /**
   * Limite disponível pra aceitar ofertas como caixeiro. No
   * protótipo (Sprint -1, dados fake), toda conta com acesso ao
   * sistema já pode atuar como cliente OU caixeiro automaticamente —
   * sem toggle, sem aprovação simulada.
   *
   * Isso é uma simplificação só do protótipo, não uma mudança na
   * regra de negócio real: no modelo documentado (PRD, seção 4;
   * Arquitetura Técnica), virar caixeiro de verdade exige caução
   * registrada e aprovação — o fluxo `/cashier-apply` já construído
   * representa exatamente isso, e passa a valer a partir do Sprint 2,
   * quando existir backend de verdade checando caução real antes de
   * calcular esse limite.
   */
  cashierAvailableLimit: number;
}

const ANA: MockUser = {
  id: "user-client-1",
  name: "Ana Ferreira",
  username: "anaferreira",
  document: "123.456.789-00",
  country: "BR",
  city: "São Paulo",
  cashierAvailableLimit: 3000,
};
const BETO: MockUser = {
  id: "user-cashier-1",
  name: "Beto Lima",
  username: "betolima",
  document: "987.654.321-00",
  country: "BR",
  city: "Curitiba",
  cashierAvailableLimit: 5000,
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
 * identidade vem do JWT e o limite de caixeiro do cadastro aprovado.
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
