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
import { TRON_ADDRESS_PATTERN } from "@/lib/validations/order";
import { registerDepositAddressRequest } from "@/lib/cashier/api";
import type { DepositAddressResponse } from "@/lib/cashier/types";
import { generateIdempotencyKey, ApiError, ApiNetworkError } from "@/lib/api";

function describeApiError(error: unknown, fallback: string) {
  if (error instanceof ApiNetworkError) return error.message;
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

/**
 * `POST /cashier/collateral/deposit-address` real — o fluxo se inverte
 * em relação ao protótipo mock: não existe endereço gerado por
 * cashier, o destino (`contractAddress`) é o mesmo pra todo mundo (o
 * contrato de custódia). O cashier registra a própria origem, e é o
 * remetente que o contrato credita (`msg.sender`) — reenviar o MESMO
 * endereço é idempotente e devolve a mesma resposta de novo; trocar de
 * endereço depois de já ter um registrado dá 409 (exige reconciliação
 * manual, não é uma troca livre).
 */
export function DepositDialog({
  registeredAddress,
  onRegistered,
}: {
  registeredAddress: string | null;
  onRegistered: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tronAddress, setTronAddress] = useState(registeredAddress ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DepositAddressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = TRON_ADDRESS_PATTERN.test(tronAddress.trim());

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await registerDepositAddressRequest(
        { tronAddress: tronAddress.trim() },
        generateIdempotencyKey(),
      );
      setResult(data);
      onRegistered();
    } catch (err) {
      setError(describeApiError(err, "Não foi possível registrar o endereço."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy(value: string) {
    await navigator.clipboard.writeText(value);
    toast.success("Copiado");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setResult(null);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">{registeredAddress ? "Ver endereço de depósito" : "Registrar endereço"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Depósito de USDT (TRC20)</DialogTitle>
          <DialogDescription>
            Registre o endereço TRON de onde você vai enviar o colateral — o contrato credita quem
            envia, então um depósito de outro endereço não é atribuído à sua conta.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tron-address">Seu endereço TRON (TRC20)</Label>
              <Input
                id="tron-address"
                autoComplete="off"
                placeholder="T..."
                value={tronAddress}
                onChange={(event) => setTronAddress(event.target.value)}
              />
            </div>
            {registeredAddress && (
              <p className="text-muted-foreground text-xs">
                Já registrado: <span className="font-mono">{registeredAddress}</span>. Reenviar o
                mesmo endereço mostra o destino de novo; trocar de endereço exige suporte.
              </p>
            )}
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Alert>
              <AlertDescription>{result.warning}</AlertDescription>
            </Alert>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-address">Enviar para (contrato de custódia)</Label>
              <div className="flex items-center gap-2">
                <Input id="contract-address" readOnly value={result.contractAddress} className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(result.contractAddress)}
                  aria-label="Copiar endereço do contrato"
                >
                  <CopyIcon className="size-4" />
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Rede {result.network} · de <span className="font-mono">{result.fromAddress}</span>
            </p>
          </div>
        )}

        <DialogFooter>
          {!result && (
            <Button disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? "Registrando..." : "Registrar e ver destino"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
