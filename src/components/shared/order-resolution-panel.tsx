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
import { CANCELLABLE_STATUSES, useMockOrders } from "@/lib/mock/orders";
import { useMockSession } from "@/lib/mock/session";
import type { Order } from "@/types/order";

/**
 * Cancelamento, disputa e avaliação — os três fluxos que partem "de
 * qualquer estado intermediário" (Arquitetura Técnica, seção 4), por
 * isso ficam num painel separado das ações do ciclo principal
 * (OrderActions), que dependem do status exato.
 */
export function OrderResolutionPanel({ order }: { order: Order }) {
  const { user } = useMockSession();
  const { requestCancel, respondCancel, openDispute, rateOrder } = useMockOrders();

  // `isClient`/`isCashier` são papéis DESTA ordem, não da conta em
  // geral — a mesma conta pode ser cliente numa ordem e caixeiro em
  // outra ao mesmo tempo.
  const isClient = order.clientId === user.id;
  const isCashier = order.cashierId === user.id;
  const isParticipant = isClient || isCashier;

  if (!isParticipant) return null;

  if (order.status === "CANCEL_REQUESTED") {
    const requesterIsMe =
      (order.cancelRequestedBy === "cliente" && isClient) ||
      (order.cancelRequestedBy === "caixeiro" && isCashier);

    return (
      <ActionCard title="Cancelamento solicitado">
        {order.cancelReason && (
          <p className="text-muted-foreground text-sm">Motivo: {order.cancelReason}</p>
        )}
        {requesterIsMe ? (
          <p className="text-muted-foreground text-sm">
            Aguardando a resposta da contraparte. Por regra, quem solicita o
            cancelamento não avalia a contraparte depois.
          </p>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                respondCancel(order.id, true);
                toast.success("Cancelamento aceito");
              }}
            >
              Aceitar cancelamento
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                respondCancel(order.id, false);
                toast.error("Cancelamento recusado — disputa aberta");
              }}
            >
              Recusar
            </Button>
          </div>
        )}
      </ActionCard>
    );
  }

  if (order.status === "CANCEL_ACCEPTED") {
    return (
      <ActionCard title="Ordem cancelada">
        <p className="text-muted-foreground text-sm">
          Cancelada por acordo entre as partes.
        </p>
      </ActionCard>
    );
  }

  if (
    order.status === "DISPUTE_OPEN" ||
    order.status === "DISPUTE_UNDER_REVIEW" ||
    order.status === "DISPUTE_RESOLVED"
  ) {
    return (
      <ActionCard title="Disputa">
        {order.disputeReason && (
          <p className="text-sm">{order.disputeReason}</p>
        )}
        <p className="text-muted-foreground text-sm">
          Um mediador vai analisar as evidências e decidir — nenhuma das partes
          resolve isso sozinha.
        </p>
      </ActionCard>
    );
  }

  if (order.status === "COMPLETED") {
    return <RatingCard order={order} onRate={(rating) => rateOrder(order.id, rating)} />;
  }

  if (CANCELLABLE_STATUSES.includes(order.status)) {
    return (
      <div className="flex gap-2">
        <CancelDialog
          onConfirm={(reason) => {
            requestCancel(order.id, isClient ? "cliente" : "caixeiro", reason);
            toast.success("Cancelamento solicitado");
          }}
        />
        <DisputeDialog
          onConfirm={(reason) => {
            openDispute(order.id, reason);
            toast.success("Disputa aberta");
          }}
        />
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

function CancelDialog({ onConfirm }: { onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cancel-reason">Motivo</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button
            disabled={!reason.trim()}
            onClick={() => {
              onConfirm(reason.trim());
              setOpen(false);
              setReason("");
            }}
          >
            Confirmar solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DisputeDialog({ onConfirm }: { onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

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
            Descreva o que aconteceu — um mediador vai revisar evidências e decidir.
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
          <Button
            variant="destructive"
            disabled={!reason.trim()}
            onClick={() => {
              onConfirm(reason.trim());
              setOpen(false);
              setReason("");
            }}
          >
            Confirmar abertura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RatingCard({ order, onRate }: { order: Order; onRate: (rating: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (order.rating) {
    return (
      <ActionCard title="Avaliação">
        <p className="text-muted-foreground text-sm">Você avaliou esta ordem com {order.rating} estrelas.</p>
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
            onMouseEnter={() => setHovered(value)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onRate(value)}
          >
            <StarIcon
              className={cn(
                "size-6",
                (hovered ?? 0) >= value ? "fill-primary text-primary" : "text-muted-foreground",
              )}
            />
          </button>
        ))}
      </div>
    </ActionCard>
  );
}
