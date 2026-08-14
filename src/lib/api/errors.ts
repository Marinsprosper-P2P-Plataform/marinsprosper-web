import type { ApiErrorBody } from "./types";

/**
 * Erro padronizado de toda chamada à API real. Duas regras do backend
 * moldam como isto é tratado na UI (ver [[21 - Integração com API Real]] §1):
 *
 * - 404 é a resposta pra "ordem alheia", nunca 403 — tanto HTTP quanto
 *   WebSocket. A UI não deve tentar diferenciar os dois casos; trate
 *   `status === 404` sempre como "não encontrada", nunca "sem permissão".
 * - 409 é conflito de estado (ordem mudou, idempotency key em corrida) —
 *   a ação correta é recarregar o recurso e reavaliar, não tentar de novo
 *   às cegas.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly body: ApiErrorBody | undefined;

  constructor(status: number, body: ApiErrorBody | undefined) {
    super(body?.message ?? `Erro na chamada à API (HTTP ${status})`);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code;
    this.body = body;
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isConflict() {
    return this.status === 409;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isValidationError() {
    return this.status === 400 || this.status === 422;
  }
}

/**
 * Erro antes de qualquer resposta HTTP chegar — cobre tanto falha de
 * rede/CORS de verdade quanto `NEXT_PUBLIC_API_URL` ausente
 * (`getApiBaseUrl()` lança dentro do mesmo `try` do `fetch`, ver
 * `client.ts`). As duas causas produzem a mesma mensagem genérica pro
 * usuário — já aconteceu de uma ser confundida com a outra (ver
 * [[21 - Integração com API Real]] §-1, "Correção"), então quem for
 * investigar um `ApiNetworkError` deve checar `.env.local` antes de
 * suspeitar de `CORS_ORIGINS`.
 */
export class ApiNetworkError extends Error {
  constructor(cause: unknown) {
    super(
      "Não foi possível contatar o servidor. Verifique sua conexão, o arquivo .env.local (NEXT_PUBLIC_API_URL) ou se a origem está liberada em CORS_ORIGINS.",
    );
    this.name = "ApiNetworkError";
    this.cause = cause;
  }
}
