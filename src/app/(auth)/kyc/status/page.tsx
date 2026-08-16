"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/shared/auth-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMyKycCaseRequest } from "@/lib/kyc/api";
import type { KycCase, KycCaseStatus } from "@/lib/kyc/types";
import { ApiError, ApiNetworkError } from "@/lib/api";

const STATUS_META: Record<KycCaseStatus, { label: string; variant: "secondary" | "default" | "destructive" }> = {
  DRAFT: { label: "Rascunho — envie os documentos", variant: "secondary" },
  SUBMITTED: { label: "Em análise", variant: "secondary" },
  IN_REVIEW: { label: "Em análise", variant: "secondary" },
  APPROVED: { label: "Aprovado", variant: "default" },
  REJECTED: { label: "Rejeitado", variant: "destructive" },
};

function describeApiError(error: unknown, fallback: string) {
  if (error instanceof ApiNetworkError) return error.message;
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

/** `GET /kyc/me` real — sem parâmetro de query pra simular estado, o
 * status vem do caso de verdade. 404 (nenhum caso aberto ainda) manda
 * de volta pra `/kyc`. */
export default function KycStatusPage() {
  const [kycCase, setKycCase] = useState<KycCase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await getMyKycCaseRequest();
        if (!cancelled) setKycCase(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setError("Nenhum caso de verificação aberto ainda.");
        } else {
          setError(describeApiError(err, "Não foi possível carregar o status."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <AuthCard title="Verificação de identidade" description="Status do seu envio">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </AuthCard>
    );
  }

  if (error || !kycCase) {
    return (
      <AuthCard title="Verificação de identidade" description="Status do seu envio">
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button asChild>
          <Link href="/kyc">Começar verificação</Link>
        </Button>
      </AuthCard>
    );
  }

  const meta = STATUS_META[kycCase.status];

  return (
    <AuthCard title="Verificação de identidade" description="Status do seu envio">
      <Badge variant={meta.variant} className="w-fit">
        {meta.label}
      </Badge>

      {(kycCase.status === "SUBMITTED" || kycCase.status === "IN_REVIEW") && (
        <p className="text-muted-foreground text-sm">
          Seus documentos foram recebidos e estão em análise.
        </p>
      )}

      {kycCase.status === "APPROVED" && (
        <>
          <p className="text-muted-foreground text-sm">
            Identidade verificada. Você já pode operar na plataforma.
          </p>
          <Button asChild>
            <Link href="/offers">Ir para ofertas</Link>
          </Button>
        </>
      )}

      {kycCase.status === "REJECTED" && (
        <>
          <p className="text-muted-foreground text-sm">
            {kycCase.rejectionReason ?? "Não foi possível confirmar sua identidade com os documentos enviados."}
          </p>
          <Button asChild>
            <Link href="/kyc">Enviar novamente</Link>
          </Button>
        </>
      )}

      {kycCase.status === "DRAFT" && (
        <>
          <p className="text-muted-foreground text-sm">Faltam documentos pra enviar pra análise.</p>
          <Button asChild>
            <Link href="/kyc">Continuar envio</Link>
          </Button>
        </>
      )}
    </AuthCard>
  );
}
