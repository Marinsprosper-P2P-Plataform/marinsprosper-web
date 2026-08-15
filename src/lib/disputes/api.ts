import { api } from "@/lib/api";
import type {
  BackendDispute,
  DisputeDecisionItem,
  DisputeDecisionPayload,
  DisputeDetail,
  DisputeMessageItem,
  DisputeMessagePayload,
  OpenDisputePayload,
} from "./types";

/**
 * `POST /orders/:id/dispute` — abre a mediação. Só as partes abrem, só a
 * partir do momento em que alguém declarou pagamento (a máquina de
 * estados do backend recusa fora disso, 409). A resposta é a disputa
 * criada, não a ordem — quem chama precisa buscar a ordem de novo
 * separadamente (`getOrderRequest`) pra refletir `status: DISPUTED`.
 */
export function openDisputeRequest(orderId: string, payload: OpenDisputePayload, idempotencyKey: string) {
  return api.post<BackendDispute>(`/orders/${orderId}/dispute`, payload, { idempotencyKey });
}

/** `GET /disputes` — fila do mediador (as dele + as sem dono) ou, pra
 * quem não é mediador, as disputas das próprias ordens. */
export function listDisputesRequest() {
  return api.get<BackendDispute[]>("/disputes");
}

/** `GET /disputes/:id` — com evidências, mensagens (já filtradas pelo
 * público de quem pede) e decisões. */
export function getDisputeRequest(disputeId: string) {
  return api.get<DisputeDetail>(`/disputes/${disputeId}`);
}

/**
 * `POST /disputes/:id/evidence` — multipart. Arquivo obrigatório (relato
 * sem arquivo é mensagem, não prova); `description` opcional descreve o
 * que o arquivo mostra.
 */
export function submitEvidenceRequest(disputeId: string, file: File, description?: string) {
  const form = new FormData();
  form.append("file", file);
  if (description) form.append("description", description);
  return api.post<{ id: string }>(`/disputes/${disputeId}/evidence`, form);
}

export function sendDisputeMessageRequest(disputeId: string, payload: DisputeMessagePayload) {
  return api.post<DisputeMessageItem>(`/disputes/${disputeId}/messages`, payload);
}

/**
 * `POST /disputes/:id/decision` — dois mediadores: um recomenda
 * (`kind: "RECOMMENDATION"`), outro aprova (`kind: "APPROVAL"`,
 * `recommendationId` obrigatório) confirmando o mesmo `resolution`.
 * Quem recomendou não pode aprovar a própria recomendação (403 do
 * backend). Só a aprovação move o escrow.
 */
export function decideDisputeRequest(
  disputeId: string,
  payload: DisputeDecisionPayload,
  idempotencyKey: string,
) {
  return api.post<DisputeDecisionItem | (BackendDispute & { decision: DisputeDecisionItem })>(
    `/disputes/${disputeId}/decision`,
    payload,
    { idempotencyKey },
  );
}
