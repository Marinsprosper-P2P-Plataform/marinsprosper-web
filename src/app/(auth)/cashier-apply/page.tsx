"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AuthCard } from "@/components/shared/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  cashierApplySchema,
  PAYMENT_METHODS,
  type CashierApplyInput,
} from "@/lib/validations/auth";

/** POST /cashier/apply — protótipo com dados fake. */
export default function CashierApplyPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CashierApplyInput>({
    resolver: zodResolver(cashierApplySchema),
    defaultValues: { methods: [], countries: "", currencies: "" },
  });

  async function onSubmit() {
    await new Promise((resolve) => setTimeout(resolve, 400));
    toast.success("Solicitação enviada");
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <AuthCard
        title="Solicitação enviada"
        description="Um administrador vai revisar seu cadastro de caixeiro"
      >
        <p className="text-muted-foreground text-sm">
          Enquanto isso, vamos verificar sua identidade — é obrigatório antes
          de aceitar qualquer ordem.
        </p>
        <Button onClick={() => router.push("/kyc")}>Continuar verificação</Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Virar caixeiro"
      description="Conte quais métodos, países e moedas você opera"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Controller
          name="methods"
          control={control}
          render={({ field }) => (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">Métodos aceitos</legend>
              {PAYMENT_METHODS.map((method) => {
                const checked = field.value.includes(method.id);
                return (
                  <label key={method.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        field.onChange(
                          value === true
                            ? [...field.value, method.id]
                            : field.value.filter((id) => id !== method.id),
                        );
                      }}
                    />
                    {method.label}
                  </label>
                );
              })}
              {errors.methods && (
                <p className="text-destructive text-sm">{errors.methods.message}</p>
              )}
            </fieldset>
          )}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="countries">Países onde opera</Label>
          <Input
            id="countries"
            placeholder="Brasil"
            aria-invalid={!!errors.countries}
            {...register("countries")}
          />
          {errors.countries && (
            <p className="text-destructive text-sm">{errors.countries.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currencies">Moedas</Label>
          <Input
            id="currencies"
            placeholder="BRL"
            aria-invalid={!!errors.currencies}
            {...register("currencies")}
          />
          {errors.currencies && (
            <p className="text-destructive text-sm">{errors.currencies.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting}>
          Enviar solicitação
        </Button>
      </form>
    </AuthCard>
  );
}
