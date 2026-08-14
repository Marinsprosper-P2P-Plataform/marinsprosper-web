"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AuthCard } from "@/components/shared/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { useAuth } from "@/lib/auth";
import { ApiError, ApiNetworkError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginInput) {
    try {
      const result = await login(data.email, data.password);
      if ("mfaRequired" in result) {
        router.push(`/mfa?mfaToken=${encodeURIComponent(result.mfaToken)}`);
        return;
      }
      toast.success("Login realizado");
      router.push("/offers");
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 400)) {
        toast.error("E-mail ou senha incorretos");
        return;
      }
      if (error instanceof ApiNetworkError) {
        toast.error(error.message);
        return;
      }
      toast.error("Não foi possível entrar. Tente novamente.");
    }
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

        <Button type="submit" disabled={isSubmitting}>
          Entrar
        </Button>
      </form>
    </AuthCard>
  );
}
