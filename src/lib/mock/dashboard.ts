import type { Order } from "@/types/order";
import type { CollateralAccount } from "./collateral";
import { computeCashierLimit } from "./collateral";

/**
 * Métricas de Relatórios & Ganhos — tudo derivado na hora a partir de
 * `orders`/`collateral`, mesmo princípio de `reputation.ts` (nenhum
 * campo persistido). No protótipo real (pós Sprint 1) isto seria a
 * tabela derivada `dashboard_metrics_daily`, alimentada por um job
 * assíncrono (BullMQ) a partir do `financial_ledger` — ver
 * [[20 - Relatórios e Ganhos]] pra decisão completa de arquitetura.
 * Calcular direto do ledger a cada request não escala; aqui, sem
 * volume real, calcular na hora é suficiente.
 */

/** 3% de taxa total, dividida 2,5% caixeiro / 0,5% plataforma — mesma
 * proporção documentada em `pricing.ts`. */
const CASHIER_FEE_SHARE = 2.5 / 3;
const PLATFORM_FEE_SHARE = 0.5 / 3;

/** Taxa de saque fake sobre o ganho do caixeiro — valor de referência
 * pro protótipo (mesmo espírito de `EXPOSURE_FACTOR`), não fechada com
 * o time. Existe só pra "líquido" ser um número diferente de "bruto"
 * na tela; a regra real de custo de saque é Sprint 2+ (custódia). */
const WITHDRAWAL_FEE_PERCENT = 1;

export type PeriodPreset = "today" | "7d" | "30d" | "90d" | "ytd" | "custom";

export interface PeriodRange {
  from: Date;
  to: Date;
}

export function resolvePeriodRange(preset: PeriodPreset, custom?: PeriodRange): PeriodRange {
  const to = new Date();
  const startOfToday = new Date(to.getFullYear(), to.getMonth(), to.getDate());

  switch (preset) {
    case "today":
      return { from: startOfToday, to };
    case "7d":
      return { from: new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000), to };
    case "30d":
      return { from: new Date(startOfToday.getTime() - 29 * 24 * 60 * 60 * 1000), to };
    case "90d":
      return { from: new Date(startOfToday.getTime() - 89 * 24 * 60 * 60 * 1000), to };
    case "ytd":
      return { from: new Date(to.getFullYear(), 0, 1), to };
    case "custom":
      return custom ?? { from: startOfToday, to };
  }
}

function withinRange(isoDate: string, range: PeriodRange) {
  const date = new Date(isoDate);
  return date >= range.from && date <= range.to;
}

function filterByRange(orders: Order[], range: PeriodRange) {
  return orders.filter((order) => withinRange(order.createdAt, range));
}

/** Ordens que efetivamente chegaram a ter um caixeiro (aceitas), pra
 * calcular taxa de conclusão sem contar `OPEN`/`DRAFT` como "perdida". */
const CASHIER_ENGAGED_STATUSES = new Set<Order["status"]>([
  "COMPLETED",
  "CANCEL_ACCEPTED",
  "DISPUTE_RESOLVED",
  "DISPUTE_OPEN",
  "DISPUTE_UNDER_REVIEW",
]);

export interface ClientReportMetrics {
  totalOrders: number;
  completedOrders: number;
  volumeBRL: number;
  averageTicketBRL: number;
  ordersByDay: { date: string; volumeBRL: number }[];
  recentOrders: Order[];
}

/** Relatório do cliente — histórico de ordens, volume negociado, ticket
 * médio. Isolamento: só considera ordens onde `order.clientId === userId`,
 * mesma checagem de participante de `order-detail.tsx`. */
export function getClientReportMetrics(orders: Order[], userId: string, range: PeriodRange): ClientReportMetrics {
  const own = filterByRange(
    orders.filter((order) => order.clientId === userId),
    range,
  );
  const completed = own.filter((order) => order.status === "COMPLETED");
  const volumeBRL = completed.reduce((sum, order) => sum + order.grossAmount, 0);

  return {
    totalOrders: own.length,
    completedOrders: completed.length,
    volumeBRL,
    averageTicketBRL: completed.length > 0 ? volumeBRL / completed.length : 0,
    ordersByDay: groupVolumeByDay(completed),
    recentOrders: [...own].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10),
  };
}

export interface CashierReportMetrics {
  completedOrders: number;
  completionRate: number;
  grossEarningsBRL: number;
  netEarningsBRL: number;
  roiOnCollateral: number;
  collateralUtilization: number;
  earningsByDay: { date: string; grossBRL: number }[];
  recentOrders: Order[];
}

/** Relatório do caixeiro — ganhos brutos/líquidos, ROI sobre caução,
 * utilização da caução, taxa de conclusão. Isolamento: só considera
 * ordens onde `order.cashierId === userId`. Utilização da caução é
 * sempre um retrato do saldo atual (`CollateralAccount` não guarda
 * histórico diário no protótipo) — não varia com o período escolhido,
 * diferente das outras métricas daqui. */
