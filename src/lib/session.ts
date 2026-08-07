import { toast } from "sonner";

/**
 * Ponto único de tratamento de sessão expirada — hoje só mostra o aviso
 * e devolve a rota de destino; a partir do Sprint 4, o cliente HTTP
 * (`src/lib/api`) chama isto quando um request volta 401 depois de uma
 * tentativa de refresh via POST /auth/refresh já ter falhado, mantendo
 * o tratamento transparente pro resto da UI (nenhuma tela precisa saber
 * disso individualmente).
 */
export function notifySessionExpired() {
  toast.error("Sua sessão expirou", {
    description: "Entre novamente para continuar.",
  });
  return "/login" as const;
}
