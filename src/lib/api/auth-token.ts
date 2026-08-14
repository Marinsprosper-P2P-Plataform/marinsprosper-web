/**
 * Ponte entre o cliente HTTP (`./client`) e a sessão real de autenticação
 * (`src/lib/auth/session.tsx`) — o cliente nunca lê storage/JWT direto,
 * só chama estes dois pontos de extensão, registrados uma vez pelo
 * `AuthProvider` quando ele monta.
 */
let tokenProvider: (() => string | null) | null = null;
let unauthorizedHandler: (() => void | Promise<void>) | null = null;

export function setAccessTokenProvider(fn: (() => string | null) | null): void {
  tokenProvider = fn;
}

export function getAccessToken(): string | null {
  return tokenProvider?.() ?? null;
}

/** Chamado pelo `AuthProvider` quando monta — tenta um refresh e só chama
 * `notifySessionExpired()` (`src/lib/session.ts`) se o refresh também
 * falhar. `null` desregistra (ex. no unmount). */
export function setUnauthorizedHandler(fn: (() => void | Promise<void>) | null): void {
  unauthorizedHandler = fn;
}

/** Chamado por `apiFetch` sempre que uma resposta vem 401. */
export async function triggerUnauthorized(): Promise<void> {
  await unauthorizedHandler?.();
}
