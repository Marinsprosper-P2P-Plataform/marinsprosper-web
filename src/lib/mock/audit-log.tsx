"use client";

import { createContext, useCallback, useContext, useReducer, type ReactNode } from "react";

/**
 * Log de auditoria pro painel administrativo — GET /admin/audit-logs.
 * Só leitura: este módulo expõe `logEvent` pra outras telas
 * registrarem uma ação (aprovação de cadastro, confirmação de
 * depósito), mas **não existe nenhuma ação de editar/apagar** em lugar
 * nenhum da UI, de propósito — mesma regra de
 * [[04 - Documentação de Segurança]] ("log imutável").
 *
 * Nem todo evento do seed está com uma tela real disparando ele ainda
 * (ex. liberação de custódia, reembolso) — esses ficam como dado
 * estático só pra mostrar a forma que o log deve ter; passam a ser
 * gerados de verdade conforme as telas correspondentes existirem.
 */
export type AuditEventCategory = "on-chain" | "admin";

export interface AuditEvent {
  id: string;
  createdAt: string;
  category: AuditEventCategory;
  actor: string;
  action: string;
  target: string;
  details: string;
}

function seedEvents(): AuditEvent[] {
  return [
    {
      id: "audit-1",
      createdAt: "2026-08-07T09:12:00.000Z",
      category: "on-chain",
      actor: "sistema",
      action: "Depósito de caução confirmado",
      target: "Beto Lima (@betolima)",
      details: "500 USDT confirmados na rede TRC20 após 20 confirmações de bloco.",
    },
    {
      id: "audit-2",
      createdAt: "2026-08-06T17:40:00.000Z",
      category: "on-chain",
      actor: "sistema",
      action: "Liberação de custódia",
      target: "Ordem MP-20260806-000891",
      details: "USDT liberado ao cliente após confirmação final de recebimento.",
    },
    {
      id: "audit-3",
      createdAt: "2026-08-05T11:05:00.000Z",
      category: "on-chain",
      actor: "sistema",
      action: "Reembolso de caução",
      target: "Ana Ferreira (@anaferreira)",
      details: "Estorno de 150 USDT após decisão de disputa favorável ao cliente.",
    },
    {
      id: "audit-4",
      createdAt: "2026-08-05T09:30:00.000Z",
      category: "admin",
      actor: "Julia (admin)",
      action: "Cadastro aprovado",
      target: "Carla Souza (@carlasouza)",
      details: "Nível de KYC 1 — documento e selfie conferidos.",
    },
    {
      id: "audit-5",
      createdAt: "2026-08-04T15:20:00.000Z",
      category: "admin",
      actor: "Jose (admin)",
      action: "Usuário incluído na blacklist",
      target: "conta-suspeita-92",
      details: "Evidência: múltiplas contas com o mesmo dispositivo tentando burlar limite de caução.",
    },
    {
      id: "audit-6",
      createdAt: "2026-08-03T13:00:00.000Z",
      category: "admin",
      actor: "Julia (admin)",
      action: "Disputa resolvida",
      target: "Ordem MP-20260801-000452",
      details: "Decisão a favor do caixeiro — comprovante do cliente inconsistente com o valor da ordem.",
    },
  ];
}

type AuditLogAction = { type: "LOG"; event: AuditEvent };

function auditLogReducer(state: AuditEvent[], action: AuditLogAction): AuditEvent[] {
  switch (action.type) {
    case "LOG":
      return [action.event, ...state]; // mais recente primeiro, nunca removido
    default:
      return state;
  }
}

interface MockAuditLogContextValue {
  events: AuditEvent[];
  logEvent: (event: Omit<AuditEvent, "id" | "createdAt">) => void;
}

const MockAuditLogContext = createContext<MockAuditLogContextValue | null>(null);

export function MockAuditLogProvider({ children }: { children: ReactNode }) {
  const [events, dispatch] = useReducer(auditLogReducer, undefined, seedEvents);

  const logEvent = useCallback((event: Omit<AuditEvent, "id" | "createdAt">) => {
    dispatch({
      type: "LOG",
      event: { ...event, id: `audit-${crypto.randomUUID()}`, createdAt: new Date().toISOString() },
    });
  }, []);

  return (
    <MockAuditLogContext.Provider value={{ events, logEvent }}>
      {children}
    </MockAuditLogContext.Provider>
  );
}

export function useMockAuditLog() {
  const ctx = useContext(MockAuditLogContext);
  if (!ctx) {
    throw new Error("useMockAuditLog precisa estar dentro de MockAuditLogProvider");
  }
  return ctx;
}
