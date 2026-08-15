"use client";

import { createContext, useCallback, useContext, useReducer, type ReactNode } from "react";
import type { PaymentMethod, PaymentMethodDetails } from "@/types/listing";

/**
 * "Backend fake" dos métodos de pagamento cadastrados pra ofertas —
 * mesmo padrão de `orders.tsx`/`pix-keys.tsx`: Context em memória, sem
 * persistência entre recarregamentos. Separado de `pix-keys.tsx` porque
 * cobre também transferência bancária (banco/agência/conta/chave), e é
 * o cadastro específico do wizard de ofertas (`ListingWizard`), não do
 * Perfil.
 */

function seedPaymentMethods(): PaymentMethod[] {
  return [
    {
      id: "pm-1",
      userId: "user-client-1",
      label: "PIX · CPF",
      details: { kind: "pix", pixType: "cpf", pixKey: "123.456.789-00" },
      createdAt: new Date().toISOString(),
    },
    {
      id: "pm-2",
      userId: "user-cashier-1",
      label: "PIX · CPF",
      details: { kind: "pix", pixType: "cpf", pixKey: "987.654.321-00" },
      createdAt: new Date().toISOString(),
    },
    {
      id: "pm-3",
      userId: "user-cashier-1",
      label: "Transferência · Itaú",
      details: { kind: "transferencia", bank: "Itaú", agency: "0001", account: "12345-6", transferKey: "987.654.321-00" },
      createdAt: new Date().toISOString(),
    },
  ];
}

type PaymentMethodsAction =
  | { type: "ADD"; method: PaymentMethod }
  | { type: "REMOVE"; methodId: string };

function paymentMethodsReducer(state: PaymentMethod[], action: PaymentMethodsAction): PaymentMethod[] {
  switch (action.type) {
    case "ADD":
      return [action.method, ...state];
    case "REMOVE":
      return state.filter((method) => method.id !== action.methodId);
    default:
      return state;
  }
}

interface MockPaymentMethodsContextValue {
  paymentMethods: PaymentMethod[];
  addPaymentMethod: (input: { userId: string; label: string; details: PaymentMethodDetails }) => PaymentMethod;
  removePaymentMethod: (methodId: string) => void;
}

const MockPaymentMethodsContext = createContext<MockPaymentMethodsContextValue | null>(null);

export function MockPaymentMethodsProvider({ children }: { children: ReactNode }) {
  const [paymentMethods, dispatch] = useReducer(paymentMethodsReducer, undefined, seedPaymentMethods);

  const addPaymentMethod = useCallback(
    (input: { userId: string; label: string; details: PaymentMethodDetails }) => {
      const method: PaymentMethod = {
        ...input,
        id: `pm-${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: "ADD", method });
      return method;
    },
    [],
  );

  const removePaymentMethod = useCallback((methodId: string) => {
    dispatch({ type: "REMOVE", methodId });
  }, []);

  return (
    <MockPaymentMethodsContext.Provider value={{ paymentMethods, addPaymentMethod, removePaymentMethod }}>
      {children}
    </MockPaymentMethodsContext.Provider>
  );
}

export function useMockPaymentMethods() {
  const ctx = useContext(MockPaymentMethodsContext);
  if (!ctx) {
    throw new Error("useMockPaymentMethods precisa estar dentro de MockPaymentMethodsProvider");
  }
  return ctx;
}
