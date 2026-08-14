"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AuthCard } from "@/components/shared/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  mfaRecoverySchema,
  mfaSchema,
  type MfaInput,
  type MfaRecoveryInput,
} from "@/lib/validations/auth";
import { useAuth } from "@/lib/auth";
import { ApiError, ApiNetworkError } from "@/lib/api";

/** Corresponde a `POST /auth/mfa/verify` (código do autenticador) e
 * `POST /auth/mfa/recovery` (código de recuperação, link abaixo). */
export function MfaClient({ mfaToken }: { mfaToken: string }) {
  const router = useRouter();
  const { completeMfa } = useAuth();
  const [useRecovery, setUseRecovery] = useState(false);

  const totpForm = useForm<MfaInput>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: "" },
  });
  const recoveryForm = useForm<MfaRecoveryInput>({
    resolver: zodResolver(mfaRecoverySchema),
    defaultValues: { code: "" },
  });
  const form = useRecovery ? recoveryForm : totpForm;
  const { register, handleSubmit, formState } = form;
  const { errors, isSubmitting } = formState;

  async function onSubmit(data: { code: string }) {
    if (!mfaToken) {
      toast.error("Sessão de login expirou, entre novamente");
      router.push("/login");
      return;
    }
    try {
      await completeMfa(mfaToken, data.code, useRecovery);
      toast.success("Identidade confirmada");
      router.push("/offers");
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 400)) {
        toast.error(useRecovery ? "Código de recuperação inválido" : "Código inválido");
        return;
      }
      if (error instanceof ApiNetworkError) {
        toast.error(error.message);
        return;
      }
      toast.error("Não foi possível confirmar. Tente novamente.");
    }
  }

  return (
    <AuthCard
      title="Confirme sua identidade"
      description={
        useRecovery
          ? "Digite um dos seus códigos de recuperação"
          : "Digite o código de 6 dígitos do seu autenticador"
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Código</Label>
          <Input
            id="code"
            inputMode={useRecovery ? "text" : "numeric"}
            maxLength={useRecovery ? undefined : 6}
            autoComplete="one-time-code"
            className={useRecovery ? undefined : "text-center text-lg tracking-[0.5em]"}
            aria-invalid={!!errors.code}
            {...register("code")}
          />
          {errors.code && <p className="text-destructive text-sm">{errors.code.message}</p>}
        </div>

        <Button type="submit" disabled={isSubmitting}>
          Verificar
        </Button>

        <button
          type="button"
          className="text-muted-foreground text-sm underline underline-offset-2"
          onClick={() => setUseRecovery((value) => !value)}
        >
          {useRecovery ? "Usar código do autenticador" : "Usar código de recuperação"}
        </button>
      </form>
    </AuthCard>
  );
}
