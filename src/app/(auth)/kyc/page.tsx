"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadIcon } from "lucide-react";
import { AuthCard } from "@/components/shared/auth-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** POST /kyc/documents — protótipo com dados fake. Nenhum arquivo é
 * enviado de verdade; o upload real (Presigned URL) entra no Sprint 4. */
export default function KycPage() {
  const router = useRouter();
  const [document, setDocument] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !!document && !!selfie && !submitting;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    toast.success("Documentos enviados para análise");
    router.push("/kyc/status");
  }

  return (
    <AuthCard
      title="Verificação de identidade"
      description="Nível de verificação atual"
    >
      <Badge variant="secondary" className="w-fit">
        Nível 0 — não verificado
      </Badge>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <FileField
          id="document"
          label="Documento com foto (RG, CNH ou passaporte)"
          file={document}
          onChange={setDocument}
        />
        <FileField
          id="selfie"
          label="Selfie segurando o documento"
          file={selfie}
          onChange={setSelfie}
        />

        <Button type="submit" disabled={!canSubmit}>
          Enviar para análise
        </Button>
      </form>
    </AuthCard>
  );
}

function FileField({
  id,
  label,
  file,
  onChange,
}: {
  id: string;
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <label
        htmlFor={id}
        className={cn(
          "border-input flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-4 text-center text-sm transition-colors",
          file ? "border-status-completed text-foreground" : "text-muted-foreground hover:bg-accent",
        )}
      >
        <UploadIcon className="size-5" />
        {file ? file.name : "Toque para escolher um arquivo"}
      </label>
      <input
        id={id}
        type="file"
        accept="image/*,.pdf"
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}
