/** Papéis do backend — não mutuamente exclusivos, uma conta pode
 * acumular mais de um (ver [[21 - Integração com API Real]] §1). */
export type Role = "CLIENT" | "CASHIER" | "MEDIATOR" | "ADMIN";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** ISO 8601 — quando o `accessToken` expira. */
  expiresAt: string;
}

/** Resposta de `POST /auth/login` quando o fator de MFA está ativo —
 * segunda etapa exigida antes de emitir tokens (ver `/mfa`). */
export interface MfaRequiredResponse {
  mfaRequired: true;
  mfaToken: string;
}

export type LoginResponse = AuthTokens | MfaRequiredResponse;

export function isMfaRequired(response: LoginResponse): response is MfaRequiredResponse {
  return "mfaRequired" in response && response.mfaRequired === true;
}

/** Claims lidas do `accessToken` só pra UI (papel, identidade) — nunca
 * pra decisão de autorização, que é sempre do backend. Nomes de campo
 * ainda não confirmados contra o Swagger real (`/docs`); aceita tanto
 * `roles` (array) quanto `role` (string única) por segurança. */
export interface JwtClaims {
  sub: string;
  email?: string;
  roles?: Role[];
  role?: Role;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email?: string;
  roles: Role[];
}

export function userFromClaims(claims: JwtClaims): AuthUser {
  const roles = claims.roles ?? (claims.role ? [claims.role] : []);
  return { id: claims.sub, email: claims.email, roles };
}
