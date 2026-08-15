"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRightIcon, ClockIcon, RefreshCwIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DepositDialog } from "./deposit-dialog";
import { getCashierLimitRequest, getCollateralRequest, syncCollateralRequest } from "@/lib/cashier/api";
import type { CashierCollateral, CashierLimit } from "@/lib/cashier/types";
import { formatUSDT } from "@/lib/mock/format";
import { generateIdempotencyKey, ApiError, ApiNetworkError } from "@/lib/api";

const MOVEMENT_LABEL: Record<string, string> = {
  LOCK: "Travado (ordem aceita)",
  RELEASE: "Liberado",
  REFUND: "Estornado",
};

function describeApiError(error: unknown, fallback: string) {
  if (error instanceof ApiNetworkError) return error.message;
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

/**
 * `GET /cashier/collateral` + `GET /cashier/limit` reais. Substitui o
 * modelo de 7 baldes do protótipo (`available/reserved/blocked/
 * underReview/usedForReimbursement/pendingWithdrawal/withdrawn`) pelos
 * 2 saldos reais (`free`/`locked`) + `mirrorAgeSeconds` (idade do
 * espelho on-chain — o aceite de ordem recusa leitura com mais de 5
 * minutos) + `pendingMovements` (intenções de custódia ainda sem
 * confirmação). Sem saque: `POST /cashier/collateral/withdraw` não
 * existe no backend ainda (ver [[Kanban]], bucket bloqueado) — o botão
 * de saque do protótipo saiu daqui até existir endpoint real.
 */
export default function WalletPage() {
  const [collateral, setCollateral] = useState<CashierCollateral | null>(null);
  const [limit, setLimit] = useState<CashierLimit | null>(null);
  const [notRegistered, setNotRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refetchToken, setRefetchToken] = useState(0);
  const refetch = () => setRefetchToken((token) => token + 1);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [collateralResult, limitResult] = await Promise.allSettled([
          getCollateralRequest(),
          getCashierLimitRequest(),
        ]);
        if (cancelled) return;

        if (collateralResult.status === "fulfilled") {
          setCollateral(collateralResult.value.data);
          setNotRegistered(false);
        } else if (collateralResult.reason instanceof ApiError && collateralResult.reason.status === 404) {
          setCollateral(null);
          setNotRegistered(true);
        } else {
          throw collateralResult.reason;
        }

        if (limitResult.status === "fulfilled") {
          setLimit(limitResult.value.data);
        } else if (!(limitResult.reason instanceof ApiError && limitResult.reason.status === 404)) {
          throw limitResult.reason;
        }

        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(describeApiError(err, "Não foi possível carregar a carteira."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refetchToken]);

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      const { data } = await syncCollateralRequest(generateIdempotencyKey());
      setCollateral(data);
      setNotRegistered(false);
      toast.success("Saldo atualizado");
    } catch (err) {
      toast.error(describeApiError(err, "Não foi possível atualizar o saldo."));
    } finally {
      setSyncing(false);
    }
  }

  const isStale = collateral?.mirrorAgeSeconds !== null && (collateral?.mirrorAgeSeconds ?? 0) > 5 * 60;

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Carteira</h1>
          <p className="text-muted-foreground text-sm">Caução do caixeiro e limite pra aceitar ordens</p>
        </div>
        <DepositDialog registeredAddress={collateral?.depositAddress ?? null} onRegistered={refetch} />
      </div>

      {loading && <p className="text-muted-foreground text-sm">Carregando...</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}

      {!loading && notRegistered && (
        <Alert>
          <AlertDescription>
            Você ainda não registrou nenhum endereço de depósito neste ativo — registre um pra ter
            uma conta de colateral.
          </AlertDescription>
        </Alert>
      )}

      {collateral && (
        <>
          {!collateral.contractDeployed && (
            <Alert variant="destructive">
              <AlertDescription>
                O contrato de custódia ainda não foi implantado neste ambiente — o espelho de saldo
                não tem de onde vir ainda.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Saldos</h2>
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                <RefreshCwIcon className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Atualizando..." : "Atualizar saldo"}
              </Button>
            </div>
            <dl className="border-border grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border p-4">
              <div>
                <dt className="text-muted-foreground text-xs">Livre</dt>
                <dd className="font-medium">{formatUSDT(Number(collateral.free))}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Travado</dt>
                <dd className="font-medium">{formatUSDT(Number(collateral.locked))}</dd>
              </div>
            </dl>
            <p className={`text-xs ${isStale ? "text-destructive" : "text-muted-foreground"}`}>
              {collateral.mirrorAgeSeconds === null
                ? "Espelho nunca sincronizado."
                : `Atualizado há ${collateral.mirrorAgeSeconds}s${isStale ? " — leitura vencida, aceite de ordem vai recusar" : ""}.`}
            </p>
          </div>

          {limit && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium">Limite</h2>
              <dl className="border-border grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border p-4 sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground text-xs">Por ordem</dt>
                  <dd className="font-medium">
                    {formatUSDT(Number(limit.minOrderAmount))} – {formatUSDT(Number(limit.maxOrderAmount))}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Ordens abertas</dt>
                  <dd className="font-medium">
                    {limit.openOrders} / {limit.maxOpenOrders}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Volume diário restante</dt>
                  <dd className="font-medium">
                    {formatUSDT(Number(limit.dailyVolumeRemaining))} / {formatUSDT(Number(limit.dailyVolumeLimit))}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {collateral.pendingMovements.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium">Movimentos pendentes de confirmação</h2>
              <ul className="flex flex-col gap-2">
                {collateral.pendingMovements.map((movement, index) => (
                  <li
                    key={`${movement.createdAt}-${index}`}
                    className="border-border flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {formatUSDT(Number(movement.amount))} · {MOVEMENT_LABEL[movement.type] ?? movement.type}
                      </span>
                      {movement.onChainTxHash && (
                        <span className="text-muted-foreground font-mono text-xs">{movement.onChainTxHash}</span>
                      )}
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <ClockIcon className="size-3" />
                      Aguardando confirmação on-chain
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
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
