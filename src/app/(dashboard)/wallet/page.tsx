"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRightIcon, ClockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DepositDialog } from "./deposit-dialog";
import { WithdrawDialog } from "./withdraw-dialog";
import { useMockAuditLog } from "@/lib/mock/audit-log";
import { EXPOSURE_FACTOR, computeCashierLimit, useMockCollateral } from "@/lib/mock/collateral";
import { useMockSession } from "@/lib/mock/session";
import { formatUSDT } from "@/lib/mock/format";

/**
 * GET /cashier/collateral + GET /cashier/limit — protótipo com dados
 * fake. Cobre o card "Carteira & Caução — visão do Caixeiro" do
 * [[Kanban]]. Sete saldos separados (nunca um único campo de saldo,
 * [[03 - Modelo de Dados]] seção 2) + limite sempre derivado via
 * `computeCashierLimit`, nunca um número calculado na tela.
 */
export default function WalletPage() {
  const { user } = useMockSession();
  const { getAccount, initiateDeposit, confirmDeposit, requestWithdrawal, confirmWithdrawal } = useMockCollateral();
  const { logEvent } = useMockAuditLog();
  const account = getAccount(user.id);
  const scheduledDepositsRef = useRef(new Set<string>());
  const scheduledWithdrawalsRef = useRef(new Set<string>());

  // Confirmação on-chain simulada: cada depósito pendente agenda seu
  // próprio timeout até `confirmAt`, sem duplicar entre re-renders
  // (mesmo cuidado do `PaymentCountdown`, só que pra vários itens).
  useEffect(() => {
    if (!account) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const deposit of account.pendingDeposits) {
      if (scheduledDepositsRef.current.has(deposit.id)) continue;
      scheduledDepositsRef.current.add(deposit.id);

      const delay = Math.max(0, new Date(deposit.confirmAt).getTime() - Date.now());
      const timer = setTimeout(() => {
        confirmDeposit(user.id, deposit.id);
        logEvent({
          category: "on-chain",
          actor: "sistema",
          action: "Depósito de caução confirmado",
          target: `${user.name} (@${user.username})`,
          details: `${formatUSDT(deposit.amount)} confirmados na rede TRC20 (simulado).`,
        });
        toast.success(`Depósito de ${formatUSDT(deposit.amount)} confirmado on-chain`);
      }, delay);
      timers.push(timer);
    }

    return () => timers.forEach(clearTimeout);
  }, [account, confirmDeposit, logEvent, user.id, user.name, user.username]);

  // Mesmo padrão acima, pro caminho inverso: saque sai de `available`
  // na hora do pedido (ver `REQUEST_WITHDRAWAL` no reducer) e só vira
  // `withdrawn` depois deste processamento simulado — item do Kanban
  // "fluxo de saque de caução" (`pendingWithdrawal` existia no modelo
  // sem nenhuma tela alimentando ele ainda).
  useEffect(() => {
    if (!account) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const withdrawal of account.pendingWithdrawals) {
      if (scheduledWithdrawalsRef.current.has(withdrawal.id)) continue;
      scheduledWithdrawalsRef.current.add(withdrawal.id);

      const delay = Math.max(0, new Date(withdrawal.confirmAt).getTime() - Date.now());
      const timer = setTimeout(() => {
        confirmWithdrawal(user.id, withdrawal.id);
        logEvent({
          category: "on-chain",
          actor: "sistema",
          action: "Saque de caução confirmado",
          target: `${user.name} (@${user.username})`,
          details: `${formatUSDT(withdrawal.amount)} enviados na rede TRC20 (simulado) para ${withdrawal.destinationAddress}.`,
        });
        toast.success(`Saque de ${formatUSDT(withdrawal.amount)} confirmado`);
      }, delay);
      timers.push(timer);
    }

    return () => timers.forEach(clearTimeout);
  }, [account, confirmWithdrawal, logEvent, user.id, user.name, user.username]);

  if (!account) return null;

  const { grossLimit, availableLimit } = computeCashierLimit(account);

  const balances: { label: string; value: number }[] = [
    { label: "Disponível", value: account.available },
    { label: "Reservado", value: account.reserved },
    { label: "Bloqueado", value: account.blocked },
    { label: "Em análise", value: account.underReview },
    { label: "Usado em ressarcimento", value: account.usedForReimbursement },
    { label: "Pendente de retirada", value: account.pendingWithdrawal },
    { label: "Retirado", value: account.withdrawn },
  ];

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Carteira</h1>
          <p className="text-muted-foreground text-sm">Caução do caixeiro e limite pra aceitar ordens</p>
        </div>
        <div className="flex items-center gap-2">
          <WithdrawDialog
            availableBalance={account.available}
            onWithdraw={(amount, destinationAddress) => requestWithdrawal(user.id, amount, destinationAddress)}
          />
          <DepositDialog
            depositAddress={account.depositAddress}
            onDeposit={(amount) => initiateDeposit(user.id, amount)}
          />
        </div>
      </div>

      <div className="border-border grid grid-cols-2 gap-4 rounded-lg border p-4">
        <div>
          <p className="text-muted-foreground text-xs">Limite bruto</p>
          <p className="text-lg font-semibold">{formatUSDT(grossLimit)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Limite disponível</p>
          <p className="text-lg font-semibold">{formatUSDT(availableLimit)}</p>
        </div>
        <p className="text-muted-foreground col-span-2 text-xs">
          Limite bruto = caução confirmada × fator de exposição ({EXPOSURE_FACTOR * 100}%). Valor de
          referência do protótipo, não a decisão final de produto.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Saldos</h2>
        <dl className="border-border grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border p-4 sm:grid-cols-4">
          {balances.map((balance) => (
            <div key={balance.label}>
              <dt className="text-muted-foreground text-xs">{balance.label}</dt>
              <dd className="font-medium">{formatUSDT(balance.value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {account.pendingDeposits.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Depósitos em análise</h2>
          <ul className="flex flex-col gap-2">
            {account.pendingDeposits.map((deposit) => (
              <li
                key={deposit.id}
                className="border-border flex items-center justify-between rounded-lg border p-3"
              >
                <span className="text-sm">{formatUSDT(deposit.amount)}</span>
                <Badge variant="secondary" className="gap-1">
                  <ClockIcon className="size-3" />
                  Aguardando confirmação on-chain
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {account.pendingWithdrawals.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Saques em processamento</h2>
          <ul className="flex flex-col gap-2">
            {account.pendingWithdrawals.map((withdrawal) => (
              <li
                key={withdrawal.id}
                className="border-border flex items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm">{formatUSDT(withdrawal.amount)}</span>
                  <span className="text-muted-foreground font-mono text-xs">{withdrawal.destinationAddress}</span>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <ClockIcon className="size-3" />
                  Em processamento
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button asChild variant="outline" className="w-fit">
        <Link href="/wallet/availability">
          Disponibilidade do caixeiro
          <ArrowRightIcon className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
