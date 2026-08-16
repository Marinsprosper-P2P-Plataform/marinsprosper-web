import { api } from "@/lib/api";
import type { CreateRatingPayload, ModerateRatingPayload, RatingModeration, UserReputation } from "./types";

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

/** `POST /ratings/:id/moderation` — só administração (checagem dentro
 * do service, não guard de classe: é a única rota restrita deste
 * controller). Esconder não apaga — a avaliação continua no banco,
 * cada ato de moderação fica registrado com motivo. `VISIBLE` reexibe
 * uma avaliação escondida antes. */
export function moderateRatingRequest(ratingId: string, payload: ModerateRatingPayload) {
  return api.post<RatingModeration>(`/ratings/${ratingId}/moderation`, payload);
}
