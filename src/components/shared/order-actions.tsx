"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PaymentCountdown } from "@/components/shared/payment-countdown";
import { useMockSession } from "@/lib/mock/session";
import { isCpfCnpjFormat } from "@/lib/validations/pix";
import type { BackendOrder } from "@/lib/orders/types";
import {
  acceptOrderRequest,
  cashierConfirmReceiptRequest,
  cashierTransferRequest,
  clientConfirmRequest,
  clientTransferRequest,
  registerPixRequest,
} from "@/lib/orders/api";
import { generateIdempotencyKey, ApiError, ApiNetworkError } from "@/lib/api";

function describeApiError(error: unknown, fallback: string) {
  if (error instanceof ApiNetworkError) return error.message;
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

/**
 * As ações que efetivamente avançam a máquina de estados real —
 * `accept`, `pix`, `client-transfer`, `cashier-confirm-receipt`,
 * `cashier-transfer`, `client-confirm` (`marinsprosper-api`,
 * `OrdersController`). Diferente do protótipo mock, os endpoints de
 * transição não recebem corpo (sem upload de comprovante, sem TXID
 * informado por quem envia) — evidência vive no chat/disputa, ainda não
 * integrados; ver [[14 - Ofertas e Ordens]]. Cada ação chama a API real
 * e repassa a ordem atualizada pro pai via `onUpdated`, que é a resposta
 * do próprio endpoint — sem round-trip extra de leitura.
 */
export function OrderActions({
  order,
  viewerId,
  onUpdated,
}: {
  order: BackendOrder;
  viewerId: string;
  onUpdated: (order: BackendOrder) => void;
}) {
  const isClient = order.clientId === viewerId;
  const isCashier = order.cashierId === viewerId;
  const canAcceptAsCashier = order.clientId !== viewerId;

  if (order.status === "OPEN") {
    return (
      <ActionCard title="Aceite">
        {canAcceptAsCashier ? (
          <AcceptControl order={order} onUpdated={onUpdated} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Aguardando um caixeiro aceitar esta ordem.
          </p>
        )}
      </ActionCard>
    );
  }

  if (order.status === "ACCEPTED") {
    // Quem RECEBE em BRL registra a própria chave PIX antes de qualquer
    // transferência — em compra é o caixeiro (recebe o pagamento do
    // cliente), em venda é o cliente (recebe o pagamento do caixeiro).
    const receiverIsClient = order.side === "CLIENT_SELLS_ASSET";
    const isReceiver = receiverIsClient ? isClient : isCashier;

    if (!order.pixDocument) {
      return (
        <ActionCard title="Chave PIX de recebimento">
          {order.expiresAt && (
            <PaymentCountdown deadline={order.expiresAt} onExpire={() => onUpdated(order)} />
          )}
          {isReceiver ? (
            <RegisterPixControl orderId={order.id} onUpdated={onUpdated} />
          ) : (
            <p className="text-muted-foreground text-sm">
              Aguardando {receiverIsClient ? "o cliente" : "o caixeiro"} registrar a chave PIX de
              recebimento.
            </p>
          )}
        </ActionCard>
      );
    }

    return (
      <ActionCard title="Transferência do cliente">
        {order.expiresAt && (
          <PaymentCountdown deadline={order.expiresAt} onExpire={() => onUpdated(order)} />
        )}
        {isClient ? (
          <ClientTransferControl orderId={order.id} onUpdated={onUpdated} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Aguardando o cliente transferir via PIX e confirmar.
          </p>
        )}
      </ActionCard>
    );
  }

  if (order.status === "CLIENT_TRANSFERRED") {
    return (
      <ActionCard title="Confirmação do caixeiro">
        {isCashier ? (
          <ConfirmReceiptControl orderId={order.id} onUpdated={onUpdated} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Aguardando o caixeiro confirmar o recebimento do pagamento.
          </p>
        )}
      </ActionCard>
    );
  }

  if (order.status === "RECEIPT_CONFIRMED") {
    return (
      <ActionCard title="Envio do ativo">
        {isCashier ? (
          <CashierTransferControl orderId={order.id} onUpdated={onUpdated} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Aguardando o caixeiro enviar o USDT.
          </p>
        )}
      </ActionCard>
    );
  }

  if (order.status === "CASHIER_TRANSFERRED") {
    return (
      <ActionCard title="Confirmação final">
        {isClient ? (
          <ClientConfirmControl orderId={order.id} settleTxHash={order.settleTxHash} onUpdated={onUpdated} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Aguardando o cliente confirmar o recebimento do USDT.
          </p>
        )}
      </ActionCard>
    );
  }

  return null;
}

function ActionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-sm font-medium">{title}</h2>
      {children}
    </div>
  );
}

