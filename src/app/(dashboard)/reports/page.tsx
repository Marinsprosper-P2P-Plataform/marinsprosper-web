"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { PeriodFilter } from "@/components/shared/period-filter";
import { ReportLineChart } from "@/components/shared/report-charts";
import { useMockCollateral } from "@/lib/mock/collateral";
import {
  getCashierReportMetrics,
  getClientReportMetrics,
  resolvePeriodRange,
  type PeriodPreset,
  type PeriodRange,
} from "@/lib/mock/dashboard";
import { formatBRL, formatPercent } from "@/lib/mock/format";
import { useMockOrders } from "@/lib/mock/orders";
import { useMockSession } from "@/lib/mock/session";
import type { Order } from "@/types/order";

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

  const clientMetrics = useMemo(
    () => getClientReportMetrics(orders, user.id, range),
    [orders, user.id, range],
  );
  const cashierMetrics = useMemo(
    () => getCashierReportMetrics(orders, getAccount(user.id), user.id, range),
    [orders, getAccount, user.id, range],
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

        <TabsContent value="cliente" className="flex flex-col gap-4 pt-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Ordens no período" value={String(clientMetrics.totalOrders)} />
            <StatCard label="Ordens concluídas" value={String(clientMetrics.completedOrders)} />
            <StatCard label="Volume negociado" value={formatBRL(clientMetrics.volumeBRL)} />
            <StatCard label="Ticket médio" value={formatBRL(clientMetrics.averageTicketBRL)} />
          </div>

          <div className="border-border rounded-lg border p-4">
            <p className="mb-2 text-sm font-medium">Volume negociado por dia (ordens concluídas)</p>
            <ReportLineChart
              data={clientMetrics.ordersByDay.map((point) => ({ date: point.date, value: point.volumeBRL }))}
              label="Volume (R$)"
            />
          </div>

          <OrdersTable orders={clientMetrics.recentOrders} userId={user.id} />
        </TabsContent>

        <TabsContent value="caixeiro" className="flex flex-col gap-4 pt-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatCard label="Ganhos brutos" value={formatBRL(cashierMetrics.grossEarningsBRL)} />
            <StatCard label="Ganhos líquidos" value={formatBRL(cashierMetrics.netEarningsBRL)} />
            <StatCard label="ROI sobre caução" value={formatPercent(cashierMetrics.roiOnCollateral)} />
            <StatCard label="Utilização da caução" value={formatPercent(cashierMetrics.collateralUtilization)} />
            <StatCard label="Taxa de conclusão" value={formatPercent(cashierMetrics.completionRate)} />
          </div>

          <div className="border-border rounded-lg border p-4">
            <p className="mb-2 text-sm font-medium">Ganhos brutos por dia (ordens concluídas)</p>
            <ReportLineChart
              data={cashierMetrics.earningsByDay.map((point) => ({ date: point.date, value: point.grossBRL }))}
              label="Ganho (R$)"
            />
          </div>

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
                    <span className="text-muted-foreground text-xs">{order.publicId}</span>
                    <Badge variant="outline" className="text-[0.65rem]">
                      {asClient ? "Como cliente" : "Como caixeiro"}
                    </Badge>
                  </div>
                  <p className="text-sm">
                    {order.type === "compra" ? "Compra" : "Venda"} — {formatBRL(order.grossAmount)}
                  </p>
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
