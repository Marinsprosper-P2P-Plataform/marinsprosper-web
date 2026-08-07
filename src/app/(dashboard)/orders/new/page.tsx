"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { quoteOrder, type OrderQuote } from "@/lib/mock/pricing";
import { useMockOrders } from "@/lib/mock/orders";
import { useMockSession } from "@/lib/mock/session";
import { formatBRL, formatUSDT } from "@/lib/mock/format";
import { createOrderSchema, type CreateOrderInput } from "@/lib/validations/order";

/**
 * POST /orders — protótipo com dados fake. A taxa NUNCA é calculada
 * aqui: `quote` só existe depois de `quoteOrder()` responder, simulando
 * o papel do backend real (ver Parte 1, seção 3). Qualquer mudança nos
 * campos invalida a cotação atual, forçando um novo "round-trip".
 */
export default function NewOrderPage() {
  const router = useRouter();
  const { createOrder } = useMockOrders();
  const { user } = useMockSession();
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoting, setQuoting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: { type: "compra", grossAmount: 0, paymentMethod: "PIX" },
  });

  async function handleQuote() {
    const values = getValues();
    const parsed = createOrderSchema.safeParse(values);
    if (!parsed.success) {
      toast.error("Confira o valor antes de calcular");
      return;
    }

    setQuoting(true);
    const result = await quoteOrder(parsed.data.grossAmount);
    setQuote(result);
    setQuoting(false);
  }

  function invalidateQuote() {
    if (quote) setQuote(null);
  }

  function onSubmit(data: CreateOrderInput) {
    if (!quote) {
      toast.error("Calcule a taxa antes de confirmar");
      return;
    }

    const order = createOrder({
      type: data.type,
      paymentMethod: data.paymentMethod,
      grossAmount: data.grossAmount,
      quote,
      clientId: user.id,
      clientName: user.name,
    });
    toast.success("Ordem criada");
    router.push(`/orders/${order.id}`);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Nova ordem</h1>
        <p className="text-muted-foreground text-sm">Compra ou venda de USDT via PIX</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">Operação</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  invalidateQuote();
                }}
              >
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compra">Comprar USDT</SelectItem>
                  <SelectItem value="venda">Vender USDT</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grossAmount">Valor em reais</Label>
          <Input
            id="grossAmount"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            aria-invalid={!!errors.grossAmount}
            {...register("grossAmount", { valueAsNumber: true, onChange: invalidateQuote })}
          />
          {errors.grossAmount && (
            <p className="text-destructive text-sm">{errors.grossAmount.message}</p>
          )}
        </div>

        <Button type="button" variant="outline" onClick={handleQuote} disabled={quoting}>
          {quoting ? "Calculando..." : "Calcular taxa"}
        </Button>

        {quote && (
          <dl className="border-border grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border p-4 text-sm">
            <dt className="text-muted-foreground">Cotação</dt>
            <dd className="text-right">{formatBRL(quote.quote)} / USDT</dd>
            <dt className="text-muted-foreground">Taxa ({quote.feePercent}%)</dt>
            <dd className="text-right">{formatBRL(quote.feeAmount)}</dd>
            <dt className="text-muted-foreground font-medium">Você recebe</dt>
            <dd className="text-foreground text-right font-medium">
              {formatUSDT(quote.netAmount)}
            </dd>
          </dl>
        )}

        <Button type="submit" disabled={!quote || isSubmitting}>
          Confirmar ordem
        </Button>
      </form>
    </div>
  );
}
