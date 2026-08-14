"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Botão de copiar com feedback textual temporário ("Copiado" etc.) —
 * usado nos campos sensíveis do detalhe da ordem (titular, chave PIX,
 * valor, documento, TXID). O texto exibido depois de copiar é
 * calculado pelo chamador (`copiedLabel`), nunca um ternário dentro do
 * JSX — evita o bug de labels vazios num motor de template que não
 * suporta ternário inline (ver histórico deste componente). */
export function CopyFieldButton({
  value,
  label,
  copiedLabel,
  className,
}: {
  value: string;
  label: string;
  copiedLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const buttonText = copied ? copiedLabel : label;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={cn("gap-1.5", className)}
    >
      {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      {buttonText}
    </Button>
  );
}
