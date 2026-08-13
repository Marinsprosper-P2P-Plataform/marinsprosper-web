"use client";

import { useMemo, useState } from "react";
import { PeriodFilter } from "@/components/shared/period-filter";
import { ReportBarChart, ReportLineChart } from "@/components/shared/report-charts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMockCollateral } from "@/lib/mock/collateral";
import {
  getAdminReportMetrics,
  resolvePeriodRange,
  type PeriodPreset,
  type PeriodRange,
} from "@/lib/mock/dashboard";
import { formatBRL, formatPercent } from "@/lib/mock/format";
import { useMockOrders } from "@/lib/mock/orders";

/** GET /dashboard/admin/platform — visão consolidada, sem isolamento
 * por usuário (mesmo princípio de `/admin/orders`: enxerga a
 * plataforma inteira). Mesma ressalva de RBAC documentada em
 * [[18 - Administração e Mediação]] — nenhuma tela de `/admin/*` tem
 * controle de acesso por papel ainda no protótipo. Ver
 * [[20 - Relatórios e Ganhos]] pra decisão de arquitetura completa
 * (tabela derivada, BullMQ, cache, rate limiting) que este cálculo
 * síncrono representa por enquanto. */
export default function AdminReportsPage() {
  const { orders } = useMockOrders();
  const { accounts } = useMockCollateral();

  const [preset, setPreset] = useState<PeriodPreset>("30d");
  const [custom, setCustom] = useState<PeriodRange>(() => resolvePeriodRange("30d"));

  const range = useMemo(
    () => (preset === "custom" ? custom : resolvePeriodRange(preset)),
    [preset, custom],
  );

  const metrics = useMemo(() => getAdminReportMetrics(orders, accounts, range), [orders, accounts, range]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Relatórios & Ganhos — plataforma</h1>
        <p className="text-muted-foreground text-sm">GMV, receita, lucro líquido e liquidez em custódia</p>
      </div>

      <PeriodFilter preset={preset} onPresetChange={setPreset} custom={custom} onCustomChange={setCustom} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="GMV (ordens concluídas)" value={formatBRL(metrics.gmvBRL)} />
        <StatCard label="Receita da plataforma" value={formatBRL(metrics.platformRevenueBRL)} />
        <StatCard label="Lucro líquido" value={formatBRL(metrics.netProfitBRL)} />
        <StatCard label="Liquidez em custódia" value={formatBRL(metrics.custodyLiquidityBRL)} />
        <StatCard label="Total de solicitações" value={String(metrics.totalRequests)} />
        <StatCard label="Ordens concluídas" value={String(metrics.completedOrders)} />
        <StatCard label="Ordens canceladas" value={String(metrics.cancelledOrders)} />
        <StatCard label="Taxa de cancelamento" value={formatPercent(metrics.cancelRate)} />
        <StatCard label="Taxa de conclusão" value={formatPercent(metrics.completionRate)} />
        <StatCard label="Ticket médio" value={formatBRL(metrics.averageTicketBRL)} />
        <StatCard label="Clientes distintos" value={String(metrics.distinctClients)} />
        <StatCard label="Caixeiros distintos" value={String(metrics.distinctCashiers)} />
        <StatCard label="Clientes recorrentes" value={formatPercent(metrics.repeatClientRate)} />
        <StatCard label="Disputas abertas" value={String(metrics.openDisputes)} />
      </div>

      <div className="border-border rounded-lg border p-4">
        <p className="mb-2 text-sm font-medium">GMV por dia (ordens concluídas)</p>
        <ReportLineChart
          data={metrics.gmvByDay.map((point) => ({ date: point.date, value: point.gmvBRL }))}
          label="GMV (R$)"
        />
      </div>

      <div className="border-border rounded-lg border p-4">
        <p className="mb-2 text-sm font-medium">Funil de conversão (ordens criadas no período)</p>
        <ReportBarChart data={metrics.funnel} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Comparativo mensal</h2>
        {metrics.monthlyComparison.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sem ordens concluídas no histórico ainda.</p>
        ) : (
          <div className="border-border overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>GMV</TableHead>
                  <TableHead>Ordens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.monthlyComparison.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell>{row.month}</TableCell>
                    <TableCell>{formatBRL(row.gmvBRL)}</TableCell>
                    <TableCell>{row.orders}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-muted-foreground text-xs">
          Sempre o histórico inteiro, mês a mês — não é recortado pelo filtro de período acima.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Alertas de anomalia</h2>
        {metrics.anomalyAlerts.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum padrão suspeito identificado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {metrics.anomalyAlerts.map((alert) => (
              <li key={alert.clientName} className="border-status-dispute/30 bg-status-dispute/10 rounded-lg border p-3 text-sm">
                {alert.clientName} — {alert.smallOrdersCount} ordens abaixo de R$ 200 no histórico
              </li>
            ))}
          </ul>
        )}
        <p className="text-muted-foreground text-xs">
          Sinal simples (≥3 ordens abaixo de R$ 200 no histórico do cliente), não é detecção de fraude de verdade —
          só chama atenção do admin pra investigar, mesmo espírito do estado `FROZEN_FOR_AUDIT`.
        </p>
      </section>

      <p className="text-muted-foreground text-xs">
        Liquidez em custódia é sempre o saldo atual de todas as contas — não varia com o período escolhido, já que o
        protótipo não guarda histórico diário de caução. Lucro líquido = receita da plataforma até existir um modelo
        de custos operacionais (Sprint 1+).
      </p>
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
