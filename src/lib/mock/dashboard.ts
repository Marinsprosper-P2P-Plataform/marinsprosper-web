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

export type PeriodPreset = "today" | "yesterday" | "7d" | "30d" | "90d" | "ytd" | "custom";

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
    case "yesterday": {
      const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      const endOfYesterday = new Date(startOfToday.getTime() - 1);
      return { from: startOfYesterday, to: endOfYesterday };
    }
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

const DISPUTE_STATUSES = new Set<Order["status"]>(["DISPUTE_OPEN", "DISPUTE_UNDER_REVIEW"]);

function isCancelled(order: Order) {
  return order.status === "CANCEL_ACCEPTED";
}

/** Média ponderada — usada pra cotação média (ponderada pelo volume de
 * cada ordem) em vez de uma média simples que trataria uma ordem de
 * R$50 igual a uma de R$5000. */
function weightedAvg(items: { value: number; weight: number }[]): number {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 0;
  return items.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
}

/** Minutos entre `createdAt` e `updatedAt` — aproximação do tempo de
 * conclusão real (não temos timestamp por transição de status ainda,
 * só o `updatedAt` mais recente). */
function avgMinutes(orders: Order[]): number {
  const completed = orders.filter((order) => order.status === "COMPLETED");
  if (completed.length === 0) return 0;
  const totalMinutes = completed.reduce(
    (sum, order) => sum + (new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime()) / 60_000,
    0,
  );
  return totalMinutes / completed.length;
}

