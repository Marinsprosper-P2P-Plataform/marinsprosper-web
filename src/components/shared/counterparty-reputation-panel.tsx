import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  counterpartyStats,
  riskAssessment,
  type RiskLevel,
} from "@/lib/mock/reputation";
import type { Order } from "@/types/order";

/** Tailwind precisa das classes por extenso (ver mesmo comentário em
 * `order-status-badge.tsx`) — reaproveita os tokens `--status-*` já
 * corrigidos pro tema escuro em vez de inventar uma paleta nova. */
const RISK_CLASSES: Record<RiskLevel, string> = {
  baixo: "bg-status-completed text-status-completed-foreground",
  medio: "bg-status-progress text-status-progress-foreground",
  elevado: "bg-status-dispute text-status-dispute-foreground",
  insuficiente: "bg-status-expired text-status-expired-foreground",
};

/** Painel de reputação da contraparte + selo de risco — nome, nota,
 * ordens concluídas, tempo médio de resposta, taxa de conclusão e
 * status online/offline, todos com fallback quando não há histórico.
 * Fica no detalhe da ordem pra ajudar cliente/caixeiro a decidir se
 * seguem com a transferência. */
export function CounterpartyReputationPanel({
  counterpartyId,
  counterpartyName,
  orders,
}: {
  counterpartyId: string;
  counterpartyName: string;
  orders: Order[];
}) {
  const stats = counterpartyStats(orders, counterpartyId);
  const risk = riskAssessment(stats);

  return (
    <div className="flex flex-col gap-2">
      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">{counterpartyName}</h2>
          <Badge className={cn("border-transparent", RISK_CLASSES[risk.level])}>
            {risk.label}
          </Badge>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Avaliação</dt>
          <dd className="text-right">{stats.ratingText}</dd>
          <dt className="text-muted-foreground">Ordens concluídas</dt>
          <dd className="text-right">{stats.orderCountText}</dd>
          <dt className="text-muted-foreground">Tempo médio de resposta</dt>
          <dd className="text-right">{stats.responseTimeText}</dd>
          <dt className="text-muted-foreground">Taxa de conclusão</dt>
          <dd className="text-right">{stats.completionRateText}</dd>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="text-right">{stats.statusText}</dd>
        </dl>
      </div>
      <p className="text-muted-foreground px-1 text-xs">{risk.guidance}</p>
    </div>
  );
}
