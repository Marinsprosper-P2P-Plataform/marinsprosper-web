/** Corpo de `POST /orders/:id/rating` — nota 1 a 5, comentário opcional
 * (até 1000 caracteres), conferido direto no `CreateRatingDto` do
 * `marinsprosper-api`. Imutável depois de enviada. */
export interface CreateRatingPayload {
  score: number;
  comment?: string;
}

/** Resposta de `GET /users/:id/ratings` — média calculada na leitura
 * (nunca guardada em coluna, ver `ratings.service.ts`), sobre as
 * avaliações ainda visíveis (não escondidas por moderação). */
export interface UserReputation {
  userId: string;
  count: number;
  /** Uma casa decimal; `null` sem nenhuma avaliação visível. */
  average: number | null;
  distribution: Array<{ score: number; count: number }>;
  /** Até 20 mais recentes. */
  latest: Array<{
    id: string;
    score: number;
    comment: string | null;
    createdAt: string;
  }>;
}