export function getCashierReportMetrics(
  orders: Order[],
  collateralAccount: CollateralAccount | undefined,
  userId: string,
  range: PeriodRange,
): CashierReportMetrics {
  const engaged = filterByRange(
    orders.filter((order) => order.cashierId === userId && CASHIER_ENGAGED_STATUSES.has(order.status)),
    range,
  );
  const completed = engaged.filter((order) => order.status === "COMPLETED");

  const grossEarningsBRL = completed.reduce((sum, order) => sum + order.feeAmount * CASHIER_FEE_SHARE, 0);
  const netEarningsBRL = grossEarningsBRL * (1 - WITHDRAWAL_FEE_PERCENT / 100);

  const { confirmedCollateral } = collateralAccount
    ? computeCashierLimit(collateralAccount)
    : { confirmedCollateral: 0 };
  const roiOnCollateral = confirmedCollateral > 0 ? netEarningsBRL / confirmedCollateral : 0;
  const collateralUtilization =
    collateralAccount && confirmedCollateral > 0
      ? (collateralAccount.reserved + collateralAccount.blocked) / confirmedCollateral
      : 0;

  return {
    completedOrders: completed.length,
    completionRate: engaged.length > 0 ? completed.length / engaged.length : 0,
    grossEarningsBRL,
    netEarningsBRL,
    roiOnCollateral,
    collateralUtilization,
    earningsByDay: groupEarningsByDay(completed),
    recentOrders: [...engaged].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10),
  };
}

export interface ConversionFunnelStage {
  label: string;
  count: number;
}

export interface AdminReportMetrics {
  gmvBRL: number;
  platformRevenueBRL: number;
  netProfitBRL: number;
  custodyLiquidityBRL: number;
  gmvByDay: { date: string; gmvBRL: number }[];
  funnel: ConversionFunnelStage[];
}

/** Painel do admin — GMV, receita da plataforma, lucro líquido, liquidez
 * em custódia, funil de conversão. Sem isolamento por usuário (visão
 * consolidada, mesmo princípio de `/admin/orders`). Liquidez em custódia
 * é sempre o saldo atual de todas as contas — instantâneo, não filtrado
 * pelo período (mesma ressalva da utilização de caução do caixeiro). */
export function getAdminReportMetrics(
  orders: Order[],
  collateralAccounts: CollateralAccount[],
  range: PeriodRange,
): AdminReportMetrics {
  const created = filterByRange(orders, range);
  const completed = created.filter((order) => order.status === "COMPLETED");
  const accepted = created.filter((order) => order.cashierId !== undefined);
  const cancelledOrDisputed = created.filter(
    (order) => order.status === "CANCEL_ACCEPTED" || order.status.startsWith("DISPUTE"),
  );

  const gmvBRL = completed.reduce((sum, order) => sum + order.grossAmount, 0);
  const platformRevenueBRL = completed.reduce((sum, order) => sum + order.feeAmount * PLATFORM_FEE_SHARE, 0);
  // Ainda não existe modelo de custos operacionais no protótipo (infra, KYC,
  // suporte) — lucro líquido = receita da plataforma até esse dado existir
  // (Sprint 1+, quando o ledger real tiver as contrapartidas de custo).
  const netProfitBRL = platformRevenueBRL;
  const custodyLiquidityBRL = collateralAccounts.reduce(
    (sum, account) => sum + computeCashierLimit(account).confirmedCollateral,
    0,
  );

  return {
    gmvBRL,
    platformRevenueBRL,
    netProfitBRL,
    custodyLiquidityBRL,
    gmvByDay: groupVolumeByDay(completed).map(({ date, volumeBRL }) => ({ date, gmvBRL: volumeBRL })),
    funnel: [
      { label: "Criadas", count: created.length },
      { label: "Aceitas", count: accepted.length },
      { label: "Concluídas", count: completed.length },
      { label: "Canceladas/disputadas", count: cancelledOrDisputed.length },
    ],
  };
}

function dayKey(isoDate: string) {
  return isoDate.slice(0, 10);
}

function groupVolumeByDay(orders: Order[]) {
  const byDay = new Map<string, number>();
  for (const order of orders) {
    const key = dayKey(order.createdAt);
    byDay.set(key, (byDay.get(key) ?? 0) + order.grossAmount);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, volumeBRL]) => ({ date, volumeBRL }));
}

function groupEarningsByDay(orders: Order[]) {
  const byDay = new Map<string, number>();
  for (const order of orders) {
    const key = dayKey(order.createdAt);
    byDay.set(key, (byDay.get(key) ?? 0) + order.feeAmount * CASHIER_FEE_SHARE);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, grossBRL]) => ({ date, grossBRL }));
}
