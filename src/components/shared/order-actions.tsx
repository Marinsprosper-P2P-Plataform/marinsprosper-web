"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UploadIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentCountdown } from "@/components/shared/payment-countdown";
import { ProofLink } from "@/components/shared/proof-link";
import { useMockOrders } from "@/lib/mock/orders";
import { useMockPixKeys } from "@/lib/mock/pix-keys";
import { useMockSession } from "@/lib/mock/session";
import type { Order } from "@/types/order";

/**
 * As 5 ações que efetivamente avançam a máquina de estados (aceitar,
 * marcar transferência, confirmar recebimento, informar TXID, confirmar
 * recebimento final) — corresponde aos 5 endpoints POST /orders/:id/*
 * na Parte 5. Cada uma só aparece pra quem pode executá-la, no estado
 * em que ela é válida.
 */
export function OrderActions({ order }: { order: Order }) {
  const { user } = useMockSession();
  const {
    markClientTransferred,
    confirmCashierReceipt,
    markCashierTransferred,
    confirmClientReceipt,
    expireOrder,
  } = useMockOrders();

  // Uma conta pode ser cliente e caixeiro ao mesmo tempo, só não pode
  // ser as duas coisas NA MESMA ordem (autonegociação) — daí a
  // exclusão explícita de `order.clientId === user.id` abaixo.
  const isClient = order.clientId === user.id;
  const isCashier = order.cashierId === user.id;
  const canAcceptAsCashier = order.clientId !== user.id;

  if (order.status === "OPEN") {
    return (
      <ActionCard title="Aceite">
        {canAcceptAsCashier ? (
          <AcceptControl order={order} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Aguardando um caixeiro aceitar esta ordem.
          </p>
        )}
      </ActionCard>
    );
  }

  if (order.status === "AWAITING_CLIENT_TRANSFER") {
    return (
      <ActionCard title="Transferência do cliente">
        {order.paymentDeadline && (
          <PaymentCountdown
            deadline={order.paymentDeadline}
            onExpire={() => expireOrder(order.id)}
          />
        )}
        {isClient ? (
          <ClientTransferControl orderId={order.id} onSubmit={markClientTransferred} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Aguardando o cliente transferir via {order.paymentMethod} e anexar o comprovante.
          </p>
        )}
      </ActionCard>
    );
  }

  if (order.status === "AWAITING_CASHIER_CONFIRMATION") {
    return (
      <ActionCard title="Confirmação do caixeiro">
        {isCashier ? (
          <div className="flex flex-col gap-3">
            {order.clientProofUrl && (
              <ProofLink url={order.clientProofUrl} name={order.clientProofName} />
            )}
            <Button
              onClick={() => {
                confirmCashierReceipt(order.id);
                toast.success("Recebimento confirmado");
              }}
            >
              Confirmar recebimento do PIX
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Aguardando o caixeiro confirmar o recebimento do pagamento.
          </p>
        )}
      </ActionCard>
    );
  }

  if (order.status === "AWAITING_CASHIER_TRANSFER") {
    return (
      <ActionCard title="Envio do ativo">
        {isCashier ? (
          <CashierTransferControl orderId={order.id} onSubmit={markCashierTransferred} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Aguardando o caixeiro enviar o USDT e informar o TXID.
          </p>
        )}
      </ActionCard>
    );
  }

  if (order.status === "AWAITING_CLIENT_CONFIRMATION") {
    return (
      <ActionCard title="Confirmação final">
        {isClient ? (
          <div className="flex flex-col gap-3">
            {order.txid && (
              <p className="text-sm">
                TXID informado: <span className="font-mono">{order.txid}</span>
              </p>
            )}
            <Alert>
              <AlertDescription>
                Confirme só depois de ver o USDT na sua carteira — o texto do TXID sozinho
                não é garantia (validação on-chain acontece no backend).
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => {
                confirmClientReceipt(order.id);
                toast.success("Ordem concluída");
              }}
            >
              Confirmar recebimento
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Aguardando o cliente confirmar o recebimento do USDT.
          </p>
        )}
      </ActionCard>
    );
  }

  if (order.status === "FROZEN_FOR_AUDIT") {
    return (
      <ActionCard title="Ordem congelada">
        <Alert variant="destructive">
          <AlertDescription>
            Esta ordem foi congelada por um administrador para auditoria — nenhuma ação fica
            disponível até ela ser liberada.
            {order.freezeReason && ` Motivo: ${order.freezeReason}`}
          </AlertDescription>
        </Alert>
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

function AcceptControl({ order }: { order: Order }) {
  const { user } = useMockSession();
  const { acceptOrder } = useMockOrders();
  const { pixKeys } = useMockPixKeys();
  const [accepting, setAccepting] = useState(false);
  const availableLimit = user.cashierAvailableLimit;
  const exceedsLimit = order.grossAmount > availableLimit;

  async function handleAccept() {
    if (accepting) return;
    if (exceedsLimit) {
      toast.error("Esse valor excede seu limite disponível");
      return;
    }
    setAccepting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const cashierPixKey = pixKeys.find((key) => key.userId === user.id);
    acceptOrder(
      order.id,
      user.id,
      user.name,
      cashierPixKey && { type: cashierPixKey.type, key: cashierPixKey.key, bank: cashierPixKey.bank },
    );
    toast.success("Ordem aceita — caução reservada no contrato");
    setAccepting(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">
        Limite disponível: {availableLimit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </p>
      <Button onClick={handleAccept} disabled={accepting || exceedsLimit}>
        {exceedsLimit ? "Excede seu limite" : "Aceitar ordem"}
      </Button>
    </div>
  );
}

function ClientTransferControl({
  orderId,
  onSubmit,
}: {
  orderId: string;
  onSubmit: (orderId: string, proofName: string, proofUrl: string, proofMimeType: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!file || submitting) return;
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    // blob: local à aba — é o que dá pro caixeiro abrir e ver o
    // comprovante de verdade, não só o nome do arquivo como texto.
    const proofUrl = URL.createObjectURL(file);
    onSubmit(orderId, file.name, proofUrl, file.type || "application/octet-stream");
    toast.success("Transferência informada");
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="proof">Comprovante do PIX</Label>
        <label
          htmlFor="proof"
          className="border-input hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-3 text-sm"
        >
          <UploadIcon className="size-4" />
          {file ? file.name : "Toque para anexar"}
        </label>
        <input
          id="proof"
          type="file"
          accept="image/*,.pdf"
          className="sr-only"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </div>
      <Button onClick={handleSubmit} disabled={!file || submitting}>
        Marquei que transferi
      </Button>
    </div>
  );
}

function CashierTransferControl({
  orderId,
  onSubmit,
}: {
  orderId: string;
  onSubmit: (orderId: string, txid: string) => void;
}) {
  const [txid, setTxid] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!txid.trim() || submitting) return;
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    onSubmit(orderId, txid.trim());
    toast.success("Envio informado");
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="txid">TXID da transação na rede Tron</Label>
        <Input
          id="txid"
          value={txid}
          onChange={(event) => setTxid(event.target.value)}
          placeholder="0x..."
        />
      </div>
      <Alert>
        <AlertDescription>
          A liberação só confirma após validação on-chain real (rede, contrato, valor,
          destinatário, confirmações) — este TXID é só o que você informa, não a
          confirmação em si.
        </AlertDescription>
      </Alert>
      <Button onClick={handleSubmit} disabled={!txid.trim() || submitting}>
        Enviei o ativo
      </Button>
    </div>
  );
}
