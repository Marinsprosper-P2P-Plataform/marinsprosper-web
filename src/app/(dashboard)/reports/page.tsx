"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderStatusBadge, OrderTypeBadge } from "@/components/shared/order-status-badge";
import { PeriodFilter } from "@/components/shared/period-filter";
import { ReportLineChart } from "@/components/shared/report-charts";
import { useMockCollateral } from "@/lib/mock/collateral";
import {
  fmtMinutes,
  getCashierCounterpartyTable,
  getCashierOperationalMetrics,
  getCashierReportMetrics,
  getClientCounterpartyTable,
  getClientFiscalMetrics,
  getClientOperationalMetrics,
  getClientReportMetrics,
  getDisputeRate,
  resolvePeriodRange,
  type PeriodPreset,
  type PeriodRange,
} from "@/lib/mock/dashboard";
import { formatBRL, formatPercent, formatUSDT } from "@/lib/mock/format";
import { ORDER_STATUS_META, type Order, type OrderStatusCategory, type OrderType } from "@/types/order";
import { useMockOrders } from "@/lib/mock/orders";
import { useMockSession } from "@/lib/mock/session";

/** GET /dashboard/client/:userId + GET /dashboard/cashier/:userId —
 * rota única, papel derivado por conta (mesmo princípio de `/orders`:
 * a conta logada pode ser cliente e caixeiro ao mesmo tempo, então as
 * duas visões convivem em abas em vez de rotas separadas). Isolamento
 * de dados: cada aba só agrega ordens onde `user.id` é o participante
 * correspondente (`clientId`/`cashierId`) — mesma checagem usada em
 * `order-detail.tsx` contra IDOR. Ver [[20 - Relatórios e Ganhos]]. */
