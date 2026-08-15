import { api } from "@/lib/api";
import type { CreateRatingPayload, UserReputation } from "./types";

/**
 * `POST /orders/:id/rating` — avalia a contraparte de uma ordem
 * encerrada (`COMPLETED`/`CANCELLED`, nunca `EXPIRED`). Uma vez por
 * ordem, imutável; quem cancelou a ordem recebe 403 (não avalia).
 */
export function rateOrderRequest(orderId: string, payload: CreateRatingPayload, idempotencyKey: string) {
  return api.post<{ id: string; score: number; comment: string | null }>(
    `/orders/${orderId}/rating`,
    payload,
    { idempotencyKey },
  );
}

/** `GET /users/:id/ratings` — pública, sem autenticação de papel
 * específico além do login. */
export function getUserReputationRequest(userId: string) {
  return api.get<UserReputation>(`/users/${userId}/ratings`);
}
