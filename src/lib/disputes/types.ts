import type { BackendCancelParty } from "@/lib/orders/types";

/** Corpo de `POST /orders/:id/dispute` — só o motivo (10 a 2000
 * caracteres), conferido direto no `OpenDisputeDto` do `marinsprosper-api`. */
export interface OpenDisputePayload {
  reason: string;
}

export type DisputeStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED";
export type DisputeResolution = "RELEASE" | "REFUND";
export type DisputeMessageAudience = "ALL" | "MEDIATOR_CLIENT" | "MEDIATOR_CASHIER";
export type DisputeDecisionKind = "RECOMMENDATION" | "APPROVAL";

/** Espelha `apresentar(dispute)` de `disputes.service.ts` — a forma
 * "resumida", devolvida por `abrir`/`listar`. */
export interface BackendDispute {
  id: string;
  orderId: string;
  status: DisputeStatus;
  openedById: string | null;
  openedByParty: BackendCancelParty | null;
  reason: string | null;
  mediatorId: string | null;
  resolution: DisputeResolution | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface DisputeEvidenceItem {
  id: string;
  submittedById: string;
  description: string | null;
  filename: string;
  contentType: string;
  sizeBytes: number;
  checksum: string;
  createdAt: string;
  /** URL assinada de leitura, curta de propósito — `null` se o storage
   * não estiver configurado no ambiente. */
  url: string | null;
}

export interface DisputeMessageItem {
  id: string;
  disputeId: string;
  authorId: string;
  body: string;
  audience: DisputeMessageAudience;
  createdAt: string;
}

export interface DisputeDecisionItem {
  id: string;
  disputeId: string;
  kind: DisputeDecisionKind;
  actorId: string;
  resolution: DisputeResolution;
  rationale: string;
  recommendationId: string | null;
  createdAt: string;
}

/** Espelha o retorno de `detalhar()` — `BackendDispute` mais evidências,
 * mensagens (já filtradas pelo público de quem pediu) e decisões. */
export interface DisputeDetail extends BackendDispute {
  evidence: DisputeEvidenceItem[];
  messages: DisputeMessageItem[];
  decisions: DisputeDecisionItem[];
}

export interface DisputeMessagePayload {
  body: string;
  /** Só o mediador pode escolher — partes sempre mandam `ALL` (o backend
   * ignora o campo pra quem não é mediador). */
  audience?: DisputeMessageAudience;
}

export interface DisputeDecisionPayload {
  kind: DisputeDecisionKind;
  resolution: DisputeResolution;
  rationale: string;
  /** Obrigatório quando `kind === "APPROVAL"`. */
  recommendationId?: string;
}