export default function ReportsPage() {
  const { orders } = useMockOrders();
  const { user } = useMockSession();
  const { getAccount } = useMockCollateral();

  const [preset, setPreset] = useState<PeriodPreset>("30d");
  const [custom, setCustom] = useState<PeriodRange>(() => resolvePeriodRange("30d"));

  const range = useMemo(
    () => (preset === "custom" ? custom : resolvePeriodRange(preset)),
    [preset, custom],
  );

  const account = getAccount(user.id);
  const clientMetrics = useMemo(() => getClientReportMetrics(orders, user.id, range), [orders, user.id, range]);
  const clientFiscal = useMemo(
    () => getClientFiscalMetrics(orders, user.id, range, account),
    [orders, user.id, range, account],
  );
  const clientOperational = useMemo(
    () => getClientOperationalMetrics(orders, user.id, range),
    [orders, user.id, range],
  );
  const clientCounterparties = useMemo(
    () => getClientCounterpartyTable(orders, user.id, range),
    [orders, user.id, range],
  );
  const clientDisputeRate = useMemo(
    () => getDisputeRate(orders, range, "cliente", user.id),
    [orders, range, user.id],
  );

  const cashierMetrics = useMemo(
    () => getCashierReportMetrics(orders, account, user.id, range),
    [orders, account, user.id, range],
  );
  const cashierOperational = useMemo(
    () => getCashierOperationalMetrics(orders, user.id, range),
    [orders, user.id, range],
  );
  const cashierCounterparties = useMemo(
    () => getCashierCounterpartyTable(orders, user.id, range),
    [orders, user.id, range],
  );
  const cashierDisputeRate = useMemo(
    () => getDisputeRate(orders, range, "caixeiro", user.id),
    [orders, range, user.id],
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Relatórios & Ganhos</h1>
        <p className="text-muted-foreground text-sm">
          Histórico e desempenho de {user.name} como cliente e como caixeiro
        </p>
      </div>

      <PeriodFilter preset={preset} onPresetChange={setPreset} custom={custom} onCustomChange={setCustom} />

      <Tabs defaultValue="cliente">
        <TabsList>
          <TabsTrigger value="cliente">Como cliente</TabsTrigger>
          <TabsTrigger value="caixeiro">Como caixeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="cliente" className="flex flex-col gap-6 pt-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Ordens no período" value={String(clientMetrics.totalOrders)} />
            <StatCard label="Ordens concluídas" value={String(clientMetrics.completedOrders)} />
            <StatCard label="Ordens canceladas" value={String(clientMetrics.cancelledOrders)} />
            <StatCard label="Taxa de cancelamento" value={formatPercent(clientMetrics.cancelRate)} />
            <StatCard label="Taxa de conclusão" value={formatPercent(clientMetrics.completionRate)} />
            <StatCard label="Volume negociado" value={formatBRL(clientMetrics.volumeBRL)} />
            <StatCard label="Ticket médio" value={formatBRL(clientMetrics.averageTicketBRL)} />
            <StatCard label="Caixeiros distintos" value={String(clientMetrics.distinctCashiers)} />
            <StatCard label="Disputas abertas" value={String(clientMetrics.openDisputes)} />
          </div>

          <div className="border-border rounded-lg border p-4">
            <p className="mb-2 text-sm font-medium">Volume negociado por dia (ordens concluídas)</p>
            <ReportLineChart
              data={clientMetrics.ordersByDay.map((point) => ({ date: point.date, value: point.volumeBRL }))}
              label="Volume (R$)"
            />
          </div>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium">Financeiro / Fiscal</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportFiscalReportCsv(user.name, range, clientFiscal)}
              >
                Exportar
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Cotação média de compra" value={formatBRL(clientFiscal.avgBuyQuoteBRL) + "/USDT"} />
              <StatCard label="Cotação média de venda" value={formatBRL(clientFiscal.avgSellQuoteBRL) + "/USDT"} />
              <StatCard label="Volume total" value={formatUSDT(clientFiscal.totalVolumeUSDT)} />
              <StatCard label="Custo médio de aquisição" value={formatBRL(clientFiscal.avgAcquisitionCostBRL) + "/USDT"} />
              <StatCard label="Lucro/prejuízo realizado" value={formatBRL(clientFiscal.realizedPnLBRL)} />
              <StatCard label="Saldo atual" value={formatUSDT(clientFiscal.currentBalanceUSDT)} />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Operacional</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Tempo médio de conclusão" value={fmtMinutes(clientOperational.avgCompletionMinutes)} />
              <StatCard label="Maior ordem" value={formatBRL(clientOperational.largestOrderBRL)} />
              <StatCard label="Menor ordem" value={formatBRL(clientOperational.smallestOrderBRL)} />
              <StatCard label="Compra × venda" value={`${clientOperational.buyCount} × ${clientOperational.sellCount}`} />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Contrapartes</h2>
            <p className="text-muted-foreground text-xs">
              Taxa de disputa com este cliente: {formatPercent(clientDisputeRate)}
            </p>
            <CounterpartyTable rows={clientCounterparties} counterpartyLabel="Caixeiro" />
          </section>

          <ClientHistoryTable orders={clientMetrics.recentOrders} userId={user.id} />
        </TabsContent>

        <TabsContent value="caixeiro" className="flex flex-col gap-6 pt-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Ganhos brutos" value={formatBRL(cashierMetrics.grossEarningsBRL)} />
            <StatCard label="Ganhos líquidos" value={formatBRL(cashierMetrics.netEarningsBRL)} />
            <StatCard label="Ticket médio" value={formatBRL(cashierMetrics.averageTicketBRL)} />
            <StatCard label="ROI sobre caução" value={formatPercent(cashierMetrics.roiOnCollateral)} />
            <StatCard label="Utilização da caução" value={formatPercent(cashierMetrics.collateralUtilization)} />
            <StatCard label="Taxa de conclusão" value={formatPercent(cashierMetrics.completionRate)} />
            <StatCard label="Ordens canceladas" value={String(cashierMetrics.cancelledOrders)} />
            <StatCard label="Taxa de cancelamento" value={formatPercent(cashierMetrics.cancelRate)} />
            <StatCard label="Clientes distintos" value={String(cashierMetrics.distinctClients)} />
            <StatCard label="Clientes recorrentes" value={formatPercent(cashierMetrics.repeatClientRate)} />
            <StatCard label="Disputas abertas" value={String(cashierMetrics.openDisputes)} />
          </div>

          <div className="border-border rounded-lg border p-4">
            <p className="mb-2 text-sm font-medium">Ganhos brutos por dia (ordens concluídas)</p>
            <ReportLineChart
              data={cashierMetrics.earningsByDay.map((point) => ({ date: point.date, value: point.grossBRL }))}
              label="Ganho (R$)"
            />
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Operacional</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Tempo médio de conclusão" value={fmtMinutes(cashierOperational.avgCompletionMinutes)} />
              <StatCard label="Maior ordem" value={formatBRL(cashierOperational.largestOrderBRL)} />
              <StatCard label="Menor ordem" value={formatBRL(cashierOperational.smallestOrderBRL)} />
              <StatCard label="Compra × venda" value={`${cashierOperational.buyCount} × ${cashierOperational.sellCount}`} />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Contrapartes</h2>
            <p className="text-muted-foreground text-xs">
              Taxa de disputa com este caixeiro: {formatPercent(cashierDisputeRate)}
            </p>
            <CounterpartyTable rows={cashierCounterparties} counterpartyLabel="Cliente" />
          </section>

          <OrdersTable orders={cashierMetrics.recentOrders} userId={user.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border rounded-lg border p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

function CounterpartyTable({
  rows,
  counterpartyLabel,
}: {
  rows: { name: string; totalOrders: number; successRate: number }[];
  counterpartyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhuma contraparte no período selecionado.</p>;
  }

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{counterpartyLabel}</TableHead>
            <TableHead>Total de ordens</TableHead>
            <TableHead>Taxa de sucesso</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.totalOrders}</TableCell>
              <TableCell>{formatPercent(row.successRate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const STATUS_CATEGORY_LABEL: Record<OrderStatusCategory, string> = {
  open: "Aberta",
  progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
  dispute: "Em disputa",
  expired: "Expirada",
};

/** Histórico do cliente com filtros — status (por categoria), tipo,
 * caixeiro e busca por ID público. Diferente do histórico do caixeiro
 * (`OrdersTable` abaixo), que continua simples/sem filtro. */
function ClientHistoryTable({ orders, userId }: { orders: Order[]; userId: string }) {
  const [statusFilter, setStatusFilter] = useState<OrderStatusCategory | "todas">("todas");
  const [typeFilter, setTypeFilter] = useState<OrderType | "todas">("todas");
  const [cashierFilter, setCashierFilter] = useState<string>("todas");
  const [search, setSearch] = useState("");

  const cashierOptions = useMemo(
    () => [...new Set(orders.map((order) => order.cashierName).filter((name): name is string => !!name))],
    [orders],
  );

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== "todas" && ORDER_STATUS_META[order.status].category !== statusFilter) return false;
      if (typeFilter !== "todas" && order.type !== typeFilter) return false;
      if (cashierFilter !== "todas" && order.cashierName !== cashierFilter) return false;
      if (normalizedSearch && !order.publicId.toLowerCase().includes(normalizedSearch)) return false;
      return true;
    });
  }, [orders, statusFilter, typeFilter, cashierFilter, search]);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">Histórico de ordens</h2>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por ID público"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-auto max-w-[220px]"
        />
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatusCategory | "todas")}>
          <SelectTrigger className="w-auto"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os status</SelectItem>
            {(Object.keys(STATUS_CATEGORY_LABEL) as OrderStatusCategory[]).map((category) => (
              <SelectItem key={category} value={category}>{STATUS_CATEGORY_LABEL[category]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as OrderType | "todas")}>
          <SelectTrigger className="w-auto"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Compra e venda</SelectItem>
            <SelectItem value="compra">Compra</SelectItem>
            <SelectItem value="venda">Venda</SelectItem>
          </SelectContent>
        </Select>
        {cashierOptions.length > 0 && (
          <Select value={cashierFilter} onValueChange={setCashierFilter}>
            <SelectTrigger className="w-auto"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os caixeiros</SelectItem>
              {cashierOptions.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma ordem encontrada com esses filtros.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.slice(0, 20).map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="border-border hover:bg-accent flex flex-col gap-2 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <OrderTypeBadge type={order.type} />
                    <span className="text-muted-foreground text-xs">{order.publicId}</span>
                    <Badge variant="outline" className="text-[0.65rem]">
                      {order.clientId === userId ? "Como cliente" : "Como caixeiro"}
                    </Badge>
                  </div>
                  <p className="text-sm">{formatBRL(order.grossAmount)}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OrdersTable({ orders, userId }: { orders: Order[]; userId: string }) {
  if (orders.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhuma ordem no período selecionado.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Ordens recentes no período</p>
      <ul className="flex flex-col gap-2">
        {orders.map((order) => {
          const asClient = order.clientId === userId;
          return (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="border-border hover:bg-accent flex flex-col gap-2 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <OrderTypeBadge type={order.type} />
                    <span className="text-muted-foreground text-xs">{order.publicId}</span>
                    <Badge variant="outline" className="text-[0.65rem]">
                      {asClient ? "Como cliente" : "Como caixeiro"}
                    </Badge>
                  </div>
                  <p className="text-sm">{formatBRL(order.grossAmount)}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Exporta o resumo Financeiro/Fiscal como CSV — sem backend nenhum
 * envolvido, mesmo espírito do resto do protótipo: gerado no cliente a
 * partir do que já está calculado na tela. */
function exportFiscalReportCsv(
  userName: string,
  range: PeriodRange,
  fiscal: ReturnType<typeof getClientFiscalMetrics>,
) {
  const rows = [
    ["Métrica", "Valor"],
    ["Cotação média de compra (R$/USDT)", fiscal.avgBuyQuoteBRL.toFixed(4)],
    ["Cotação média de venda (R$/USDT)", fiscal.avgSellQuoteBRL.toFixed(4)],
    ["Volume total (USDT)", fiscal.totalVolumeUSDT.toFixed(6)],
    ["Custo médio de aquisição (R$/USDT)", fiscal.avgAcquisitionCostBRL.toFixed(4)],
    ["Lucro/prejuízo realizado (R$)", fiscal.realizedPnLBRL.toFixed(2)],
    ["Saldo atual (USDT)", fiscal.currentBalanceUSDT.toFixed(6)],
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-fiscal-${userName.replace(/\s+/g, "-").toLowerCase()}-${range.from.toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
