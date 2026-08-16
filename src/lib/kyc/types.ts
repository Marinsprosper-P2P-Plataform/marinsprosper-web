export type KycCaseStatus = "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED";

export const KYC_DOCUMENT_TYPES = ["ID_FRONT", "ID_BACK", "SELFIE", "PROOF_OF_ADDRESS"] as const;
export type KycDocumentType = (typeof KYC_DOCUMENT_TYPES)[number];

export interface KycCaseDocument {
  id: string;
  type: KycDocumentType;
  filename: string;
  createdAt: string;
}

/** Espelha `apresentar(caseId)` de `kyc.service.ts` — o que o próprio
 * dono do caso vê. Sem URL dos documentos: ele os enviou, reexibi-los
 * só criaria mais um lugar de onde vazam. */
export interface KycCase {
  id: string;
  status: KycCaseStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  documents: KycCaseDocument[];
  /** `ID_FRONT`/`SELFIE` que ainda faltam pra poder submeter. */
  missingDocuments: KycDocumentType[];
}