function AcceptControl({
  order,
  onUpdated,
}: {
  order: BackendOrder;
  onUpdated: (order: BackendOrder) => void;
}) {
  const { user } = useMockSession();
  const [accepting, setAccepting] = useState(false);
  const availableLimit = user.cashierAvailableLimit;
  const exceedsLimit = Number(order.fiatAmount) > availableLimit;

  async function handleAccept() {
    if (accepting) return;
    if (exceedsLimit) {
      toast.error("Esse valor excede seu limite disponível");
      return;
    }
    setAccepting(true);
    try {
      const { data } = await acceptOrderRequest(order.id, generateIdempotencyKey());
      toast.success("Ordem aceita — caução reservada no contrato");
      onUpdated(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        toast.error(error.message || "Caução insuficiente ou limite excedido");
      } else if (error instanceof ApiError && error.status === 409) {
        toast.error("Outro caixeiro chegou primeiro nesta ordem");
      } else {
        toast.error(describeApiError(error, "Não foi possível aceitar. Tente novamente."));
      }
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">
        Limite disponível: {availableLimit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </p>
      <Button onClick={handleAccept} disabled={accepting || exceedsLimit}>
        {exceedsLimit ? "Excede seu limite" : accepting ? "Aceitando..." : "Aceitar ordem"}
      </Button>
    </div>
  );
}

function RegisterPixControl({
  orderId,
  onUpdated,
}: {
  orderId: string;
  onUpdated: (order: BackendOrder) => void;
}) {
  const [pixKey, setPixKey] = useState("");
  const [pixDocument, setPixDocument] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const documentValid = isCpfCnpjFormat(pixDocument);
  const canSubmit = pixKey.trim().length > 0 && documentValid;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await registerPixRequest(
        orderId,
        { pixKey: pixKey.trim(), pixDocument: pixDocument.replace(/\D/g, "") },
        generateIdempotencyKey(),
      );
      toast.success("Chave PIX registrada");
      onUpdated(data);
    } catch (error) {
      toast.error(describeApiError(error, "Não foi possível registrar a chave. Tente novamente."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        A chave precisa ser sua — o CPF/CNPJ é conferido contra o documento do seu cadastro.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-pix-key">Chave PIX</Label>
        <Input id="register-pix-key" value={pixKey} onChange={(event) => setPixKey(event.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-pix-document">CPF/CNPJ do titular</Label>
        <Input
          id="register-pix-document"
          value={pixDocument}
          onChange={(event) => setPixDocument(event.target.value)}
          placeholder="Só números"
        />
      </div>
      <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
        {submitting ? "Registrando..." : "Registrar chave PIX"}
      </Button>
    </div>
  );
}

function ClientTransferControl({
  orderId,
  onUpdated,
}: {
  orderId: string;
  onUpdated: (order: BackendOrder) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkedAmount, setCheckedAmount] = useState(false);
  const [checkedFraudNotice, setCheckedFraudNotice] = useState(false);

  function closeConfirm() {
    setConfirmOpen(false);
    setCheckedAmount(false);
    setCheckedFraudNotice(false);
  }

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data } = await clientTransferRequest(orderId, generateIdempotencyKey());
      toast.success("Transferência informada");
      onUpdated(data);
      closeConfirm();
    } catch (error) {
      toast.error(describeApiError(error, "Não foi possível informar a transferência."));
    } finally {
      setSubmitting(false);
    }
  }

  const canConfirm = checkedAmount && checkedFraudNotice;

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={() => setConfirmOpen(true)}>Já paguei — confirmar transferência</Button>

      <Dialog open={confirmOpen} onOpenChange={(open) => (open ? setConfirmOpen(true) : closeConfirm())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar transferência</DialogTitle>
            <DialogDescription>
              Confira os itens abaixo antes de marcar como transferido — depois disso o caixeiro
              é avisado pra conferir o recebimento.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-sm">
            <label className="flex items-start gap-2">
              <Checkbox checked={checkedAmount} onCheckedChange={(value) => setCheckedAmount(value === true)} />
              Transferi exatamente o valor mostrado na ordem, sem arredondar.
            </label>
            <label className="flex items-start gap-2">
              <Checkbox
                checked={checkedFraudNotice}
                onCheckedChange={(value) => setCheckedFraudNotice(value === true)}
              />
              Estou ciente de que informar uma transferência falsa pode levar ao bloqueio da conta.
            </label>
          </div>
          <DialogFooter>
            <Button onClick={handleConfirm} disabled={!canConfirm || submitting}>
              {submitting ? "Confirmando..." : "Confirmar transferência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConfirmReceiptControl({
  orderId,
  onUpdated,
}: {
  orderId: string;
  onUpdated: (order: BackendOrder) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data } = await cashierConfirmReceiptRequest(orderId, generateIdempotencyKey());
      toast.success("Recebimento confirmado");
      onUpdated(data);
    } catch (error) {
      toast.error(describeApiError(error, "Não foi possível confirmar o recebimento."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button onClick={handleConfirm} disabled={submitting}>
      {submitting ? "Confirmando..." : "Confirmar recebimento do PIX"}
    </Button>
  );
}

function CashierTransferControl({
  orderId,
  onUpdated,
}: {
  orderId: string;
  onUpdated: (order: BackendOrder) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data } = await cashierTransferRequest(orderId, generateIdempotencyKey());
      toast.success("Envio informado");
      onUpdated(data);
    } catch (error) {
      toast.error(describeApiError(error, "Não foi possível informar o envio."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Alert>
        <AlertDescription>
          A liberação só confirma após validação on-chain real — o TXID de liquidação aparece
          aqui assim que o backend registrar (custódia/webhook), não é informado manualmente.
        </AlertDescription>
      </Alert>
      <Button onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Enviando..." : "Enviei o ativo"}
      </Button>
    </div>
  );
}

function ClientConfirmControl({
  orderId,
  settleTxHash,
  onUpdated,
}: {
  orderId: string;
  settleTxHash: string | null;
  onUpdated: (order: BackendOrder) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data } = await clientConfirmRequest(orderId, generateIdempotencyKey());
      toast.success("Ordem concluída");
      onUpdated(data);
    } catch (error) {
      toast.error(describeApiError(error, "Não foi possível confirmar o recebimento."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {settleTxHash && (
        <p className="text-sm">
          TXID de liquidação: <span className="font-mono">{settleTxHash}</span>
        </p>
      )}
      <Alert>
        <AlertDescription>
          Confirme só depois de ver o USDT na sua carteira.
        </AlertDescription>
      </Alert>
      <Button onClick={handleConfirm} disabled={submitting}>
        {submitting ? "Confirmando..." : "Confirmar recebimento"}
      </Button>
    </div>
  );
}
