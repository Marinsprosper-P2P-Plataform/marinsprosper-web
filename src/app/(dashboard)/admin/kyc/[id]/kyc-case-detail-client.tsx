"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeftIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { claimKycCaseRequest, getKycCaseRequest, reviewKycCaseRequest } from "@/lib/kyc/admin-api";
import type { AdminKycCaseDetail } from "@/lib/kyc/admin-types";
import type { KycDocumentType } from "@/lib/kyc/types";
import { ApiError, ApiNetworkError } from "@/lib/api";

const DOCUMENT_LABEL: Record<KycDocumentType, string> = {
  ID_FRONT: "Documento (frente)",
  ID_BACK: "Documento (verso)",
  SELFIE: "Selfie",
  PROOF_OF_ADDRESS: "Comprovante de endereço",
};

function describeApiError(error: unknown, fallback: string) {
  if (error instanceof ApiNetworkError) return error.message;
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

/**
 * `GET /admin/kyc/:id` real — caso completo com URL assinada de
 * leitura (curta) de cada documento. "Assumir caso" é `POST
 * /admin/kyc/:id/claim`, UPDATE condicional em `SUBMITTED` (409 se
 * outro analista já assumiu). Decisão é `POST /admin/kyc/:id/review`:
 * aprovar move a conta de `PENDING_KYC` pra `ACTIVE`; recusar exige
 * motivo e não fecha a porta — o usuário abre um caso novo.
 */
export function AdminKycCaseDetailClient({ caseId }: { caseId: string }) {
  const [kycCase, setKycCase] = useState<AdminKycCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [reviewing, setReviewing] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getKycCaseRequest(caseId);
      setKycCase(data);
      setError(null);
    } catch (err) {
      setError(describeApiError(err, "Não foi possível carregar o caso."));
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function handleClaim() {
    setClaiming(true);
    try {
      const { data } = await claimKycCaseRequest(caseId);
      setKycCase(data);
      toast.success("Caso assumido");
    } catch (err) {
      if (err instanceof ApiError && err.isConflict) {
        toast.error("Caso já foi assumido por outro analista ou já foi decidido.");
        load();
      } else {
        toast.error(describeApiError(err, "Não foi possível assumir o caso."));
      }
    } finally {
      setClaiming(false);
    }
  }

  async function handleApprove() {
    setReviewing("APPROVED");
    try {
      const { data } = await reviewKycCaseRequest(caseId, { decision: "APPROVED" });
      setKycCase(data);
      toast.success("Caso aprovado — conta liberada");
    } catch (err) {
      if (err instanceof ApiError && err.isConflict) {
        toast.error("Caso não está mais aguardando decisão.");
        load();
      } else {
        toast.error(describeApiError(err, "Não foi possível aprovar o caso."));
      }
    } finally {
      setReviewing(null);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error("Recusa exige motivo — é o que o usuário precisa pra saber o que reenviar.");
      return;
    }
    setReviewing("REJECTED");
    try {
      const { data } = await reviewKycCaseRequest(caseId, {
        decision: "REJECTED",
        reason: rejectReason.trim(),
      });
      setKycCase(data);
      toast.success("Caso recusado");
      setShowRejectForm(false);
      setRejectReason("");
    } catch (err) {
      if (err instanceof ApiError && err.isConflict) {
        toast.error("Caso não está mais aguardando decisão.");
        load();
      } else {
        toast.error(describeApiError(err, "Não foi possível recusar o caso."));
      }
    } finally {
      setReviewing(null);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground p-4 text-sm">Carregando...</p>;
  }

  if (error || !kycCase) {
    return <p className="text-destructive p-4 text-sm">{error ?? "Caso não encontrado."}</p>;
  }

  const canDecide = kycCase.status === "SUBMITTED" || kycCase.status === "IN_REVIEW";

  return (
    <div className="flex flex-col gap-4 p-4">
      <Link href="/admin/kyc" className="text-muted-foreground flex items-center gap-1 text-sm hover:underline">
        <ArrowLeftIcon className="size-4" />
        Fila de KYC
      </Link>

      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{kycCase.user.profile?.fullName ?? kycCase.user.email}</h1>
          <p className="text-muted-foreground text-sm">{kycCase.user.email}</p>
        </div>
        <Badge variant={kycCase.status === "IN_REVIEW" ? "default" : "secondary"}>{kycCase.status}</Badge>
      </div>

      <div className="border-border grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-xs">Tipo de documento</p>
          <p>{kycCase.user.profile?.documentType ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Status da conta</p>
          <p>{kycCase.user.status}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Submetido em</p>
          <p>{kycCase.submittedAt ? new Date(kycCase.submittedAt).toLocaleString("pt-BR") : "—"}</p>
        </div>
        {kycCase.rejectionReason && (
          <div className="col-span-2 sm:col-span-3">
            <p className="text-muted-foreground text-xs">Motivo da recusa (decisão anterior)</p>
            <p>{kycCase.rejectionReason}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Documentos</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {kycCase.documents.map((document) => (
            <div key={document.id} className="border-border flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{DOCUMENT_LABEL[document.type]}</span>
                <span className="text-muted-foreground text-xs">
                  {(document.sizeBytes / 1024).toFixed(0)} KB
                </span>
              </div>
              {document.url ? (
                <a
                  href={document.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary text-xs hover:underline"
                >
                  Ver documento (link expira em pouco tempo)
                </a>
              ) : (
                <span className="text-muted-foreground text-xs">
                  URL indisponível — storage não configurado neste ambiente
                </span>
              )}
            </div>
          ))}
          {kycCase.documents.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhum documento anexado.</p>
          )}
        </div>
      </div>

      {canDecide && (
        <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
          <h2 className="text-sm font-medium">Decisão</h2>

          {kycCase.status === "SUBMITTED" && (
            <Button variant="outline" disabled={claiming} onClick={handleClaim} className="w-fit">
              {claiming ? "Assumindo..." : "Assumir caso"}
            </Button>
          )}

          <div className="flex flex-wrap gap-2">
            <Button disabled={reviewing !== null} onClick={handleApprove}>
              {reviewing === "APPROVED" ? "Aprovando..." : "Aprovar"}
            </Button>
            <Button
              variant="destructive"
              disabled={reviewing !== null}
              onClick={() => setShowRejectForm((current) => !current)}
            >
              Recusar
            </Button>
          </div>

          {showRejectForm && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="reject-reason">Motivo da recusa</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={2}
                placeholder="O que o usuário precisa corrigir pra reenviar"
              />
              <Button
                variant="destructive"
                disabled={reviewing !== null || !rejectReason.trim()}
                onClick={handleReject}
                className="w-fit"
              >
                {reviewing === "REJECTED" ? "Recusando..." : "Confirmar recusa"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
