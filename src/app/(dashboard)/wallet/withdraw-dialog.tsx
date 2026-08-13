"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUSDT } from "@/lib/mock/format";

/**
 * PATCH /cashier/collateral/withdraw — protótipo com dados fake.
 * `CollateralAccount.pendingWithdrawal` já existia no modelo desde o
 * resto deste bucket, mas nenhuma tela o alimentava ainda (achado do
 * checklist de validação da Sprint -1, ver
 * [[19 - Checklist de Validação Sprint -1]]). Espelha `DepositDialog`
 * de propósito — mesmo padrão de "estado de espera antes do saldo
 * refletir", só que na direção contrária: sai de `available`, fica em
 * `pendingWithdrawal` até o processamento simulado terminar, e só então
 * vira `withdrawn`.
 */
export function WithdrawDialog({
  availableBalance,
  onWithdraw,
}: {
  availableBalance: number;
  onWithdraw: (amount: number, destinationAddress: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsedAmount = Number(amount);
  const exceedsBalance = amount.trim() !== "" && parsedAmount > availableBalance;
  const canSubmit =
    amount.trim() !== "" && parsedAmount > 0 && !exceedsBalance && destinationAddress.trim() !== "";

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    onWithdraw(parsedAmount, destinationAddress.trim());
    toast.success("Saque solicitado — em processamento");
    setSubmitting(false);
    setOpen(false);
    setAmount("");
    setDestinationAddress("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={availableBalance <= 0}>
          Solicitar saque
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Saque de caução (TRC20)</DialogTitle>
          <DialogDescription>
            O valor sai do seu saldo disponível imediatamente e fica em processamento até ser
            enviado pra rede TRC20. Endereço errado ou rede errada significa perda de fundos — não
            há como reverter.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            Saldo disponível: <span className="text-foreground font-medium">{formatUSDT(availableBalance)}</span>
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="withdraw-amount">Valor a sacar (USDT)</Label>
            <Input
              id="withdraw-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={exceedsBalance}
            />
            {exceedsBalance && (
              <p className="text-destructive text-sm">Esse valor excede seu saldo disponível.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="withdraw-address">Endereço de destino (TRC20)</Label>
            <Input
              id="withdraw-address"
              value={destinationAddress}
              onChange={(event) => setDestinationAddress(event.target.value)}
              placeholder="T..."
              className="font-mono text-xs"
            />
          </div>

          <Alert>
            <AlertDescription>
              Protótipo — nenhum fundo real sai daqui. O fluxo abaixo simula o valor ficando em
              processamento até ser confirmado.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button disabled={!canSubmit || submitting} onClick={handleSubmit}>
            Solicitar saque
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
