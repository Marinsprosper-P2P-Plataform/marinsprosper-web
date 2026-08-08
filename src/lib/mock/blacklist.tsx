"use client";

import { createContext, useCallback, useContext, useReducer, type ReactNode } from "react";

/**
 * Gestão de blacklist — GET/POST /admin/blacklist, protótipo com dados
 * fake. Cobre o card "Gestão de blacklist" do bucket Administração &
 * Mediação. Regra do Kanban: motivo e evidências são obrigatórios pra
 * incluir alguém — não existe inclusão "rápida" sem justificar.
 */
export interface BlacklistEntry {
  id: string;
  target: string;
  reason: string;
  evidence: string;
  addedBy: string;
  createdAt: string;
}

function seedEntries(): BlacklistEntry[] {
  return [
    {
      id: "blacklist-1",
      target: "conta-suspeita-92",
      reason: "Múltiplas contas com o mesmo dispositivo tentando burlar limite de caução.",
      evidence: "Fingerprint de dispositivo idêntico em 4 cadastros distintos, todos criados na mesma hora.",
      addedBy: "Jose (admin)",
      createdAt: "2026-08-04T12:20:00.000Z",
    },
  ];
}

type BlacklistAction = { type: "ADD"; entry: BlacklistEntry };

function blacklistReducer(state: BlacklistEntry[], action: BlacklistAction): BlacklistEntry[] {
  switch (action.type) {
    case "ADD":
      return [action.entry, ...state];
    default:
      return state;
  }
}

interface MockBlacklistContextValue {
  entries: BlacklistEntry[];
  addEntry: (input: Omit<BlacklistEntry, "id" | "createdAt">) => void;
}

const MockBlacklistContext = createContext<MockBlacklistContextValue | null>(null);

export function MockBlacklistProvider({ children }: { children: ReactNode }) {
  const [entries, dispatch] = useReducer(blacklistReducer, undefined, seedEntries);

  const addEntry = useCallback((input: Omit<BlacklistEntry, "id" | "createdAt">) => {
    dispatch({
      type: "ADD",
      entry: { ...input, id: `blacklist-${crypto.randomUUID()}`, createdAt: new Date().toISOString() },
    });
  }, []);

  return (
    <MockBlacklistContext.Provider value={{ entries, addEntry }}>
      {children}
    </MockBlacklistContext.Provider>
  );
}

export function useMockBlacklist() {
  const ctx = useContext(MockBlacklistContext);
  if (!ctx) {
    throw new Error("useMockBlacklist precisa estar dentro de MockBlacklistProvider");
  }
  return ctx;
}
