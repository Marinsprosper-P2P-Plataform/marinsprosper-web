"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, formatUSDT } from "@/lib/mock/format";
import { quoteOrder } from "@/lib/mock/pricing";
import { useMockListings } from "@/lib/mock/listings";
import { TRON_ADDRESS_PATTERN } from "@/lib/validations/order";
import { createOrderRequest } from "@/lib/orders/api";
import { generateIdempotencyKey, ApiError, ApiNetworkError } from "@/lib/api";
import type { Listing } from "@/types/listing";

/**
 * Negociar uma oferta cria uma ORDEM real (`POST /orders`) — mesma
 * chamada de `orders/new/page.tsx`, só pré-preenchida a partir da
 * oferta. O backend não modela "ordem já combinada com contraparte
 * fixa/taxa zero" (o que o dono da oferta cobrou já foi embutido na
 * comissão da própria oferta, não na ordem), então a ordem resultante
 * segue as regras normais: fica aberta pra qualquer caixeiro aceitar,
 * com a cotação/taxa reais de `quoteOrder`. A oferta só serve de atalho
 * de preenchimento.
 */
export function ListingNegotiateDialog({
  listing,
  open,
  onOpenChange,
}: {
  listing: Listing;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { negotiateListing } = useMockListings();
  const [quantity, setQuantity] = useState("");
  const [tronAddress, setTronAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Oposto da operação do dono: se o dono quer vender, quem negocia compra.
  const negotiatorType = listing.operation === "compra" ? "venda" : "compra";
  const quantityNumber = Number(quantity.replace(",", "."));
  const grossAmount = Number.isFinite(quantityNumber) ? Math.round(quantityNumber * listing.quote * 100) / 100 : 0;

  function reset() {
    setQuantity("");
    setTronAddress("");
    setError(null);
  }

  function validate() {
    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
      return "Informe a quantidade";
    }
    if (quantityNumber < listing.minPerOrder) {
      return `Mínimo por solicitação: ${formatUSDT(listing.minPerOrder)}`;
    }
    if (quantityNumber > listing.maxPerOrder) {
      return `Máximo por solicitação: ${formatUSDT(listing.maxPerOrder)}`;
    }
    if (quantityNumber > listing.totalQuantity) {
      return `Só restam ${formatUSDT(listing.totalQuantity)} nesta oferta`;
    }
    if (grossAmount < 10 || grossAmount > 50000) {
      return "Valor em BRL precisa ficar entre R$ 10 e R$ 50.000";
    }
    if (negotiatorType === "compra" && !TRON_ADDRESS_PATTERN.test(tronAddress)) {
      return "Endereço TRON (TRC20) inválido";
    }
    return null;
  }

  async function handleConfirm() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const quote = await quoteOrder(grossAmount);
      const { data } = await createOrderRequest(
        {
          side: negotiatorType === "compra" ? "CLIENT_BUYS_ASSET" : "CLIENT_SELLS_ASSET",
          asset: "USDT",
          assetAmount: String(quote.netAmount),
          rate: String(quote.quote),
          clientTronAddress: negotiatorType === "compra" ? tronAddress : undefined,
          publish: true,
        },
        generateIdempotencyKey(),
      );
      negotiateListing(listing.id, quantityNumber);
      toast.success("Ordem criada a partir da oferta");
      onOpenChange(false);
      reset();
      router.push(`/orders/${data.id}`);
    } catch (err) {
      if (err instanceof ApiNetworkError) {
        setError(err.message);
      } else if (err instanceof ApiError) {
        setError(`Backend recusou a ordem: ${err.message}`);
      } else {
        setError("Não foi possível criar a ordem. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Negociar oferta</DialogTitle>
          <DialogDescription>
            {negotiatorType === "compra" ? "Você vai comprar" : "Você vai vender"} USDT via{" "}
            {formatBRL(listing.quote)}/USDT.
          </DialogDescription>
        </DialogHeader>

        {listing.welcomeMessage && (
          <p className="bg-accent rounded-lg p-3 text-sm">{listing.welcomeMessage}</p>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="negotiate-quantity">Quantidade (USDT)</Label>
            <Input
              id="negotiate-quantity"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Entre {formatUSDT(listing.minPerOrder)} e {formatUSDT(listing.maxPerOrder)} · equivale a{" "}
              {formatBRL(grossAmount)}
            </p>
          </div>

          {negotiatorType === "compra" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="negotiate-tron">Endereço TRON (TRC20) que vai receber o USDT</Label>
              <Input
                id="negotiate-tron"
                autoComplete="off"
                placeholder="T..."
                value={tronAddress}
                onChange={(event) => setTronAddress(event.target.value)}
              />
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button disabled={submitting} onClick={handleConfirm}>
            {submitting ? "Criando ordem..." : "Confirmar negociação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
