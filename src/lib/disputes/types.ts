/** Corpo de `POST /orders/:id/dispute` — só o motivo (10 a 2000
 * caracteres), conferido direto no `OpenDisputeDto` do `marinsprosper-api`. */
export interface OpenDisputePayload {
  reason: string;
}
