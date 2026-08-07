"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AuthCard } from "@/components/shared/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mfaSchema, type MfaInput } from "@/lib/validations/auth";

/** Segunda etapa de login — exibida só para caixeiro/admin (ver
 * (auth)/login). Corresponde a POST /auth/mfa/verify no backend. */
export default function MfaPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MfaInput>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: "" },
  });

  async function onSubmit() {
    await new Promise((resolve) => setTimeout(resolve, 400));
    toast.success("Identidade confirmada");
    router.push("/offers");
  }

  return (
    <AuthCard
      title="Confirme sua identidade"
      description="Digite o código de 6 dígitos enviado ao seu segundo fator de autenticação"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Código</Label>
          <Input
            id="code"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            className="text-center text-lg tracking-[0.5em]"
            aria-invalid={!!errors.code}
            {...register("code")}
          />
          {errors.code && (
            <p className="text-destructive text-sm">{errors.code.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting}>
          Verificar
        </Button>
      </form>
    </AuthCard>
  );
}
