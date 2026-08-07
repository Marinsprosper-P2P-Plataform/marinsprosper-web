"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CopyIcon } from "lucide-react";
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

/**
 * GET /cashier/collateral/deposit-address — protótipo com dados fake.
 * O endereço é só exibido; "Simular depósito" chama `initiateDeposit`,
 * que joga o valor pra "em análise" até a confirmação on-chain simulada
 * (ver `src/lib/mock/collateral.tsx`). Nenhum valor sai daqui sem passar
 * por esse estado de espera — é o ponto principal deste card do Kanban.
 */
export function DepositDialog({
  depositAddress,
  onDeposit,
}: {
  depositAddress: string;
  onDeposit: (amount: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsedAmount = Number(amount);
  const canSubmit = amount.trim() !== "" && parsedAmount > 0;

  async function handleCopy() {
    await navigator.clipboard.writeText(depositAddress);
    toast.success("Endereço copiado");
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    onDeposit(parsedAmount);
    toast.success("Depósito simulado — aguardando confirmação on-chain");
    setSubmitting(false);
    setOpen(false);
    setAmount("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Depositar caução</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Depósito de USDT (TRC20)</DialogTitle>
          <DialogDescription>
            Envie só USDT na rede TRC20 pra este endereço. Endereço errado ou rede errada
            significa perda de fundos — não há como reverter.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deposit-address">Endereço de depósito</Label>
            <div className="flex items-center gap-2">
              <Input id="deposit-address" readOnly value={depositAddress} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={handleCopy} aria-label="Copiar endereço">
                <CopyIcon className="size-4" />
              </Button>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              Protótipo — este é um endereço fake, não envie fundos reais. O fluxo abaixo simula
              o valor entrando em análise até a confirmação on-chain.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deposit-amount">Valor enviado (USDT)</Label>
            <Input
              id="deposit-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={!canSubmit || submitting} onClick={handleSubmit}>
            Simular depósito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
