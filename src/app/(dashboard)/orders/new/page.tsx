"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { OrderRulesDialog } from "./order-rules-dialog";
import { quoteOrder, type OrderQuote } from "@/lib/mock/pricing";
import { useMockOrders } from "@/lib/mock/orders";
import { useMockPixKeys } from "@/lib/mock/pix-keys";
import { useMockSession } from "@/lib/mock/session";
import { formatBRL, formatUSDT } from "@/lib/mock/format";
import { createOrderSchema, type CreateOrderInput } from "@/lib/validations/order";

/**
 * POST /orders — protótipo com dados fake. A taxa NUNCA é calculada
 * aqui: `quote` só existe depois de `quoteOrder()` responder, simulando
 * o papel do backend real (ver Parte 1, seção 3). Qualquer mudança nos
 * campos invalida a cotação atual, forçando um novo "round-trip".
 *
 * Confirmar o formulário não cria a ordem direto — abre
 * `OrderRulesDialog` (regras de uso/caução/penalidades + reconfirmação
 * de senha), que é quem efetivamente chama `createOrder`.
 *
 * A ordem exige selecionar uma chave PIX já cadastrada em `/profile` —
 * a trava anti-triangulação deixa de existir só no momento do cadastro
 * da chave e passa a valer também no momento da transação (checklist
 * de validação da Sprint -1). Como uma chave `cpf` incompatível já não
 * pode ser salva em `/profile`, a re-checagem aqui é defesa em
 * profundidade — mesmo princípio de "validado no backend antes de
 * permitir a transação" da Documentação de Segurança, aplicado de novo
 * no ponto de uso, não só no ponto de cadastro.
 */
export default function NewOrderPage() {
  const router = useRouter();
  const { createOrder } = useMockOrders();
  const { user } = useMockSession();
  const { pixKeys } = useMockPixKeys();
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<CreateOrderInput | null>(null);

  const myPixKeys = useMemo(() => pixKeys.filter((key) => key.userId === user.id), [pixKeys, user.id]);

  const {
    control,
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: { type: "compra", grossAmount: 0, paymentMethod: "PIX", pixKeyId: "" },
  });

  const pixKeyId = useWatch({ control, name: "pixKeyId" });
  const selectedPixKey = myPixKeys.find((key) => key.id === pixKeyId);
  const triangulationBlocked =
    !!selectedPixKey && selectedPixKey.type === "cpf" && selectedPixKey.key !== user.document;

  async function handleQuote() {
    const values = getValues();
    const parsed = createOrderSchema.safeParse(values);
    if (!parsed.success) {
      toast.error("Confira o valor e a chave PIX antes de calcular");
      return;
    }
    if (triangulationBlocked) return;

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
    if (triangulationBlocked) {
      toast.error("Essa chave não pode ser usada — trava anti-triangulação");
      return;
    }
    setPendingOrder(data);
  }

  function handleConfirmed() {
    if (!pendingOrder || !quote || !selectedPixKey) return;

    const order = createOrder({
      type: pendingOrder.type,
      paymentMethod: pendingOrder.paymentMethod,
      grossAmount: pendingOrder.grossAmount,
      quote,
      clientId: user.id,
      clientName: user.name,
      clientPixKeySnapshot: {
        type: selectedPixKey.type,
        key: selectedPixKey.key,
        bank: selectedPixKey.bank,
        holderName: selectedPixKey.holderName ?? user.name,
      },
    });
    toast.success("Ordem criada");
    router.push(`/orders/${order.id}`);
  }

  if (myPixKeys.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4">
        <div>
          <h1 className="text-xl font-semibold">Nova ordem</h1>
          <p className="text-muted-foreground text-sm">Compra ou venda de USDT via PIX</p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            Você ainda não tem nenhuma chave PIX cadastrada. Cadastre uma em
            {" "}
            <Link href="/profile" className="underline">
              Perfil
            </Link>{" "}
            antes de criar uma ordem — sem chave, não dá pra declarar de/pra onde o pagamento vai.
          </AlertDescription>
        </Alert>
      </div>
    );
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
              <div id="type" className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={field.value === "compra"}
                  onClick={() => {
                    field.onChange("compra");
                    invalidateQuote();
                  }}
                  className={cn(
                    "rounded-lg border p-2 text-sm font-medium transition-colors",
                    field.value === "compra"
                      ? "bg-status-dispute text-status-dispute-foreground border-transparent"
                      : "border-border hover:bg-accent",
                  )}
                >
                  Comprar USDT
                </button>
                <button
                  type="button"
                  aria-pressed={field.value === "venda"}
                  onClick={() => {
                    field.onChange("venda");
                    invalidateQuote();
                  }}
                  className={cn(
                    "rounded-lg border p-2 text-sm font-medium transition-colors",
                    field.value === "venda"
                      ? "bg-status-completed text-status-completed-foreground border-transparent"
                      : "border-border hover:bg-accent",
                  )}
                >
                  Vender USDT
                </button>
              </div>
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pixKeyId">Chave PIX</Label>
          <Controller
            name="pixKeyId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  invalidateQuote();
                }}
              >
                <SelectTrigger id="pixKeyId" className="w-full">
                  <SelectValue placeholder="Selecione uma chave" />
                </SelectTrigger>
                <SelectContent>
                  {myPixKeys.map((key) => (
                    <SelectItem key={key.id} value={key.id}>
                      {key.key} · {key.bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.pixKeyId && (
            <p className="text-destructive text-sm">{errors.pixKeyId.message}</p>
          )}
          {triangulationBlocked && (
            <p className="text-destructive text-sm">
              Essa chave não bate com seu CPF/CNPJ cadastrado ({user.document}) — trava
              anti-triangulação, não pode ser usada nesta transação.
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleQuote}
          disabled={quoting || triangulationBlocked}
        >
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

        <Button type="submit" disabled={!quote || isSubmitting || triangulationBlocked}>
          Confirmar ordem
        </Button>
      </form>

      <OrderRulesDialog
        open={!!pendingOrder}
        onOpenChange={(open) => {
          if (!open) setPendingOrder(null);
        }}
        onConfirm={handleConfirmed}
      />
    </div>
  );
}
