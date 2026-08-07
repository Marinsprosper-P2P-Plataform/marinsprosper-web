"use client";

import { createContext, useCallback, useContext, useReducer, type ReactNode } from "react";
import type { PixKeyType } from "@/lib/validations/pix";

/**
 * "Backend fake" das chaves PIX cadastradas — mesmo padrão de
 * `orders.tsx`/`chat.tsx`: Context em memória, sem persistência entre
 * recarregamentos. Cobre o bucket "Perfil & Configurações" do
 * [[Kanban]]. A trava de titularidade real (chave pertence ao mesmo
 * CPF/CNPJ do KYC) é regra de backend (Sprint 2); aqui só guardamos o
 * que o usuário cadastrou — a validação de UI acontece no formulário
 * (`src/lib/validations/pix.ts`).
 */
export interface PixKey {
  id: string;
  userId: string;
  type: PixKeyType;
  key: string;
  bank: string;
  description?: string;
  createdAt: string;
}

function seedPixKeys(): PixKey[] {
  return [
    {
      id: "pix-1",
      userId: "user-client-1",
      type: "cpf",
      key: "123.456.789-00",
      bank: "Nubank",
      description: "Conta principal",
      createdAt: new Date().toISOString(),
    },
  ];
}

type PixKeysAction = { type: "ADD"; key: PixKey } | { type: "REMOVE"; keyId: string };

function pixKeysReducer(state: PixKey[], action: PixKeysAction): PixKey[] {
  switch (action.type) {
    case "ADD":
      return [action.key, ...state];
    case "REMOVE":
      return state.filter((key) => key.id !== action.keyId);
    default:
      return state;
  }
}

interface MockPixKeysContextValue {
  pixKeys: PixKey[];
  addPixKey: (input: Omit<PixKey, "id" | "createdAt">) => void;
  removePixKey: (keyId: string) => void;
}

const MockPixKeysContext = createContext<MockPixKeysContextValue | null>(null);

export function MockPixKeysProvider({ children }: { children: ReactNode }) {
  const [pixKeys, dispatch] = useReducer(pixKeysReducer, undefined, seedPixKeys);

  const addPixKey = useCallback((input: Omit<PixKey, "id" | "createdAt">) => {
    dispatch({
      type: "ADD",
      key: { ...input, id: `pix-${crypto.randomUUID()}`, createdAt: new Date().toISOString() },
    });
  }, []);

  const removePixKey = useCallback((keyId: string) => {
    dispatch({ type: "REMOVE", keyId });
  }, []);

  return (
    <MockPixKeysContext.Provider value={{ pixKeys, addPixKey, removePixKey }}>
      {children}
    </MockPixKeysContext.Provider>
  );
}

export function useMockPixKeys() {
  const ctx = useContext(MockPixKeysContext);
  if (!ctx) {
    throw new Error("useMockPixKeys precisa estar dentro de MockPixKeysProvider");
  }
  return ctx;
}
