"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadIcon } from "lucide-react";
import { AuthCard } from "@/components/shared/auth-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { attachKycDocument, openKycCaseRequest, submitKycCaseRequest } from "@/lib/kyc/api";
import type { KycCase } from "@/lib/kyc/types";
import { ACCEPTED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/lib/uploads/types";
import { ApiError, ApiNetworkError } from "@/lib/api";

function describeApiError(error: unknown, fallback: string) {
  if (error instanceof ApiNetworkError) return error.message;
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

/**
 * `POST /kyc` (abre/retoma o caso), `POST /kyc/documents` (upload em
 * duas fases via `POST /uploads`) e `POST /kyc/submit` reais. `ID_FRONT`
 * mapeia o antigo campo genérico "documento" do protótipo — o backend
 * também aceita `ID_BACK`/`PROOF_OF_ADDRESS`, mas só `ID_FRONT`+`SELFIE`
 * são obrigatórios pra submeter.
 */
export default function KycPage() {
  const router = useRouter();
  const [kycCase, setKycCase] = useState<KycCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingIdFront, setUploadingIdFront] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await openKycCaseRequest();
        if (!cancelled) setKycCase(data);
      } catch (err) {
        if (!cancelled) setError(describeApiError(err, "Não foi possível abrir o caso de verificação."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpload(file: File, type: "ID_FRONT" | "SELFIE") {
    if (!ACCEPTED_UPLOAD_TYPES.includes(file.type as (typeof ACCEPTED_UPLOAD_TYPES)[number])) {
      toast.error("Formato não aceito — envie JPEG, PNG, WEBP ou PDF");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(`Arquivo maior que ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`);
      return;
    }

    const setUploading = type === "ID_FRONT" ? setUploadingIdFront : setUploadingSelfie;
    setUploading(true);
    try {
      const { data } = await attachKycDocument(file, type);
      setKycCase(data);
    } catch (err) {
      toast.error(describeApiError(err, "Não foi possível enviar o documento."));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!kycCase || kycCase.missingDocuments.length > 0 || submitting) return;
    setSubmitting(true);
    try {
      await submitKycCaseRequest();
      toast.success("Documentos enviados para análise");
      router.push("/kyc/status");
    } catch (err) {
      toast.error(describeApiError(err, "Não foi possível enviar pra análise."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AuthCard title="Verificação de identidade" description="Nível de verificação atual">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </AuthCard>
    );
  }

  if (error || !kycCase) {
    return (
      <AuthCard title="Verificação de identidade" description="Nível de verificação atual">
        <p className="text-destructive text-sm">{error ?? "Não foi possível carregar."}</p>
      </AuthCard>
    );
  }

  const hasIdFront = !kycCase.missingDocuments.includes("ID_FRONT");
  const hasSelfie = !kycCase.missingDocuments.includes("SELFIE");
  const canSubmit = kycCase.missingDocuments.length === 0 && !submitting;

  return (
    <AuthCard title="Verificação de identidade" description="Nível de verificação atual">
      <Badge variant="secondary" className="w-fit">
        Nível 0 — não verificado
      </Badge>

      <div className="flex flex-col gap-4">
        <FileField
          id="id-front"
          label="Documento com foto (RG, CNH ou passaporte)"
          done={hasIdFront}
          uploading={uploadingIdFront}
          onChange={(file) => handleUpload(file, "ID_FRONT")}
        />
        <FileField
          id="selfie"
          label="Selfie segurando o documento"
          done={hasSelfie}
          uploading={uploadingSelfie}
          onChange={(file) => handleUpload(file, "SELFIE")}
        />

        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? "Enviando..." : "Enviar para análise"}
        </Button>
      </div>
    </AuthCard>
  );
}

function FileField({
  id,
  label,
  done,
  uploading,
  onChange,
}: {
  id: string;
  label: string;
  done: boolean;
  uploading: boolean;
  onChange: (file: File) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <label
        htmlFor={id}
        className={cn(
          "border-input flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-4 text-center text-sm transition-colors",
          done ? "border-status-completed text-foreground" : "text-muted-foreground hover:bg-accent",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        <UploadIcon className="size-5" />
        {uploading ? "Enviando..." : done ? "Enviado" : "Toque para escolher um arquivo"}
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,.pdf"
        className="sr-only"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onChange(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
