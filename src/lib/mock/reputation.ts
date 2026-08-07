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
