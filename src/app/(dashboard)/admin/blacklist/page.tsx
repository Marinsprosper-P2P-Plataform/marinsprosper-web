"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MfaNotice } from "@/components/shared/mfa-notice";
import { useMockAuditLog } from "@/lib/mock/audit-log";
import { useMockBlacklist } from "@/lib/mock/blacklist";
import { useMockSession } from "@/lib/mock/session";

/** POST /admin/blacklist — protótipo com dados fake. Cobre o card
 * "Gestão de blacklist". Motivo e evidências são campos obrigatórios
 * de propósito — não existe inclusão "rápida" sem justificar, mesma
 * regra do Kanban. Toda inclusão também vira evento no log de
 * auditoria (`/admin/audit-logs`). */
export default function AdminBlacklistPage() {
  const { user } = useMockSession();
  const { entries, addEntry } = useMockBlacklist();
  const { logEvent } = useMockAuditLog();

  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = target.trim() !== "" && reason.trim() !== "" && evidence.trim() !== "";

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));

    const addedBy = `${user.name} (admin)`;
    addEntry({ target: target.trim(), reason: reason.trim(), evidence: evidence.trim(), addedBy });
    logEvent({
      category: "admin",
      actor: addedBy,
      action: "Usuário incluído na blacklist",
      target: target.trim(),
      details: reason.trim(),
    });
    toast.success("Incluído na blacklist");

    setTarget("");
    setReason("");
    setEvidence("");
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-xl font-semibold">Blacklist</h1>
        <p className="text-muted-foreground text-sm">Inclusão exige motivo e evidências — sem exceção</p>
      </div>

      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target">Usuário, conta ou dispositivo</Label>
          <Input
            id="target"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="@username, e-mail ou identificador"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reason">Motivo</Label>
          <Textarea id="reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={2} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="evidence">Evidências</Label>
          <Textarea
            id="evidence"
            value={evidence}
            onChange={(event) => setEvidence(event.target.value)}
            rows={3}
            placeholder="Descreva ou cole os dados que embasam a inclusão"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <MfaNotice />
          <Button disabled={!canSubmit || submitting} onClick={handleSubmit}>
            Incluir na blacklist
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Incluídos</h2>
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id} className="border-border flex flex-col gap-1 rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{entry.target}</span>
                <span className="text-muted-foreground text-xs">
                  {new Date(entry.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>
              <p className="text-sm">{entry.reason}</p>
              <p className="text-muted-foreground text-xs">Evidências: {entry.evidence}</p>
              <p className="text-muted-foreground text-xs">Incluído por {entry.addedBy}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
