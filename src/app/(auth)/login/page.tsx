"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AuthCard } from "@/components/shared/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", isCashierOrAdmin: false },
  });

  async function onSubmit(data: LoginInput) {
    // Protótipo com dados fake — a validação de credenciais de verdade
    // acontece só no backend (Sprint 4, POST /auth/login).
    await new Promise((resolve) => setTimeout(resolve, 400));

    if (data.isCashierOrAdmin) {
      router.push("/mfa");
      return;
    }

    toast.success("Login realizado");
    router.push("/offers");
  }

  return (
    <AuthCard
      title="Entrar"
      description="Acesse sua conta Marinsprosper"
      footer={
        <>
          Não tem conta?{" "}
          <Link href="/register" className="text-foreground font-medium underline">
            Cadastre-se
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-destructive text-sm">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-destructive text-sm">{errors.password.message}</p>
          )}
        </div>

        <Controller
          name="isCashierOrAdmin"
          control={control}
          render={({ field }) => (
            <label className="group flex items-center gap-2 text-sm">
              <Checkbox
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
              Estou entrando como caixeiro ou administrador
            </label>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          Entrar
        </Button>
      </form>
    </AuthCard>
  );
}
