"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OtpFormProps {
  // Precisa dos dois type params (Output e Input) — só `ZodType<{ code:
  // string }>` deixa Input como `unknown`, o que quebra a inferência do
  // `zodResolver` contra `FieldValues` no `tsc` do build (não aparece no
  // `next dev`, só no `next build`/typecheck completo).
  schema: ZodType<{ code: string }, { code: string }>;
  onVerified: (code: string) => Promise<void> | void;
  buttonLabel?: string;
}

/** Formulário de código de 6 dígitos reaproveitado por `/verify-email` e
 * `/verify-phone` — mesma forma do `/mfa`, mas endpoints diferentes.
 * Igual ao resto do protótipo, não simula "código certo": qualquer
 * código no formato certo passa, quem valida de verdade é o backend. */
export function OtpForm({ schema, onVerified, buttonLabel = "Verificar" }: OtpFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ code: string }>({
    resolver: zodResolver(schema),
    defaultValues: { code: "" },
  });

  return (
    <form onSubmit={handleSubmit((data) => onVerified(data.code))} className="flex flex-col gap-4" noValidate>
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
        {errors.code && <p className="text-destructive text-sm">{errors.code.message}</p>}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {buttonLabel}
      </Button>
    </form>
  );
}
