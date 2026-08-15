"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeftIcon, UploadIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { useAuth } from "@/lib/auth";
import { formatBRL, formatUSDT } from "@/lib/mock/format";
import { presentOrderForFrontend } from "@/lib/orders/adapt";
import { getOrderRequest } from "@/lib/orders/api";
import type { BackendOrder } from "@/lib/orders/types";
import {
  decideDisputeRequest,
  getDisputeRequest,
  sendDisputeMessageRequest,
  submitEvidenceRequest,
} from "@/lib/disputes/api";
import type {
  DisputeDetail,
  DisputeMessageAudience,
  DisputeResolution,
} from "@/lib/disputes/types";
import { generateIdempotencyKey, ApiError, ApiNetworkError } from "@/lib/api";

const STATUS_LABEL: Record<DisputeDetail["status"], string> = {
  OPEN: "Aberta",
  UNDER_REVIEW: "Em análise",
  RESOLVED: "Resolvida",
};

const AUDIENCE_LABEL: Record<DisputeMessageAudience, string> = {
  ALL: "Todos",
  MEDIATOR_CLIENT: "Só cliente",
  MEDIATOR_CASHIER: "Só caixeiro",
};

const RESOLUTION_LABEL: Record<DisputeResolution, string> = {
  RELEASE: "Liberar pro beneficiário fixado",
  REFUND: "Estornar ao caixeiro",
};

function describeApiError(error: unknown, fallback: string) {
  if (error instanceof ApiNetworkError) return error.message;
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/**
 * `GET /disputes/:id` real — evidências, mensagens (já filtradas pelo
 * público de quem pede) e decisões (recomendação + aprovação, dois
 * mediadores diferentes). Substitui `/admin/disputes/:id`. Sem "assumir
 * revisão" explícito: o backend designa o mediador com menos fila na
 * abertura, e a primeira recomendação assume a disputa se ainda não
 * tinha dono — não existe endpoint separado pra isso.
 */
export function DisputeDetailClient({ disputeId }: { disputeId: string }) {
  const { user } = useAuth();
  const viewerId = user?.id ?? "";
  const isMediatorRole = user?.roles.includes("MEDIATOR") ?? false;

  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [order, setOrder] = useState<BackendOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetchToken, setRefetchToken] = useState(0);
  const refetch = () => setRefetchToken((token) => token + 1);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await getDisputeRequest(disputeId);
        if (cancelled) return;
        setDispute(data);
        setError(null);

        const { data: orderData } = await getOrderRequest(data.orderId);
        if (cancelled) return;
        setOrder(orderData);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setError("Disputa não encontrada.");
        } else if (err instanceof ApiNetworkError) {
          setError(err.message);
        } else {
          setError("Não foi possível carregar a disputa.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [disputeId, refetchToken]);

  if (loading) {
    return <p className="text-muted-foreground p-4 text-sm">Carregando...</p>;
  }

  if (error || !dispute) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <p className="text-muted-foreground text-sm">{error ?? "Disputa não encontrada."}</p>
        <Link href="/disputes" className="text-foreground text-sm underline">
          Voltar
        </Link>
      </div>
    );
  }

  const isClient = order?.clientId === viewerId;
  const isCashier = order?.cashierId === viewerId;
  const isParty = isClient || isCashier;
  const recommendations = dispute.decisions.filter((d) => d.kind === "RECOMMENDATION");
  const approvals = dispute.decisions.filter((d) => d.kind === "APPROVAL");
  const pendingRecommendation = [...recommendations]
    .reverse()
    .find((r) => !approvals.some((a) => a.recommendationId === r.id));
  const finalApproval = approvals[approvals.length - 1];

  return (
    <div className="flex flex-col gap-6 p-4">
      <Link
        href="/disputes"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeftIcon className="size-4" />
        Disputas
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">#{shortId(dispute.orderId)}</span>
          <Badge variant={dispute.status === "RESOLVED" ? "secondary" : "default"}>
            {STATUS_LABEL[dispute.status]}
          </Badge>
          {order && <OrderStatusBadge status={presentOrderForFrontend(order, viewerId).status} />}
        </div>
        {order && (
          <h1 className="text-xl font-semibold">
            {order.side === "CLIENT_BUYS_ASSET" ? "Compra" : "Venda"} de USDT —{" "}
            {formatBRL(Number(order.fiatAmount))} · {formatUSDT(Number(order.assetAmount))}
          </h1>
        )}
        {dispute.reason && <p className="text-sm">{dispute.reason}</p>}
      </div>

      <EvidenceSection disputeId={dispute.id} evidence={dispute.evidence} canSubmit={isParty || isMediatorRole} onSubmitted={refetch} />

      <MessagesSection
        disputeId={dispute.id}
        messages={dispute.messages}
        isMediator={isMediatorRole}
        onSent={refetch}
      />

      {dispute.status === "RESOLVED" ? (
        <div className="border-border flex flex-col gap-1 rounded-lg border p-4 text-sm">
          <h2 className="text-sm font-medium">Decisão registrada</h2>
          {dispute.resolution && <Badge className="w-fit">{RESOLUTION_LABEL[dispute.resolution]}</Badge>}
          {finalApproval && <p className="text-muted-foreground text-xs">{finalApproval.rationale}</p>}
          {dispute.resolvedAt && (
            <p className="text-muted-foreground text-xs">
              Resolvida em {new Date(dispute.resolvedAt).toLocaleString("pt-BR")}
            </p>
          )}
        </div>
      ) : isMediatorRole ? (
        <DecisionSection
          disputeId={dispute.id}
          pendingRecommendation={pendingRecommendation}
          viewerId={viewerId}
          onDecided={refetch}
        />
      ) : (
        <p className="text-muted-foreground text-sm">
          Um mediador vai analisar as evidências e decidir — nenhuma das partes resolve isso sozinha.
        </p>
      )}
    </div>
  );
}

