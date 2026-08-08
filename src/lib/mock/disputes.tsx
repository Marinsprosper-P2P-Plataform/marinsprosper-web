"use client";

import { createContext, useCallback, useContext, useReducer, type ReactNode } from "react";

/**
 * Metadados administrativos de disputa — a disputa em si já existe
 * como estado da ordem (`DISPUTE_OPEN`/`DISPUTE_UNDER_REVIEW`/
 * `DISPUTE_RESOLVED` em `orders.tsx`); este módulo guarda só o que é
 * específico da mediação: a quem o caso está atribuído (pra restringir
 * a listagem, ver [[18 - Administração e Mediação]]), as notas do
 * "chat restrito" (canal só entre mediadores, separado do `OrderChat`
 * que cliente/caixeiro veem) e a decisão, com campos separados de
 * "recomendado por" e "aprovado por" — regra do Kanban, pra deixar
 * explícito que recomendação e aprovação são papéis distintos (o
 * modelo real de dupla checagem é backend, aqui é só a UI pedindo os
 * dois nomes).
 */
export type DisputeOutcome = "cliente" | "caixeiro" | "outro";

export interface DisputeCase {
  orderId: string;
  assignedMediatorId: string;
  recommendedBy?: string;
  recommendation?: string;
  approvedBy?: string;
  outcome?: DisputeOutcome;
  decidedAt?: string;
}

export interface DisputeNote {
  id: string;
  orderId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

function seedCases(): DisputeCase[] {
  return [
    {
      // order-5 no seed de `orders.tsx` — atribuída ao Beto só pra
      // demonstrar o filtro "restrito aos casos atribuídos" com as
      // duas únicas contas alternáveis do protótipo. Num backend real,
      // o mediador nunca seria parte na própria ordem.
      orderId: "order-5",
      assignedMediatorId: "user-cashier-1",
    },
  ];
}

type DisputesAction =
  | { type: "DECIDE"; orderId: string; decision: Omit<DisputeCase, "orderId" | "assignedMediatorId"> }
  | { type: "ADD_NOTE"; note: DisputeNote };

interface DisputesState {
  cases: DisputeCase[];
  notes: DisputeNote[];
}

function disputesReducer(state: DisputesState, action: DisputesAction): DisputesState {
  switch (action.type) {
    case "DECIDE":
      return {
        ...state,
        cases: state.cases.map((item) =>
          item.orderId === action.orderId ? { ...item, ...action.decision } : item,
        ),
      };
    case "ADD_NOTE":
      return { ...state, notes: [...state.notes, action.note] };
    default:
      return state;
  }
}

interface MockDisputesContextValue {
  cases: DisputeCase[];
  notes: DisputeNote[];
  getCase: (orderId: string) => DisputeCase | undefined;
  getNotes: (orderId: string) => DisputeNote[];
  decideCase: (orderId: string, decision: Omit<DisputeCase, "orderId" | "assignedMediatorId">) => void;
  addNote: (orderId: string, authorName: string, body: string) => void;
}

const MockDisputesContext = createContext<MockDisputesContextValue | null>(null);

export function MockDisputesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(disputesReducer, undefined, () => ({
    cases: seedCases(),
    notes: [],
  }));

  const getCase = useCallback(
    (orderId: string) => state.cases.find((item) => item.orderId === orderId),
    [state.cases],
  );

  const getNotes = useCallback(
    (orderId: string) => state.notes.filter((note) => note.orderId === orderId),
    [state.notes],
  );

  const decideCase = useCallback(
    (orderId: string, decision: Omit<DisputeCase, "orderId" | "assignedMediatorId">) => {
      dispatch({ type: "DECIDE", orderId, decision });
    },
    [],
  );

  const addNote = useCallback((orderId: string, authorName: string, body: string) => {
    dispatch({
      type: "ADD_NOTE",
      note: {
        id: `note-${crypto.randomUUID()}`,
        orderId,
        authorName,
        body,
        createdAt: new Date().toISOString(),
      },
    });
  }, []);

  return (
    <MockDisputesContext.Provider
      value={{ cases: state.cases, notes: state.notes, getCase, getNotes, decideCase, addNote }}
    >
      {children}
    </MockDisputesContext.Provider>
  );
}

export function useMockDisputes() {
  const ctx = useContext(MockDisputesContext);
  if (!ctx) {
    throw new Error("useMockDisputes precisa estar dentro de MockDisputesProvider");
  }
  return ctx;
}
