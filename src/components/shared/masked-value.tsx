"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Campo sensível mascarado por padrão — documento, dados bancários,
 * endereço de carteira ([[03 - Modelo de Dados]]: "campos sensíveis...
 * são mascarados por padrão nas telas administrativas"). `onReveal` é
 * obrigatório de propósito: não existe um jeito de usar este
 * componente sem registrar a ação em algum lugar (ver `logEvent` nos
 * pontos de uso) — mascarar sem logar quem des-mascarou não cumpre a
 * regra.
 */
export function MaskedValue({ value, onReveal }: { value: string; onReveal: () => void }) {
  const [revealed, setRevealed] = useState(false);

  function toggle() {
    if (!revealed) onReveal();
    setRevealed((current) => !current);
  }

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs">
      {revealed ? value : maskValue(value)}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-5"
        aria-label={revealed ? "Ocultar valor" : "Revelar valor"}
        onClick={toggle}
      >
        {revealed ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
      </Button>
    </span>
  );
}

function maskValue(value: string) {
  const visible = value.slice(-4);
  return `${"•".repeat(Math.max(0, value.length - 4))}${visible}`;
}
