"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { blacklistTargetRequest, listBlacklistRequest } from "@/lib/admin/api";
import { BLACKLIST_TARGET_TYPES, type BlacklistEntry, type BlacklistTargetType } from "@/lib/admin/types";
import { ApiError, ApiNetworkError } from "@/lib/api";

const TARGET_LABEL: Record<BlacklistTargetType, string> = {
  DOCUMENT: "Documento (CPF/CNPJ)",
  EMAIL: "E-mail",
  TRON_ADDRESS: "Endereço TRON",
  PIX_KEY: "Chave PIX",
  USER: "ID de usuário",
};

/**
 * `GET`/`POST /admin/blacklist` real. Cinco tipos de alvo — bloqueia-se
 * o que sobrevive à criação de outra conta (documento, e-mail,
 * endereço TRON, chave PIX), não só o `user_id`. Motivo obrigatório
 * (10-1000 caracteres) nos dois sentidos, bloqueio ou desbloqueio;
 * sem campo de "evidências" separado como o protótipo tinha — o
 * backend só grava `reason`. `POST` sempre bloqueia por padrão
 * (`action` omitido = `BLOCK`); quem esbarra num bloqueio recebe 403
 * genérico em outro endpoint, não aqui.
 */
export default function AdminBlacklistPage() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [targetType, setTargetType] = useState<BlacklistTargetType>("DOCUMENT");
  const [targetValue, setTargetValue] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await listBlacklistRequest();
      setEntries(data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiNetworkError) setError(err.message);
      else if (err instanceof ApiError && err.status === 403) {
        setError("Acesso restrito à administração — sua conta não tem o papel ADMIN.");
      } else if (err instanceof ApiError) setError(`Backend recusou a listagem: ${err.message}`);
      else setError("Não foi possível carregar a blacklist.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, []);

  const canSubmit = targetValue.trim().length >= 3 && reason.trim().length >= 10;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await blacklistTargetRequest({
        targetType,
        targetValue: targetValue.trim(),
        reason: reason.trim(),
      });
      toast.success("Incluído na blacklist");
      setTargetValue("");
      setReason("");
      load();
    } catch (err) {
      if (err instanceof ApiError && err.isValidationError) {
        toast.error(`Dados inválidos: ${err.message}`);
      } else if (err instanceof ApiError) {
        toast.error(`Não foi possível incluir: ${err.message}`);
      } else {
        toast.error("Não foi possível incluir — verifique a conexão.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-xl font-semibold">Blacklist</h1>
        <p className="text-muted-foreground text-sm">Bloqueio exige motivo — sem exceção</p>
      </div>

      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target-type">Tipo de alvo</Label>
          <Select value={targetType} onValueChange={(value) => setTargetType(value as BlacklistTargetType)}>
            <SelectTrigger id="target-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BLACKLIST_TARGET_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {TARGET_LABEL[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target-value">Valor</Label>
          <Input
            id="target-value"
            value={targetValue}
            onChange={(event) => setTargetValue(event.target.value)}
            placeholder="Documento, e-mail, endereço TRON, chave PIX ou ID de usuário"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reason">Motivo</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="Mínimo 10 caracteres — sustenta o bloqueio numa contestação"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {submitting ? "Incluindo..." : "Incluir na blacklist"}
          </Button>
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {loading && <p className="text-muted-foreground text-sm">Carregando...</p>}

      {!loading && !error && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Bloqueios em vigor</h2>
          {entries.length === 0 && <p className="text-muted-foreground text-sm">Nenhum bloqueio ativo.</p>}
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li key={entry.id} className="border-border flex flex-col gap-1 rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {TARGET_LABEL[entry.targetType]} · {entry.targetValue}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(entry.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-sm">{entry.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
