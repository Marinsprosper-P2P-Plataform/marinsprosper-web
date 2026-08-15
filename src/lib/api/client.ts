import { getAccessToken, triggerUnauthorized } from "./auth-token";
import { getApiBaseUrl } from "./config";
import { ApiError, ApiNetworkError } from "./errors";
import type { ApiErrorBody } from "./types";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface ApiFetchOptions {
  method?: HttpMethod;
  /** Corpo serializado como JSON. Campos monetários devem chegar aqui já
   * como string decimal (`Decimal` em `./types`) — este cliente nunca
   * converte number↔string, só repassa o corpo. `FormData` passa direto,
   * sem `JSON.stringify` nem `Content-Type` manual (o browser define o
   * boundary do multipart sozinho) — único jeito de mandar arquivo
   * (evidência de disputa, `POST /disputes/:id/evidence`). */
  body?: unknown;
  /** Só as rotas marcadas ⚡ em [[21 - Integração com API Real]] §3
   * exigem isto (escritas financeiras) — as demais escritas (ex. auth)
   * não mandam o header. Gere com `generateIdempotencyKey`/
   * `createIdempotencyKeyManager` de `./idempotency`: mesma chave em
   * retry da mesma ação, nova chave em ação nova. */
  idempotencyKey?: string;
  /** Sobrescreve o access token da sessão pra esta chamada — só existe
   * pro passo intermediário de `POST /auth/mfa/verify`/`recovery`, que
   * exige Bearer com o `mfaToken` de vida curta devolvido pelo login,
   * nunca o access token normal (ainda não emitido nesse ponto). */
  accessTokenOverride?: string;
  signal?: AbortSignal;
}

export interface ApiFetchResult<T> {
  data: T;
  /** `true` quando o backend serviu uma resposta já processada antes
   * (header `Idempotent-Replayed`), útil pra UI não duplicar feedback
   * de "ação concluída" num retry que na verdade não fez nada de novo. */
  replayed: boolean;
}

async function parseErrorBody(response: Response): Promise<ApiErrorBody | undefined> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return undefined;
  }
}

/**
 * Cliente HTTP único pra `marinsprosper-api`. Base URL sempre a VM de
 * teste/produção via `NEXT_PUBLIC_API_URL` — nunca `localhost` (ver
 * [[21 - Integração com API Real]] §0). Sem retry automático embutido:
 * quem chama decide se tenta de novo, e reusa a mesma `idempotencyKey`
 * quando o fizer.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<ApiFetchResult<T>> {
  const { method = "GET", body, idempotencyKey, accessTokenOverride, signal } = options;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const token = accessTokenOverride ?? getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    // Cobre tanto falha de rede/CORS de verdade quanto `getApiBaseUrl()`
    // lançando por `NEXT_PUBLIC_API_URL` ausente (`.env.local` não
    // configurado) — nenhum dos dois casos chega a ter resposta HTTP,
    // então caem aqui, não no branch de erro abaixo. Ver `ApiNetworkError`.
    throw new ApiNetworkError(cause);
  }

  const replayed = response.headers.get("Idempotent-Replayed") === "true";

  if (!response.ok) {
    const errorBody = await parseErrorBody(response);
    if (response.status === 401) {
      // Dispara o interceptor registrado pelo AuthProvider (tenta refresh;
      // só chama notifySessionExpired() se o refresh falhar também) —
      // fire-and-forget, a chamada atual continua rejeitando como ApiError.
      void triggerUnauthorized();
    }
    throw new ApiError(response.status, errorBody);
  }

  if (response.status === 204) {
    return { data: undefined as T, replayed };
  }

  const data = (await response.json()) as T;
  return { data, replayed };
}

export const api = {
  get: <T>(path: string, options?: Omit<ApiFetchOptions, "method">) =>
    apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body: unknown, options?: Omit<ApiFetchOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body: unknown, options?: Omit<ApiFetchOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<ApiFetchOptions, "method">) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};
