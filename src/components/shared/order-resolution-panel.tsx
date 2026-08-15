"use client";

import { useState } from "react";
import { StarIcon } from "lucide-react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BackendOrder } from "@/lib/orders/types";
import {
  cancelOrderRequest,
  cancelRequestRequest,
  cancelResponseRequest,
} from "@/lib/orders/api";
import { openDisputeRequest } from "@/lib/disputes/api";
import { rateOrderRequest } from "@/lib/ratings/api";
import { generateIdempotencyKey, ApiError, ApiNetworkError } from "@/lib/api";

function describeApiError(error: unknown, fallback: string) {
  if (error instanceof ApiNetworkError) return error.message;
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

/** Estados a partir dos quais `CANCEL_REQUEST` é uma transição válida
 * na máquina real (`order-state-machine.ts`) — a partir de
 * `RECEIPT_CONFIRMED` o cashier já admitiu ter recebido, então desfazer
 * deixa de ser cancelamento de comum acordo e vira mediação. */
const CANCEL_REQUESTABLE: BackendOrder["status"][] = ["ACCEPTED", "CLIENT_TRANSFERRED"];

/** Estados a partir dos quais `OPEN_DISPUTE` é válido — a partir do
 * momento em que o cliente declarou pagamento. */
const DISPUTE_OPENABLE: BackendOrder["status"][] = [
  "CLIENT_TRANSFERRED",
  "RECEIPT_CONFIRMED",
  "CASHIER_TRANSFERRED",
];

/** Estados em que a ordem já encerrou e houve contraparte de verdade —
 * mesma regra de `ratings.service.ts` (`AVALIAVEIS`). `EXPIRED` fica de
 * fora: prazo estourado sem pagamento não é conduta de ninguém. */
const RATEABLE: BackendOrder["status"][] = ["COMPLETED", "CANCELLED"];

/**
 * Cancelamento, disputa e avaliação — os três fluxos que a máquina de
 * estados real trata fora do ciclo principal (`OrdersController`,
 * `DisputesController`, `RatingsController`). Sem texto de motivo de
 * cancelamento/disputa pra exibir depois: o backend real recebe o
 * motivo (`OpenDisputeDto.reason`) mas não devolve no corpo da ordem —
 * fica só na trilha de auditoria/mediação.
 */
export function OrderResolutionPanel({
  order,
  viewerId,
  onUpdated,
  onDisputeOpened,
}: {
  order: BackendOrder;
  viewerId: string;
  onUpdated: (order: BackendOrder) => void;
  /** `POST /orders/:id/dispute` devolve a disputa criada, não a ordem —
   * quem chama recarrega a ordem à parte pra refletir `status: DISPUTED`. */
  onDisputeOpened: () => void;
}) {
  const isClient = order.clientId === viewerId;
  const isCashier = order.cashierId === viewerId;
  const isParticipant = isClient || isCashier;
  const viewerRole = isClient ? "CLIENT" : "CASHIER";

  if (!isParticipant) return null;

  if (order.status === "OPEN" && isClient) {
    return (
      <ActionCard title="Cancelar">
        <DirectCancelControl orderId={order.id} onUpdated={onUpdated} />
      </ActionCard>
    );
  }

  if (order.status === "CANCEL_REQUESTED") {
    const requesterIsMe = order.cancelRequestedBy === viewerRole;

    return (
      <ActionCard title="Cancelamento solicitado">
        {requesterIsMe ? (
          <p className="text-muted-foreground text-sm">
            Aguardando a resposta da contraparte. Por regra, quem solicita o
            cancelamento não avalia a contraparte depois.
          </p>
        ) : (
          <CancelResponseControl orderId={order.id} onUpdated={onUpdated} />
        )}
      </ActionCard>
    );
  }

  if (order.status === "DISPUTED") {
    return (
      <ActionCard title="Disputa">
        <p className="text-muted-foreground text-sm">
          Um mediador vai analisar as evidências e decidir — nenhuma das partes
          resolve isso sozinha.
        </p>
      </ActionCard>
    );
  }

  if (RATEABLE.includes(order.status)) {
    const canRate = order.cashierId && order.cancelledBy !== viewerRole;
    if (!canRate) return null;
    return <RatingCard orderId={order.id} />;
  }

  const canCancelRequest = CANCEL_REQUESTABLE.includes(order.status);
  const canOpenDispute = canCancelRequest || DISPUTE_OPENABLE.includes(order.status);

  if (canCancelRequest || canOpenDispute) {
    return (
      <div className="flex gap-2">
        {canCancelRequest && <CancelRequestDialog orderId={order.id} onUpdated={onUpdated} />}
        {canOpenDispute && <DisputeDialog orderId={order.id} onOpened={onDisputeOpened} />}
      </div>
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

function DirectCancelControl({
  orderId,
  onUpdated,
}: {
  orderId: string;
  onUpdated: (order: BackendOrder) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleCancel() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data } = await cancelOrderRequest(orderId, generateIdempotencyKey());
      toast.success("Ordem cancelada");
      onUpdated(data);
    } catch (error) {
      toast.error(describeApiError(error, "Não foi possível cancelar."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleCancel} disabled={submitting}>
      {submitting ? "Cancelando..." : "Cancelar ordem"}
    </Button>
  );
}

function CancelResponseControl({
  orderId,
  onUpdated,
}: {
  orderId: string;
  onUpdated: (order: BackendOrder) => void;
}) {
  const [submitting, setSubmitting] = useState<"accept" | "reject" | null>(null);

  async function respond(accept: boolean) {
    if (submitting) return;
    setSubmitting(accept ? "accept" : "reject");
    try {
      const { data } = await cancelResponseRequest(orderId, { accept }, generateIdempotencyKey());
      toast[accept ? "success" : "error"](
        accept ? "Cancelamento aceito" : "Cancelamento recusado — disputa aberta",
      );
      onUpdated(data);
    } catch (error) {
      toast.error(describeApiError(error, "Não foi possível responder ao cancelamento."));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => respond(true)} disabled={!!submitting}>
        Aceitar cancelamento
      </Button>
      <Button variant="destructive" onClick={() => respond(false)} disabled={!!submitting}>
        Recusar
      </Button>
    </div>
  );
}

function CancelRequestDialog({
  orderId,
  onUpdated,
}: {
  orderId: string;
  onUpdated: (order: BackendOrder) => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data } = await cancelRequestRequest(orderId, generateIdempotencyKey());
      toast.success("Cancelamento solicitado");
      onUpdated(data);
      setOpen(false);
    } catch (error) {
      toast.error(describeApiError(error, "Não foi possível solicitar o cancelamento."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Solicitar cancelamento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar cancelamento</DialogTitle>
          <DialogDescription>
            A contraparte precisa concordar. Se recusar, a ordem vai para disputa.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={submitting} onClick={handleConfirm}>
            {submitting ? "Solicitando..." : "Confirmar solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DisputeDialog({
  orderId,
  onOpened,
}: {
  orderId: string;
  onOpened: () => void;
}) {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = reason.trim().length >= 10;

  async function handleConfirm() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await openDisputeRequest(orderId, { reason: reason.trim() }, generateIdempotencyKey());
      toast.success("Disputa aberta");
      onOpened();
      setOpen(false);
      setReason("");
    } catch (error) {
      toast.error(describeApiError(error, "Não foi possível abrir a disputa."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Abrir disputa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir disputa</DialogTitle>
          <DialogDescription>
            Descreva o que aconteceu (mínimo 10 caracteres) — um mediador vai revisar e decidir.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dispute-reason">Motivo</Label>
          <Textarea
            id="dispute-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="destructive" disabled={!canSubmit || submitting} onClick={handleConfirm}>
            {submitting ? "Abrindo..." : "Confirmar abertura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RatingCard({ orderId }: { orderId: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rated, setRated] = useState<number | null>(null);

  async function handleRate(score: number) {
    if (submitting || rated) return;
    setSelected(score);
    setSubmitting(true);
    try {
      await rateOrderRequest(orderId, { score, comment: comment.trim() || undefined }, generateIdempotencyKey());
      toast.success("Avaliação enviada");
      setRated(score);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast.error("Você já avaliou esta ordem");
        setRated(score);
      } else if (error instanceof ApiError && error.status === 403) {
        toast.error("Quem cancelou a ordem não avalia a contraparte");
      } else {
        toast.error(describeApiError(error, "Não foi possível enviar a avaliação."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (rated) {
    return (
      <ActionCard title="Avaliação">
        <p className="text-muted-foreground text-sm">Você avaliou esta ordem com {rated} estrelas.</p>
      </ActionCard>
    );
  }

  return (
    <ActionCard title="Avalie a contraparte">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} estrelas`}
            disabled={submitting}
            onMouseEnter={() => setHovered(value)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleRate(value)}
          >
            <StarIcon
              className={cn(
                "size-6",
                (hovered ?? selected ?? 0) >= value ? "fill-primary text-primary" : "text-muted-foreground",
              )}
            />
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rating-comment">Comentário (opcional)</Label>
        <Textarea
          id="rating-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={2}
          maxLength={1000}
        />
      </div>
    </ActionCard>
  );
}
