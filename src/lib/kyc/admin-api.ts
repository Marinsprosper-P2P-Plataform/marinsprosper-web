import { api } from "@/lib/api";
import type { KycCaseStatus } from "./types";
import type { AdminKycCaseDetail, AdminKycQueueItem, KycReviewPayload } from "./admin-types";

/**
 * `GET /admin/kyc` — fila de análise, atrás do `AdminGuard` (mesmo do
 * resto do painel). Sem filtro, traz `SUBMITTED` + `IN_REVIEW`,
 * ordenado do mais antigo pro mais novo (fila que ordena pelo mais
 * recente deixa quem chegou primeiro esperando pra sempre). Sem tela
 * equivalente no protótipo antes desta rodada — candidato citado no
 * Kanban, ao lado dos outros atalhos de `/admin`.
 */
export function listKycQueueRequest(params: { status?: KycCaseStatus; take?: number } = {}) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.take) search.set("take", String(params.take));
  const query = search.toString();
  return api.get<AdminKycQueueItem[]>(`/admin/kyc${query ? `?${query}` : ""}`);
}

/** `GET /admin/kyc/:id` — caso completo, com URL assinada de leitura
 * de cada documento (curta, gerada na hora — sem link permanente pra
 * documento de identidade). */
export function getKycCaseRequest(caseId: string) {
  return api.get<AdminKycCaseDetail>(`/admin/kyc/${caseId}`);
}

/** `POST /admin/kyc/:id/claim` — UPDATE condicional em `SUBMITTED`,
 * como o aceite de ordem: 409 se outro analista já assumiu ou o caso
 * já foi decidido. */
export function claimKycCaseRequest(caseId: string) {
  return api.post<AdminKycCaseDetail>(`/admin/kyc/${caseId}/claim`, undefined);
}

/** `POST /admin/kyc/:id/review` — aprovar move a conta pra `ACTIVE`;
 * recusar exige motivo e não fecha a porta (usuário abre um caso
 * novo). 409 se o caso não estiver aguardando decisão, 422 na recusa
 * sem motivo ou usuário bloqueado. */
export function reviewKycCaseRequest(caseId: string, payload: KycReviewPayload) {
  return api.post<AdminKycCaseDetail>(`/admin/kyc/${caseId}/review`, payload);
}
