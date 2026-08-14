import type { Order } from "@/types/order";

/**
 * Reputação agregada de uma conta — calculada na hora a partir de
 * `orders`, sem campo persistido em lugar nenhum (ver
 * [[16 - Perfil e Configurações]]). Reaproveitada por `/profile`,
 * `/offers` e o detalhe da ordem, pra não recalcular essa lógica em
 * três lugares diferentes.
 *
 * Limitação conhecida: `Order.rating` é um campo só por ordem, não
 * direcionado ("cliente avaliou o caixeiro" vs. o contrário) — então
 * a reputação aqui mistura os dois sentidos. Aceitável pro protótipo.
 */
export interface Reputation {
  average: number;
  count: number;
}

export function getUserReputation(orders: Order[], userId: string): Reputation | null {
  const rated = orders.filter(
    (order) =>
      order.status === "COMPLETED" &&
      typeof order.rating === "number" &&
      (order.clientId === userId || order.cashierId === userId),
  );
  if (rated.length === 0) return null;

  const average = rated.reduce((sum, order) => sum + (order.rating ?? 0), 0) / rated.length;
  return { average, count: rated.length };
}

/** Status considerados "concluídos" pra fim de taxa de conclusão — a
 * ordem chegou até o fim de algum jeito (sucesso ou não), não está mais
 * em andamento. Status em andamento não contam nem a favor nem contra. */
const CONCLUDED_STATUSES: Order["status"][] = [
  "COMPLETED",
  "CANCEL_ACCEPTED",
  "CANCEL_REJECTED",
  "DISPUTE_RESOLVED",
  "EXPIRED",
  "CLOSED",
];

export interface CounterpartyStats {
  ratingText: string;
  orderCountText: string;
  responseTimeText: string;
  completionRateText: string;
  statusText: string;
  /** Insumos crus, pra `riskAssessment` decidir sem re-parsear texto. */
  orderCount: number;
  average: number | null;
  completionRate: number | null;
}

/** Hash determinístico simples (djb2-like) — só pra derivar um "tempo
 * médio de resposta" e status online/offline estáveis por usuário, sem
 * precisar de um campo de verdade que o protótipo não tem. Mesmo ID
 * sempre produz o mesmo resultado, então a UI não pisca a cada render. */
function hashUserId(userId: string): number {
  let hash = 5381;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 33 + userId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

const FALLBACK_TEXT = "Sem dados";

/** Painel de reputação da contraparte — nome, nota, ordens concluídas,
 * tempo médio de resposta, taxa de conclusão e status online/offline,
 * todos com fallback quando não há histórico. Usado no detalhe da
 * ordem (`OrderDetail`) pro cliente/caixeiro avaliarem o risco antes de
 * seguir com a transferência. */
export function counterpartyStats(orders: Order[], userId: string): CounterpartyStats {
  const involved = orders.filter(
    (order) => order.clientId === userId || order.cashierId === userId,
  );
  const concluded = involved.filter((order) => CONCLUDED_STATUSES.includes(order.status));
  const completed = concluded.filter((order) => order.status === "COMPLETED");
  const reputation = getUserReputation(orders, userId);

  const hash = hashUserId(userId);
  const responseMinutes = 2 + (hash % 14); // 2–15 min, estável por conta
  const isOnline = hash % 2 === 0;

  return {
    ratingText: reputation ? `${reputation.average.toFixed(1)} ⭐ (${reputation.count})` : FALLBACK_TEXT,
    orderCountText: completed.length > 0 ? `${completed.length}` : FALLBACK_TEXT,
    responseTimeText: involved.length > 0 ? `~${responseMinutes} min` : "Não informado",
    completionRateText:
      concluded.length > 0
        ? `${Math.round((completed.length / concluded.length) * 100)}%`
        : "Não informado",
    statusText: involved.length > 0 ? (isOnline ? "Online" : "Offline") : "Não informado",
    orderCount: completed.length,
    average: reputation?.average ?? null,
    completionRate: concluded.length > 0 ? completed.length / concluded.length : null,
  };
}

export type RiskLevel = "baixo" | "medio" | "elevado" | "insuficiente";

export interface RiskAssessment {
  level: RiskLevel;
  label: string;
  guidance: string;
}

/** Selo de risco derivado de `counterpartyStats` — heurística simples
 * (sem modelo de fraude de verdade, isso é Sprint futuro), só pra dar
 * um sinal visual rápido antes de transferir. */
export function riskAssessment(stats: CounterpartyStats): RiskAssessment {
  if (stats.orderCount === 0 && stats.average === null) {
    return {
      level: "insuficiente",
      label: "Histórico insuficiente",
      guidance:
        "Esta conta ainda não tem ordens concluídas suficientes pra avaliar risco — redobre a atenção antes de transferir.",
    };
  }

  if (stats.orderCount < 3 || (stats.average !== null && stats.average < 4)) {
    return {
      level: "elevado",
      label: "Risco elevado",
      guidance:
        "Poucas ordens concluídas ou nota baixa — confirme a identidade do titular e considere valores menores antes de negociar de novo.",
    };
  }

  if (stats.orderCount >= 5 && stats.average !== null && stats.average >= 4.5) {
    return {
      level: "baixo",
      label: "Risco baixo",
      guidance: "Histórico consistente de ordens concluídas com boa avaliação.",
    };
  }

  return {
    level: "medio",
    label: "Risco médio",
    guidance: "Histórico razoável, mas ainda vale conferir os dados antes de transferir.",
  };
}
