"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeftIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MfaNotice } from "@/components/shared/mfa-notice";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { ProofLink } from "@/components/shared/proof-link";
import { useMockAuditLog } from "@/lib/mock/audit-log";
import { useMockDisputes, type DisputeOutcome } from "@/lib/mock/disputes";
import { useMockOrders } from "@/lib/mock/orders";
import { useMockSession } from "@/lib/mock/session";
import { formatBRL, formatUSDT } from "@/lib/mock/format";

const OUTCOME_LABEL: Record<DisputeOutcome, string> = {
  cliente: "Favorável ao cliente",
  caixeiro: "Favorável ao caixeiro",
  outro: "Outro",
};

/**
 * GET/POST /admin/disputes/:id — protótipo com dados fake. Cobre o
 * card "Tela de detalhe/decisão de disputa": evidências (comprovante e
 * TXID já existentes na ordem), chat restrito (só entre mediadores,
 * separado do `OrderChat`) e decisão com campos separados de
 * "recomendado por"/"aprovado por".
 */
export function DisputeDetailClient({ orderId }: { orderId: string }) {
  const { user } = useMockSession();
  const { orders, reviewDispute, resolveDispute } = useMockOrders();
  const { getCase, getNotes, addNote, decideCase } = useMockDisputes();
  const { logEvent } = useMockAuditLog();

  const order = orders.find((item) => item.id === orderId);
  const disputeCase = getCase(orderId);
  const notes = getNotes(orderId);

  const [noteBody, setNoteBody] = useState("");
  const [recommendedBy, setRecommendedBy] = useState(`${user.name}`);
  const [recommendation, setRecommendation] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [outcome, setOutcome] = useState<DisputeOutcome>("outro");
  const [submitting, setSubmitting] = useState(false);

  if (!order) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <p className="text-muted-foreground text-sm">Disputa não encontrada.</p>
        <Link href="/admin/disputes" className="text-foreground text-sm underline">
          Voltar
        </Link>
      </div>
    );
  }

  // Restrito ao mediador atribuído — mesmo princípio de IDOR do
  // `OrderDetail` (ver [[14 - Ofertas e Ordens]]), aplicado aqui pra
  // que a listagem "restrita aos casos atribuídos" não vire decoração:
  // acessar o ID direto na URL também precisa respeitar a atribuição.
  if (!disputeCase || disputeCase.assignedMediatorId !== user.id) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <p className="text-muted-foreground text-sm">
          Este caso não está atribuído a você.
        </p>
        <Link href="/admin/disputes" className="text-foreground text-sm underline">
          Voltar
        </Link>
      </div>
    );
  }

  const isDecided = order.status === "DISPUTE_RESOLVED";
  const canDecide = order.status === "DISPUTE_OPEN" || order.status === "DISPUTE_UNDER_REVIEW";
  const canSubmitDecision =
    recommendedBy.trim() !== "" &&
    recommendation.trim() !== "" &&
    approvedBy.trim() !== "" &&
    approvedBy.trim().toLowerCase() !== recommendedBy.trim().toLowerCase();

  function handleStartReview() {
    reviewDispute(order!.id);
    toast.success("Caso em análise");
  }

  function handleSendNote() {
    if (!noteBody.trim()) return;
    addNote(order!.id, `${user.name} (mediador)`, noteBody.trim());
    setNoteBody("");
  }

  async function handleDecide() {
    if (!canSubmitDecision || submitting) return;
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));

    decideCase(order!.id, {
      recommendedBy: recommendedBy.trim(),
      recommendation: recommendation.trim(),
      approvedBy: approvedBy.trim(),
      outcome,
      decidedAt: new Date().toISOString(),
    });
    resolveDispute(order!.id);
    logEvent({
      category: "admin",
      actor: approvedBy.trim(),
      action: "Disputa resolvida",
      target: `Ordem ${order!.publicId}`,
      details: `${OUTCOME_LABEL[outcome]} — recomendado por ${recommendedBy.trim()}, aprovado por ${approvedBy.trim()}.`,
    });
    toast.success("Disputa resolvida");
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <Link
        href="/admin/disputes"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeftIcon className="size-4" />
        Disputas
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{order.publicId}</span>
          <OrderStatusBadge status={order.status} />
        </div>
        <h1 className="text-xl font-semibold">
          {order.type === "compra" ? "Compra" : "Venda"} de USDT — {formatBRL(order.grossAmount)}
        </h1>
        <p className="text-muted-foreground text-sm">
          {order.clientName} (cliente) × {order.cashierName ?? "—"} (caixeiro) · {formatUSDT(order.netAmount)}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Evidências</h2>
        <div className="border-border flex flex-col gap-2 rounded-lg border p-3 text-sm">
          {order.disputeReason && <p>{order.disputeReason}</p>}
          {order.clientProofUrl && (
            <ProofLink url={order.clientProofUrl} name={order.clientProofName} />
          )}
          {order.txid && (
            <p className="text-muted-foreground text-xs">
              TXID informado: <span className="font-mono">{order.txid}</span>
            </p>
          )}
          {!order.clientProofUrl && !order.txid && (
            <p className="text-muted-foreground text-xs">Nenhum comprovante ou TXID anexado a esta ordem.</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Chat restrito (só mediadores)</h2>
        <div className="border-border flex flex-col gap-2 rounded-lg border p-3">
          <ol className="flex max-h-48 flex-col gap-2 overflow-y-auto text-sm">
            {notes.length === 0 && (
              <p className="text-muted-foreground text-xs">Nenhuma nota registrada ainda.</p>
            )}
            {notes.map((note) => (
              <li key={note.id} className="flex flex-col">
                <span className="text-muted-foreground text-xs">
                  {note.authorName} · {new Date(note.createdAt).toLocaleTimeString("pt-BR")}
                </span>
                <span>{note.body}</span>
              </li>
            ))}
          </ol>
          <div className="flex gap-2">
            <Textarea
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              placeholder="Nota interna — cliente e caixeiro não veem isso"
              rows={1}
            />
            <Button size="sm" onClick={handleSendNote} disabled={!noteBody.trim()}>
              Enviar
            </Button>
          </div>
        </div>
      </div>

      {isDecided ? (
        <div className="border-border flex flex-col gap-1 rounded-lg border p-4 text-sm">
          <h2 className="text-sm font-medium">Decisão registrada</h2>
          <Badge className="w-fit">{disputeCase.outcome ? OUTCOME_LABEL[disputeCase.outcome] : "—"}</Badge>
          <p>{disputeCase.recommendation}</p>
          <p className="text-muted-foreground text-xs">
            Recomendado por {disputeCase.recommendedBy} · Aprovado por {disputeCase.approvedBy}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Decisão</h2>

          {order.status === "DISPUTE_OPEN" && (
            <Button variant="outline" size="sm" className="w-fit" onClick={handleStartReview}>
              Assumir revisão
            </Button>
          )}

          {canDecide && (
            <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="outcome">Resultado</Label>
                <Select value={outcome} onValueChange={(value) => setOutcome(value as DisputeOutcome)}>
                  <SelectTrigger id="outcome" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cliente">Favorável ao cliente</SelectItem>
                    <SelectItem value="caixeiro">Favorável ao caixeiro</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="recommendation">Recomendação</Label>
                <Textarea
                  id="recommendation"
                  value={recommendation}
                  onChange={(event) => setRecommendation(event.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="recommendedBy">Recomendado por</Label>
                  <Input
                    id="recommendedBy"
                    value={recommendedBy}
                    onChange={(event) => setRecommendedBy(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="approvedBy">Aprovado por</Label>
                  <Input
                    id="approvedBy"
                    value={approvedBy}
                    onChange={(event) => setApprovedBy(event.target.value)}
                    placeholder="Precisa ser outra pessoa"
                  />
                </div>
              </div>

              {approvedBy.trim() !== "" &&
                approvedBy.trim().toLowerCase() === recommendedBy.trim().toLowerCase() && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Quem aprova precisa ser diferente de quem recomenda — dupla checagem, não a
                      mesma pessoa duas vezes.
                    </AlertDescription>
                  </Alert>
                )}

              <div className="flex items-center justify-between gap-2">
                <MfaNotice />
                <Button disabled={!canSubmitDecision || submitting} onClick={handleDecide}>
                  Registrar decisão
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
