/**
 * Ponto único de onde o cliente HTTP lê o access token — hoje sem
 * implementação (autenticação real ainda não está conectada, é o card
 * seguinte no Kanban). `src/lib/session.ts` documenta que o interceptor
 * de 401 deste cliente chama `notifySessionExpired()` quando o login
 * real existir; este módulo é o outro lado dessa ponte: quem loga chama
 * `setAccessTokenProvider` uma vez, o cliente HTTP nunca lê storage direto.
 */
let provider: (() => string | null) | null = null;

export function setAccessTokenProvider(fn: (() => string | null) | null): void {
  provider = fn;
}

export function getAccessToken(): string | null {
  return provider?.() ?? null;
}
