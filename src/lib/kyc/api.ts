import { api } from "@/lib/api";
import { uploadFile } from "@/lib/uploads/api";
import type { KycCase, KycDocumentType } from "./types";

/** `POST /kyc` — idempotente: devolve o caso já aberto (`DRAFT`/
 * `SUBMITTED`/`IN_REVIEW`) se existir, ou cria um novo. */
export function openKycCaseRequest() {
  return api.post<KycCase>("/kyc", undefined);
}

/** `GET /kyc/me` — 404 se nunca abriu nenhum caso. */
export function getMyKycCaseRequest() {
  return api.get<KycCase>("/kyc/me");
}

export function submitKycCaseRequest() {
  return api.post<KycCase>("/kyc/submit", undefined);
}

/**
 * Sobe o arquivo direto ao bucket (`POST /uploads` + `PUT`) e anexa ao
 * caso em rascunho (`POST /kyc/documents`) — mesmo caminho em duas fases
 * de evidência de disputa e anexo de chat.
 */
export async function attachKycDocument(file: File, type: KycDocumentType) {
  const uploadId = await uploadFile(file);
  return api.post<KycCase>("/kyc/documents", { uploadId, type });
}