export function fmtMinutes(minutes: number): string {
  if (minutes <= 0) return "—";
  const totalMinutes = Math.round(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const rest = totalMinutes % 60;
  if (hours === 0) return `${rest} min`;
  return `${hours}h ${rest}min`;
}

/** Taxa de recorrência — fração de contrapartes distintas que aparecem
 * em mais de uma ordem. */
function repeatRate(orders: Order[], counterpartyIdOf: (order: Order) => string | undefined): number {
  const counts = new Map<string, number>();
  for (const order of orders) {
    const id = counterpartyIdOf(order);
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  if (counts.size === 0) return 0;
  const repeated = [...counts.values()].filter((count) => count > 1).length;
  return repeated / counts.size;
}

export interface CounterpartyRow {
  name: string;
  totalOrders: number;
  successRate: number;
}

/** Tabela de contrapartes — pra cada nome distinto do outro lado das
 * ordens do usuário, total de ordens e % concluídas com sucesso. */
export function counterpartyTable(orders: Order[], counterpartyNameOf: (order: Order) => string | undefined): CounterpartyRow[] {
  const byName = new Map<string, { total: number; completed: number }>();
  for (const order of orders) {
    const name = counterpartyNameOf(order);
    if (!name) continue;
    const entry = byName.get(name) ?? { total: 0, completed: 0 };
    entry.total += 1;
    if (order.status === "COMPLETED") entry.completed += 1;
    byName.set(name, entry);
  }
  return [...byName.entries()]
    .map(([name, { total, completed }]) => ({
      name,
      totalOrders: total,
      successRate: total > 0 ? completed / total : 0,
    }))
    .sort((a, b) => b.totalOrders - a.totalOrders);
}

export interface ClientReportMetrics {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  cancelRate: number;
  completionRate: number;
  volumeBRL: number;
  averageTicketBRL: number;
  distinctCashiers: number;
  openDisputes: number;
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
  const cancelled = own.filter(isCancelled);
  const engaged = own.filter((order) => CASHIER_ENGAGED_STATUSES.has(order.status));
  const volumeBRL = completed.reduce((sum, order) => sum + order.grossAmount, 0);
  const distinctCashiers = new Set(own.map((order) => order.cashierId).filter(Boolean)).size;

  return {
    totalOrders: own.length,
    completedOrders: completed.length,
    cancelledOrders: cancelled.length,
    cancelRate: own.length > 0 ? cancelled.length / own.length : 0,
    completionRate: engaged.length > 0 ? completed.length / engaged.length : 0,
    volumeBRL,
    averageTicketBRL: completed.length > 0 ? volumeBRL / completed.length : 0,
    distinctCashiers,
    openDisputes: own.filter((order) => DISPUTE_STATUSES.has(order.status)).length,
    ordersByDay: groupVolumeByDay(completed),
    // Sem slice(10) de propósito, diferente do caixeiro/admin — a tabela
    // de histórico do cliente tem filtros próprios (status, tipo,
    // caixeiro, busca por ID) que precisam de todo o período, não só
    // as 10 mais recentes.
    recentOrders: [...own].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export interface ClientFiscalMetrics {
  avgBuyQuoteBRL: number;
  avgSellQuoteBRL: number;
  totalVolumeUSDT: number;
  avgAcquisitionCostBRL: number;
  realizedPnLBRL: number;
  currentBalanceUSDT: number;
}

/** Seção Financeiro/Fiscal — cotação média ponderada por volume,
 * custo médio de aquisição (só compras) e lucro/prejuízo realizado
 * (vendido - custo médio de aquisição do que foi vendido). Aproximação
 * de contabilidade de custo médio (average cost), não FIFO/LIFO — mais
 * simples de calcular sem um livro-razão de lotes individuais. */
export function getClientFiscalMetrics(
  orders: Order[],
  userId: string,
  range: PeriodRange,
  collateralAccount: CollateralAccount | undefined,
): ClientFiscalMetrics {
  const own = filterByRange(
    orders.filter((order) => order.clientId === userId && order.status === "COMPLETED"),
    range,
  );
  const buys = own.filter((order) => order.type === "compra");
  const sells = own.filter((order) => order.type === "venda");

  const avgBuyQuoteBRL = weightedAvg(buys.map((order) => ({ value: order.quote, weight: order.netAmount })));
  const avgSellQuoteBRL = weightedAvg(sells.map((order) => ({ value: order.quote, weight: order.netAmount })));
  const totalVolumeUSDT = own.reduce((sum, order) => sum + order.netAmount, 0);
  const avgAcquisitionCostBRL = buys.length > 0 ? weightedAvg(buys.map((order) => ({ value: order.grossAmount / order.netAmount, weight: order.netAmount }))) : 0;
  const realizedPnLBRL = sells.reduce(
    (sum, order) => sum + (order.grossAmount - order.netAmount * avgAcquisitionCostBRL),
    0,
  );

  return {
    avgBuyQuoteBRL,
    avgSellQuoteBRL,
    totalVolumeUSDT,
    avgAcquisitionCostBRL,
    realizedPnLBRL,
    currentBalanceUSDT: collateralAccount?.available ?? 0,
  };
}

export interface OperationalMetrics {
  avgCompletionMinutes: number;
  largestOrderBRL: number;
  smallestOrderBRL: number;
  buyCount: number;
  sellCount: number;
}

function getOperationalMetrics(orders: Order[]): OperationalMetrics {
  const completed = orders.filter((order) => order.status === "COMPLETED");
  const amounts = completed.map((order) => order.grossAmount);

  return {
    avgCompletionMinutes: avgMinutes(orders),
    largestOrderBRL: amounts.length > 0 ? Math.max(...amounts) : 0,
    smallestOrderBRL: amounts.length > 0 ? Math.min(...amounts) : 0,
    buyCount: completed.filter((order) => order.type === "compra").length,
    sellCount: completed.filter((order) => order.type === "venda").length,
  };
}

export function getClientOperationalMetrics(orders: Order[], userId: string, range: PeriodRange): OperationalMetrics {
  return getOperationalMetrics(
    filterByRange(
      orders.filter((order) => order.clientId === userId),
      range,
    ),
  );
}

export function getCashierOperationalMetrics(orders: Order[], userId: string, range: PeriodRange): OperationalMetrics {
  return getOperationalMetrics(
    filterByRange(
      orders.filter((order) => order.cashierId === userId),
      range,
    ),
  );
}

/** Contrapartes do cliente — um caixeiro distinto por linha. */
export function getClientCounterpartyTable(orders: Order[], userId: string, range: PeriodRange): CounterpartyRow[] {
  const own = filterByRange(
    orders.filter((order) => order.clientId === userId && order.cashierName),
    range,
  );
  return counterpartyTable(own, (order) => order.cashierName);
}

/** Contrapartes do caixeiro — um cliente distinto por linha. */
export function getCashierCounterpartyTable(orders: Order[], userId: string, range: PeriodRange): CounterpartyRow[] {
  const engaged = filterByRange(
    orders.filter((order) => order.cashierId === userId),
    range,
  );
  return counterpartyTable(engaged, (order) => order.clientName);
}

/** Taxa de disputa — fração das ordens engajadas que passaram por
 * disputa (aberta, em análise ou resolvida), pro cliente/caixeiro ou
 * pra plataforma inteira quando `userId` é omitido. */
export function getDisputeRate(orders: Order[], range: PeriodRange, role?: "cliente" | "caixeiro", userId?: string): number {
  let scoped = filterByRange(orders, range);
  if (role === "cliente" && userId) scoped = scoped.filter((order) => order.clientId === userId);
  if (role === "caixeiro" && userId) scoped = scoped.filter((order) => order.cashierId === userId);

  const engaged = scoped.filter((order) => CASHIER_ENGAGED_STATUSES.has(order.status));
  if (engaged.length === 0) return 0;
  const disputed = engaged.filter(
    (order) => DISPUTE_STATUSES.has(order.status) || order.status === "DISPUTE_RESOLVED",
  );
  return disputed.length / engaged.length;
}

export interface CashierReportMetrics {
  completedOrders: number;
  cancelledOrders: number;
  cancelRate: number;
  completionRate: number;
  grossEarningsBRL: number;
  netEarningsBRL: number;
  averageTicketBRL: number;
  roiOnCollateral: number;
  collateralUtilization: number;
  distinctClients: number;
  repeatClientRate: number;
  openDisputes: number;
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
  const cancelled = engaged.filter(isCancelled);

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
    cancelledOrders: cancelled.length,
    cancelRate: engaged.length > 0 ? cancelled.length / engaged.length : 0,
    completionRate: engaged.length > 0 ? completed.length / engaged.length : 0,
    grossEarningsBRL,
    netEarningsBRL,
    averageTicketBRL: completed.length > 0 ? completed.reduce((sum, order) => sum + order.grossAmount, 0) / completed.length : 0,
    roiOnCollateral,
    collateralUtilization,
    distinctClients: new Set(engaged.map((order) => order.clientId)).size,
    repeatClientRate: repeatRate(engaged, (order) => order.clientId),
    openDisputes: engaged.filter((order) => DISPUTE_STATUSES.has(order.status)).length,
    earningsByDay: groupEarningsByDay(completed),
    recentOrders: [...engaged].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10),
  };
}

export interface ConversionFunnelStage {
  label: string;
  count: number;
}

export interface MonthlyComparisonRow {
  month: string;
  gmvBRL: number;
  orders: number;
}

export interface AnomalyAlert {
  clientName: string;
  smallOrdersCount: number;
}

export interface AdminReportMetrics {
  gmvBRL: number;
  platformRevenueBRL: number;
  netProfitBRL: number;
  custodyLiquidityBRL: number;
  totalRequests: number;
  completedOrders: number;
  cancelledOrders: number;
  cancelRate: number;
  completionRate: number;
  averageTicketBRL: number;
  distinctClients: number;
  distinctCashiers: number;
  repeatClientRate: number;
  openDisputes: number;
  gmvByDay: { date: string; gmvBRL: number }[];
  funnel: ConversionFunnelStage[];
  monthlyComparison: MonthlyComparisonRow[];
  anomalyAlerts: AnomalyAlert[];
}

/** Ordens pequenas repetidas do mesmo cliente — sinal simples (não é
 * detecção de fraude de verdade) pra chamar atenção do admin, mesmo
 * espírito de "sinalização AML" citado em `FROZEN_FOR_AUDIT`. Considera
 * o HISTÓRICO INTEIRO do cliente, não só o período filtrado — um padrão
 * de comportamento não deveria desaparecer só porque o filtro mudou. */
const ANOMALY_MIN_COUNT = 3;
const ANOMALY_MAX_AMOUNT_BRL = 200;

function getAnomalyAlerts(orders: Order[]): AnomalyAlert[] {
  const smallByClient = new Map<string, number>();
  for (const order of orders) {
    if (order.grossAmount >= ANOMALY_MAX_AMOUNT_BRL) continue;
    smallByClient.set(order.clientName, (smallByClient.get(order.clientName) ?? 0) + 1);
  }
  return [...smallByClient.entries()]
    .filter(([, count]) => count >= ANOMALY_MIN_COUNT)
    .map(([clientName, smallOrdersCount]) => ({ clientName, smallOrdersCount }))
    .sort((a, b) => b.smallOrdersCount - a.smallOrdersCount);
}

function getMonthlyComparison(orders: Order[]): MonthlyComparisonRow[] {
  const byMonth = new Map<string, { gmvBRL: number; orders: number }>();
  for (const order of orders) {
    if (order.status !== "COMPLETED") continue;
    const key = order.createdAt.slice(0, 7);
    const entry = byMonth.get(key) ?? { gmvBRL: 0, orders: 0 };
    entry.gmvBRL += order.grossAmount;
    entry.orders += 1;
    byMonth.set(key, entry);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { gmvBRL, orders: count }]) => ({ month, gmvBRL, orders: count }));
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
  const cancelled = created.filter(isCancelled);
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
    totalRequests: created.length,
    completedOrders: completed.length,
    cancelledOrders: cancelled.length,
    cancelRate: created.length > 0 ? cancelled.length / created.length : 0,
    completionRate: accepted.length > 0 ? completed.length / accepted.length : 0,
    averageTicketBRL: completed.length > 0 ? gmvBRL / completed.length : 0,
    distinctClients: new Set(created.map((order) => order.clientId)).size,
    distinctCashiers: new Set(created.map((order) => order.cashierId).filter(Boolean)).size,
    repeatClientRate: repeatRate(created, (order) => order.clientId),
    openDisputes: created.filter((order) => DISPUTE_STATUSES.has(order.status)).length,
    gmvByDay: groupVolumeByDay(completed).map(({ date, volumeBRL }) => ({ date, gmvBRL: volumeBRL })),
    funnel: [
      { label: "Criadas", count: created.length },
      { label: "Aceitas", count: accepted.length },
      { label: "Concluídas", count: completed.length },
      { label: "Canceladas/disputadas", count: cancelledOrDisputed.length },
    ],
    // Comparativo mensal e alertas de anomalia usam janelas próprias
    // (todo o histórico, mês a mês) — não fazem sentido recortados pelo
    // período do filtro, que é tipicamente menor que um mês.
    monthlyComparison: getMonthlyComparison(orders),
    anomalyAlerts: getAnomalyAlerts(orders),
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
