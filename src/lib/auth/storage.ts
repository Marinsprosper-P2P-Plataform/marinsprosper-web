import type { AuthTokens } from "./types";

/**
 * Persistência local dos tokens — só pra sobreviver a um reload de página
 * (o ambiente de teste não tem "sessão de servidor" nenhuma pro front se
 * apoiar). `try/catch` porque `localStorage` pode lançar em modo privado
 * de alguns navegadores (mesmo padrão de `src/lib/theme.tsx`).
 */
const STORAGE_KEY = "mp_auth_tokens";

export function readStoredTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

export function writeStoredTokens(tokens: AuthTokens): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // modo privado ou storage cheio — sessão só dura a aba atual.
  }
}

export function clearStoredTokens(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nada a fazer se nem remover funciona.
  }
}
