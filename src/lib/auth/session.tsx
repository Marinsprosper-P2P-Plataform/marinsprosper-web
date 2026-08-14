"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { setAccessTokenProvider, setUnauthorizedHandler } from "@/lib/api";
import { notifySessionExpired } from "@/lib/session";
import {
  loginRequest,
  logoutRequest,
  mfaRecoveryRequest,
  mfaVerifyRequest,
  refreshRequest,
  registerRequest,
  type RegisterPayload,
} from "./api";
import { decodeJwtPayload } from "./jwt";
import { clearStoredTokens, readStoredTokens, writeStoredTokens } from "./storage";
import {
  isMfaRequired,
  userFromClaims,
  type AuthTokens,
  type AuthUser,
  type JwtClaims,
} from "./types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type LoginResult = { ok: true } | { mfaRequired: true; mfaToken: string };

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login(email: string, password: string): Promise<LoginResult>;
  completeMfa(mfaToken: string, code: string, recovery?: boolean): Promise<void>;
  register(payload: RegisterPayload): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function userFromAccessToken(accessToken: string): AuthUser | null {
  const claims = decodeJwtPayload<JwtClaims>(accessToken);
  return claims ? userFromClaims(claims) : null;
}

function isExpired(tokens: AuthTokens): boolean {
  const claims = decodeJwtPayload<JwtClaims>(tokens.accessToken);
  return claims?.exp !== undefined && claims.exp * 1000 <= Date.now();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // Lido uma única vez, na primeira renderização (mount) — computar aqui
  // em vez de num useEffect evita o "flash" de unauthenticated antes da
  // hidratação e não dispara setState síncrono dentro de efeito.
  // Cada useState/useRef abaixo lê o storage de novo por conta própria —
  // barato (chamado só no mount) e evita ler `.current` de um ref durante
  // a renderização (proibido pelas regras dos hooks).
  const tokensRef = useRef<AuthTokens | null>(readStoredTokens());
  const refreshInFlight = useRef<Promise<AuthTokens> | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => {
    const stored = readStoredTokens();
    if (!stored) return "unauthenticated";
    return isExpired(stored) ? "loading" : "authenticated";
  });
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = readStoredTokens();
    if (!stored || isExpired(stored)) return null;
    return userFromAccessToken(stored.accessToken);
  });

  const applySession = useCallback((tokens: AuthTokens) => {
    tokensRef.current = tokens;
    writeStoredTokens(tokens);
    setUser(userFromAccessToken(tokens.accessToken));
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback(() => {
    tokensRef.current = null;
    clearStoredTokens();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const refresh = useCallback(async (): Promise<AuthTokens> => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const current = tokensRef.current;
    if (!current) throw new Error("Sem sessão pra renovar");

    const promise = refreshRequest(current.refreshToken)
      .then(({ data }) => {
        applySession(data);
        return data;
      })
      .finally(() => {
        refreshInFlight.current = null;
      });
    refreshInFlight.current = promise;
    return promise;
  }, [applySession]);

  // Se o access token guardado já tinha expirado no momento da
  // hidratação (status inicial "loading"), tenta renovar uma vez antes
  // de decidir se a sessão sobrevive ao reload.
  useEffect(() => {
    if (status !== "loading") return;
    refresh().catch(() => clearSession());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAccessTokenProvider(() => tokensRef.current?.accessToken ?? null);
    setUnauthorizedHandler(async () => {
      try {
        await refresh();
      } catch {
        clearSession();
        const destination = notifySessionExpired();
        router.push(destination);
      }
    });
    return () => {
      setAccessTokenProvider(null);
      setUnauthorizedHandler(null);
    };
  }, [refresh, clearSession, router]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const { data } = await loginRequest(email, password);
    if (isMfaRequired(data)) {
      return { mfaRequired: true, mfaToken: data.mfaToken };
    }
    applySession(data);
    return { ok: true };
  }, [applySession]);

  const completeMfa = useCallback(
    async (mfaToken: string, code: string, recovery = false) => {
      const { data } = await (recovery
        ? mfaRecoveryRequest(mfaToken, code)
        : mfaVerifyRequest(mfaToken, code));
      applySession(data);
    },
    [applySession],
  );

  const register = useCallback(async (payload: RegisterPayload) => {
    await registerRequest(payload);
  }, []);

  const logout = useCallback(async () => {
    const current = tokensRef.current;
    clearSession();
    if (current) {
      // Best-effort — mesmo se a chamada falhar (rede, token já expirado),
      // a sessão local já foi limpa acima e o usuário já está deslogado.
      await logoutRequest(current.refreshToken).catch(() => {});
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, completeMfa, register, logout }),
    [status, user, login, completeMfa, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
