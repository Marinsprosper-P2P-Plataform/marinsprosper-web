import { api } from "@/lib/api";
import type { AuthTokens, LoginResponse } from "./types";

/**
 * Corpo/campos confirmados direto no Swagger real (`/docs-json`) do
 * ambiente de teste em 2026-08-14 — nomes diferem do que a doc textual
 * de [[21 - Integração com API Real]] descrevia em português
 * ("email/senha/nome/documento/telefone"):
 * `fullName`, `documentType` (`CPF`|`CNPJ`), `documentNumber`, `phone`
 * opcional, `password` com mínimo de **12** caracteres (não 8).
 */
export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  documentType: "CPF" | "CNPJ";
  documentNumber: string;
  phone?: string;
}

export function loginRequest(email: string, password: string) {
  return api.post<LoginResponse>("/auth/login", { email, password });
}

export function registerRequest(payload: RegisterPayload) {
  return api.post<void>("/auth/register", payload);
}

/** `refreshToken` viaja no corpo (não só como Bearer) — confirmado no
 * Swagger, `RefreshDto` com `refreshToken` de exatamente 64 caracteres. */
export function refreshRequest(refreshToken: string) {
  return api.post<AuthTokens>("/auth/refresh", { refreshToken });
}

/** Mesmo `RefreshDto` do refresh — o backend revoga a sessão associada
 * àquele refresh token específico, não "a sessão atual" de forma implícita. */
export function logoutRequest(refreshToken: string) {
  return api.post<void>("/auth/logout", { refreshToken });
}

/**
 * Segunda etapa do login com MFA — confirmado no Swagger: exige Bearer
 * com o `mfaToken` de vida curta devolvido pelo login (não o access token
 * normal, que ainda não existe nesse ponto), corpo só com `code`.
 */
export function mfaVerifyRequest(mfaToken: string, code: string) {
  return api.post<AuthTokens>(
    "/auth/mfa/verify",
    { code },
    { accessTokenOverride: mfaToken },
  );
}

/**
 * `POST /auth/mfa/recovery` não aparece no Swagger do ambiente de teste
 * (só `/auth/mfa/verify` está documentado) — implementado seguindo o
 * mesmo contrato descrito em [[21 - Integração com API Real]] §3
 * (código de recuperação no lugar do TOTP), mas sem confirmação direta;
 * se o backend não tiver essa rota ainda, a chamada volta 404 e a tela
 * de MFA trata como qualquer outro `ApiError`.
 */
export function mfaRecoveryRequest(mfaToken: string, code: string) {
  return api.post<AuthTokens>(
    "/auth/mfa/recovery",
    { code },
    { accessTokenOverride: mfaToken },
  );
}

// ---------------------------------------------------------------------
// Enrollment do segundo fator — distinto do desafio de login acima.
// Rotas exigem o access token normal (sessão já aberta), não o
// `mfaToken` de vida curta. Sem tela no protótipo mock ainda; vive em
// `/profile` agora (ver `mfa-settings.tsx`).
// ---------------------------------------------------------------------

export interface MfaStatus {
  /** Cadastrado e confirmado — login passa a exigir o segundo fator. */
  enabled: boolean;
  /** Cadastrado, ainda não confirmado (`activate` pendente). */
  pending: boolean;
  recoveryCodesRemaining: number;
}

export function mfaStatusRequest() {
  return api.get<MfaStatus>("/auth/mfa");
}

export interface MfaSetupResponse {
  /** Base32 — pra quem prefere digitar a chave em vez de ler o QR. */
  secret: string;
  /** `otpauth://` — vira QR code na interface (sem lib de QR ainda;
   * mostrado como texto/chave manual). */
  otpauthUri: string;
}

/** Gera o segredo — o fator nasce inativo até `activate` confirmar. */
export function mfaSetupRequest() {
  return api.post<MfaSetupResponse>("/auth/mfa/setup", undefined);
}

export interface MfaActivateResponse {
  confirmedAt: string;
  /** Mostrados uma única vez — não existe rota que os reexiba. */
  recoveryCodes: string[];
}

export function mfaActivateRequest(code: string) {
  return api.post<MfaActivateResponse>("/auth/mfa/activate", { code });
}

/** `code` aceita TOTP de 6 dígitos ou um código de recuperação — o
 * backend distingue pelo formato, não por um campo à parte. */
export function mfaDisableRequest(code: string) {
  return api.delete<void>("/auth/mfa", { body: { code } });
}
