"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Modal exibido antes de publicar a ordem — regras de uso, caução/custódia
 * e penalidades (Parte 1, seção 4: pré-requisito de anúncio), mais a
 * reconfirmação de senha de acesso que autoriza a abertura da
 * solicitação. Validação de UI só: não existe conta real pra checar a
 * senha contra nada ainda (Sprint -1) — o formato "não vazio" é tudo
 * que dá pra garantir aqui; a autenticação de verdade é backend.
 */
export function OrderRulesDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [agreed, setAgreed] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canConfirm = agreed && password.trim().length > 0;

  function reset() {
    setAgreed(false);
    setPassword("");
  }

  async function handleConfirm() {
    if (!canConfirm || submitting) return;
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    onConfirm();
    setSubmitting(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Regras da ordem</DialogTitle>
          <DialogDescription>
            Leia antes de confirmar — vale tanto pra compra quanto pra venda.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm">
          <div>
            <p className="font-medium">Caução e custódia</p>
            <p className="text-muted-foreground">
              O USDT da contraparte fica reservado em custódia assim que um caixeiro aceita a
              ordem, e só é liberado depois da confirmação final de recebimento. Nenhuma das
              partes controla a liberação sozinha.
            </p>
          </div>
          <div>
            <p className="font-medium">Ordem de transferência</p>
            <p className="text-muted-foreground">
              O cliente transfere primeiro e anexa o comprovante — o caixeiro só confirma
              recebimento depois de receber de verdade.
            </p>
          </div>
          <div>
            <p className="font-medium">Penalidades</p>
            <p className="text-muted-foreground">
              Descumprir os prazos ou as regras do ciclo pode levar à abertura de disputa,
              suspensão da conta e perda da caução envolvida, conforme avaliação do mediador.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t pt-3">
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={agreed} onCheckedChange={(value) => setAgreed(value === true)} />
            Li e concordo com as regras de uso, caução/custódia e penalidades acima.
          </label>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="order-password">Senha de acesso</Label>
            <Input
              id="order-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Confirme sua senha pra autorizar a abertura"
            />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={!canConfirm || submitting} onClick={handleConfirm}>
            Confirmar e criar ordem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
