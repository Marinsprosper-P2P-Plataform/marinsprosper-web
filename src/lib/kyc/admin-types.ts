import type { KycCaseStatus, KycDocumentType } from "./types";

/** Espelha `listar()` de `kyc.service.ts` (`AdminKycController`) — item
 * da fila, sem documentos ainda (só a contagem). */
export interface AdminKycQueueItem {
  id: string;
  status: KycCaseStatus;
  submittedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    status: string;
    fullName: string | null;
  };
  documents: number;
}

/** Espelha `detalhar()` — caso completo, com URL assinada de leitura
 * (curta, gerada na hora) pra cada documento. */
export interface AdminKycDocument {
  id: string;
  type: KycDocumentType;
  filename: string;
  contentType: string;
  sizeBytes: number;
  checksum: string;
  createdAt: string;
  url: string | null;
}

export interface AdminKycCaseDetail {
  id: string;
  status: KycCaseStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  provider: string | null;
  providerRef: string | null;
  user: {
    id: string;
    email: string;
    status: string;
    profile: { fullName: string | null; documentType: string | null; documentNumber: string | null } | null;
  };
  documents: AdminKycDocument[];
}

export type KycReviewDecision = "APPROVED" | "REJECTED";

/** Corpo de `POST /admin/kyc/:id/review` — motivo obrigatório na
 * recusa (o backend rejeita com 422 sem ele), opcional na aprovação. */
export interface KycReviewPayload {
  decision: KycReviewDecision;
  reason?: string;
}