function EvidenceSection({
  disputeId,
  evidence,
  canSubmit,
  onSubmitted,
}: {
  disputeId: string;
  evidence: DisputeDetail["evidence"];
  canSubmit: boolean;
  onSubmitted: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!file || submitting) return;
    setSubmitting(true);
    try {
      await submitEvidenceRequest(disputeId, file, description.trim() || undefined);
      toast.success("Prova anexada");
      setFile(null);
      setDescription("");
      onSubmitted();
    } catch (error) {
      toast.error(describeApiError(error, "Não foi possível anexar a prova."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">Evidências</h2>
      <div className="border-border flex flex-col gap-2 rounded-lg border p-3 text-sm">
        {evidence.length === 0 && <p className="text-muted-foreground text-xs">Nenhuma prova anexada ainda.</p>}
        {evidence.map((item) => (
          <div key={item.id} className="flex flex-col gap-0.5">
            {item.url ? (
              <a href={item.url} target="_blank" rel="noreferrer" className="text-foreground underline">
                {item.filename}
              </a>
            ) : (
              <span>{item.filename}</span>
            )}
            {item.description && <span className="text-muted-foreground text-xs">{item.description}</span>}
          </div>
        ))}

        {canSubmit && (
          <div className="border-border flex flex-col gap-2 border-t pt-2">
            <label
              htmlFor="evidence-file"
              className="border-input hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-2 text-sm"
            >
              <UploadIcon className="size-4" />
              {file ? file.name : "Anexar arquivo"}
            </label>
            <input
              id="evidence-file"
              type="file"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="O que esse arquivo mostra (opcional)"
              rows={2}
            />
            <Button size="sm" onClick={handleSubmit} disabled={!file || submitting} className="w-fit">
              {submitting ? "Enviando..." : "Anexar prova"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function MessagesSection({
  disputeId,
  messages,
  isMediator,
  onSent,
}: {
  disputeId: string;
  messages: DisputeDetail["messages"];
  isMediator: boolean;
  onSent: () => void;
}) {
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<DisputeMessageAudience>("ALL");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      await sendDisputeMessageRequest(disputeId, {
        body: body.trim(),
        audience: isMediator ? audience : "ALL",
      });
      setBody("");
      onSent();
    } catch (error) {
      toast.error(describeApiError(error, "Não foi possível enviar a mensagem."));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">Apuração</h2>
      <div className="border-border flex flex-col gap-2 rounded-lg border p-3">
        <ol className="flex max-h-64 flex-col gap-2 overflow-y-auto text-sm">
          {messages.length === 0 && <p className="text-muted-foreground text-xs">Nenhuma mensagem ainda.</p>}
          {messages.map((message) => (
            <li key={message.id} className="flex flex-col">
              <span className="text-muted-foreground text-xs">
                {shortId(message.authorId)} · {new Date(message.createdAt).toLocaleTimeString("pt-BR")}
                {message.audience !== "ALL" && ` · ${AUDIENCE_LABEL[message.audience]}`}
              </span>
              <span>{message.body}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Escrever na apuração"
            rows={1}
            className="flex-1"
          />
          {isMediator && (
            <Select value={audience} onValueChange={(value) => setAudience(value as DisputeMessageAudience)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="MEDIATOR_CLIENT">Só cliente</SelectItem>
                <SelectItem value="MEDIATOR_CASHIER">Só caixeiro</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button size="sm" onClick={handleSend} disabled={!body.trim() || sending}>
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}

function DecisionSection({
  disputeId,
  pendingRecommendation,
  viewerId,
  onDecided,
}: {
  disputeId: string;
  pendingRecommendation: DisputeDetail["decisions"][number] | undefined;
  viewerId: string;
  onDecided: () => void;
}) {
  const [resolution, setResolution] = useState<DisputeResolution>(
    pendingRecommendation?.resolution ?? "RELEASE",
  );
  const [rationale, setRationale] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isOwnRecommendation = pendingRecommendation?.actorId === viewerId;
  const canSubmit = rationale.trim().length >= 10;

  const handleDecideCallback = useCallback(
    async (kind: "RECOMMENDATION" | "APPROVAL") => {
      if (!canSubmit || submitting) return;
      setSubmitting(true);
      try {
        await decideDisputeRequest(
          disputeId,
          {
            kind,
            resolution: pendingRecommendation ? pendingRecommendation.resolution : resolution,
            rationale: rationale.trim(),
            recommendationId: kind === "APPROVAL" ? pendingRecommendation?.id : undefined,
          },
          generateIdempotencyKey(),
        );
        toast.success(kind === "RECOMMENDATION" ? "Recomendação registrada" : "Disputa resolvida");
        setRationale("");
        onDecided();
      } catch (error) {
        toast.error(describeApiError(error, "Não foi possível registrar a decisão."));
      } finally {
        setSubmitting(false);
      }
    },
    [canSubmit, submitting, disputeId, pendingRecommendation, resolution, rationale, onDecided],
  );

  if (pendingRecommendation && isOwnRecommendation) {
    return (
      <div className="border-border flex flex-col gap-2 rounded-lg border p-4 text-sm">
        <h2 className="text-sm font-medium">Recomendação enviada</h2>
        <p className="text-muted-foreground">
          {RESOLUTION_LABEL[pendingRecommendation.resolution]} — aguardando outro mediador aprovar. Quem
          recomenda não aprova a própria recomendação.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-sm font-medium">
        {pendingRecommendation ? "Aprovar recomendação" : "Recomendar desfecho"}
      </h2>

      {pendingRecommendation && (
        <Alert>
          <AlertDescription>
            Recomendado por {shortId(pendingRecommendation.actorId)}: {pendingRecommendation.rationale}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="resolution">Desfecho</Label>
        <Select
          value={pendingRecommendation ? pendingRecommendation.resolution : resolution}
          onValueChange={(value) => setResolution(value as DisputeResolution)}
          disabled={!!pendingRecommendation}
        >
          <SelectTrigger id="resolution" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RELEASE">{RESOLUTION_LABEL.RELEASE}</SelectItem>
            <SelectItem value="REFUND">{RESOLUTION_LABEL.REFUND}</SelectItem>
          </SelectContent>
        </Select>
        {pendingRecommendation && (
          <p className="text-muted-foreground text-xs">
            A aprovação precisa confirmar o mesmo desfecho da recomendação — pra decidir diferente, recomende
            de novo.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rationale">Fundamentação (mínimo 10 caracteres)</Label>
        <Textarea id="rationale" value={rationale} onChange={(event) => setRationale(event.target.value)} rows={3} />
      </div>

      <Button
        disabled={!canSubmit || submitting}
        onClick={() => handleDecideCallback(pendingRecommendation ? "APPROVAL" : "RECOMMENDATION")}
        className="w-fit"
      >
        {submitting
          ? "Registrando..."
          : pendingRecommendation
            ? "Aprovar e resolver"
            : "Registrar recomendação"}
      </Button>
    </div>
  );
}
