"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CopyIcon, ShieldCheckIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  mfaActivateRequest,
  mfaDisableRequest,
  mfaSetupRequest,
  mfaStatusRequest,
  type MfaSetupResponse,
  type MfaStatus,
} from "@/lib/auth/api";
import { ApiError, ApiNetworkError } from "@/lib/api";

function describeApiError(error: unknown, fallback: string) {
  if (error instanceof ApiNetworkError) return error.message;
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

/**
 * `GET`/`POST /auth/mfa/*` reais — enrollment do segundo fator,
 * separado do desafio de login (`/mfa`, já real desde a rodada de
 * autenticação). Sem QR renderizado (sem lib de QR code no projeto
 * ainda) — mostra a chave em texto pra digitar manualmente no app
 * autenticador, o que é funcionalmente completo, só menos cômodo.
 */
export function MfaSettings() {
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [activateCode, setActivateCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disableCode, setDisableCode] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    mfaStatusRequest()
      .then(({ data }) => setStatus(data))
      .catch((err) => toast.error(describeApiError(err, "Não foi possível carregar o status do MFA.")));
  };

  useEffect(() => {
    mfaStatusRequest()
      .then(({ data }) => setStatus(data))
      .catch((err) => toast.error(describeApiError(err, "Não foi possível carregar o status do MFA.")))
      .finally(() => setLoading(false));
  }, []);

  async function handleSetup() {
    setBusy(true);
    try {
      const { data } = await mfaSetupRequest();
      setSetup(data);
      setActivateCode("");
    } catch (err) {
      toast.error(describeApiError(err, "Não foi possível iniciar o cadastro."));
    } finally {
      setBusy(false);
    }
  }

  async function handleActivate() {
    if (!/^\d{6}$/.test(activateCode.trim()) || busy) return;
    setBusy(true);
    try {
      const { data } = await mfaActivateRequest(activateCode.trim());
      setRecoveryCodes(data.recoveryCodes);
      setSetup(null);
      load();
    } catch (err) {
      toast.error(describeApiError(err, "Código inválido."));
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    if (!disableCode.trim() || disabling) return;
    setDisabling(true);
    try {
      await mfaDisableRequest(disableCode.trim());
      toast.success("Segundo fator desativado");
      setDisableCode("");
      load();
    } catch (err) {
      toast.error(describeApiError(err, "Código inválido."));
    } finally {
      setDisabling(false);
    }
  }

  async function handleCopy(value: string) {
    await navigator.clipboard.writeText(value);
    toast.success("Copiado");
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">Carregando...</p>;
  }

  if (recoveryCodes) {
    return (
      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheckIcon className="size-4" />
          Segundo fator ativado
        </h2>
        <Alert variant="destructive">
          <AlertDescription>
            Salve estes códigos de recuperação agora — eles não aparecem de novo. Cada um só
            funciona uma vez, pra quando você perder o acesso ao app autenticador.
          </AlertDescription>
        </Alert>
        <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
          {recoveryCodes.map((code) => (
            <li key={code} className="border-border rounded border p-2 text-center">
              {code}
            </li>
          ))}
        </ul>
        <Button
          size="sm"
          variant="outline"
          className="w-fit"
          onClick={() => handleCopy(recoveryCodes.join("\n"))}
        >
          <CopyIcon className="size-3.5" />
          Copiar todos
        </Button>
        <Button size="sm" className="w-fit" onClick={() => setRecoveryCodes(null)}>
          Já salvei os códigos
        </Button>
      </div>
    );
  }

  if (setup) {
    return (
      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Cadastrar segundo fator</h2>
        <p className="text-muted-foreground text-sm">
          Adicione esta chave num app autenticador (Google Authenticator, Authy, 1Password...) e
          digite o código de 6 dígitos gerado.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mfa-secret">Chave manual</Label>
          <div className="flex items-center gap-2">
            <Input id="mfa-secret" readOnly value={setup.secret} className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={() => handleCopy(setup.secret)}>
              <CopyIcon className="size-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mfa-code">Código de 6 dígitos</Label>
          <Input
            id="mfa-code"
            inputMode="numeric"
            maxLength={6}
            value={activateCode}
            onChange={(event) => setActivateCode(event.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" disabled={!/^\d{6}$/.test(activateCode) || busy} onClick={handleActivate}>
            Confirmar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSetup(null)}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  if (!status) return null;

  if (status.enabled) {
    return (
      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">Segundo fator</h2>
          <Badge>Ativo</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          {status.recoveryCodesRemaining} código(s) de recuperação restante(s).
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mfa-disable-code">Código TOTP ou de recuperação, pra desativar</Label>
          <Input id="mfa-disable-code" value={disableCode} onChange={(event) => setDisableCode(event.target.value)} />
        </div>
        <Button size="sm" variant="destructive" className="w-fit" disabled={!disableCode.trim() || disabling} onClick={handleDisable}>
          {disabling ? "Desativando..." : "Desativar segundo fator"}
        </Button>
      </div>
    );
  }

  return (
    <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-sm font-medium">Segundo fator</h2>
      <p className="text-muted-foreground text-sm">
        {status.pending
          ? "Cadastro iniciado, mas não confirmado — o segredo anterior não pode ser reexibido; gere um novo."
          : "Ainda não ativado. Adiciona uma camada extra de segurança no login."}
      </p>
      <Button size="sm" className="w-fit" disabled={busy} onClick={handleSetup}>
        {status.pending ? "Gerar novo código" : "Ativar segundo fator"}
      </Button>
    </div>
  );
}
