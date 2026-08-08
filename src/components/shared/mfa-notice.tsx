import { ShieldAlertIcon } from "lucide-react";

/**
 * Indicação de MFA obrigatório pra ações administrativas críticas —
 * só a indicação visual mesmo, sem fluxo de MFA de verdade (isso é
 * backend, Sprint 4). Cobre o card "Indicação de MFA obrigatório" do
 * bucket Administração & Mediação. Colocado perto de cada botão de
 * ação crítica (aprovar cadastro, incluir na blacklist, resolver
 * disputa), não como um banner genérico no topo da página.
 */
export function MfaNotice() {
  return (
    <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <ShieldAlertIcon className="size-3.5 shrink-0" />
      Ação crítica — em produção exige MFA e reforço de autenticação.
    </p>
  );
}
