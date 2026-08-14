/**
 * Dinheiro e quantidade de ativo trafegam como string decimal ponta a
 * ponta (ex. "250.75") — o backend nunca manda `number` pra esses campos
 * e o front nunca deve convertê-los antes da exibição final (ver
 * [[21 - Integração com API Real]] §1). Alias só pra deixar essa
 * intenção visível nos tipos de request/response da API real.
 */
export type Decimal = string;

export interface ApiErrorBody {
  statusCode: number;
  message: string;
  error?: string;
  code?: string;
}
