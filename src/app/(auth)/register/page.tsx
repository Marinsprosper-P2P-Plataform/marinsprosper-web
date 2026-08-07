"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckIcon, XIcon } from "lucide-react";
import { AuthCard } from "@/components/shared/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES, registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { checkUsernameAvailability } from "@/lib/mock/username";
import { cn } from "@/lib/utils";

type UsernameStatus = "idle" | "checking" | "available" | "taken";

export default function RegisterPage() {
  const router = useRouter();
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const checkSeq = useRef(0);
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      phone: "",
      country: undefined,
      city: "",
      role: "cliente",
      password: "",
      confirmPassword: "",
    },
  });

  async function handleUsernameBlur() {
    const value = getValues("username");
    if (!value || errors.username) {
      setUsernameStatus("idle");
      return;
    }
    const seq = ++checkSeq.current;
    setUsernameStatus("checking");
    const available = await checkUsernameAvailability(value);
    if (seq !== checkSeq.current) return; // resposta de uma checagem antiga, ignora
    setUsernameStatus(available ? "available" : "taken");
  }

  async function onSubmit(data: RegisterInput) {
    if (usernameStatus !== "available") {
      setError("username", { message: "Verifique se o @username está disponível" });
      return;
    }

    // Protótipo com dados fake — POST /auth/register no Sprint 4.
    await new Promise((resolve) => setTimeout(resolve, 400));
    toast.success("Cadastro criado, vamos confirmar seus contatos");

    const params = new URLSearchParams({
      email: data.email,
      phone: data.phone,
      role: data.role,
    });
    router.push(`/verify-email?${params.toString()}`);
  }

  return (
    <AuthCard
      title="Criar conta"
      description="Compra e venda de USDT, direto entre pessoas"
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="text-foreground font-medium underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nome completo</Label>
          <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
          {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">Nome de usuário</Label>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-base md:text-sm">
              @
            </span>
            <Input
              id="username"
              autoComplete="off"
              className="pl-6"
              aria-invalid={!!errors.username}
              {...register("username", {
                onChange: () => setUsernameStatus("idle"),
              })}
              onBlur={handleUsernameBlur}
            />
          </div>
          {errors.username && (
            <p className="text-destructive text-sm">{errors.username.message}</p>
          )}
          {!errors.username && usernameStatus === "checking" && (
            <p className="text-muted-foreground text-sm">Verificando disponibilidade…</p>
          )}
          {!errors.username && usernameStatus === "available" && (
            <p className="text-status-completed flex items-center gap-1 text-sm">
              <CheckIcon className="size-3.5" /> Disponível
            </p>
          )}
          {!errors.username && usernameStatus === "taken" && (
            <p className="text-destructive flex items-center gap-1 text-sm">
              <XIcon className="size-3.5" /> Esse @username já está em uso
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            Único e permanente — não dá pra trocar depois de criado.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            {...register("phone")}
          />
          {errors.phone && <p className="text-destructive text-sm">{errors.phone.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="country">País</Label>
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="country" className={cn("w-full", !field.value && "text-muted-foreground")} aria-invalid={!!errors.country}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.id} value={country.id}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.country && (
              <p className="text-destructive text-sm">{errors.country.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" autoComplete="address-level2" aria-invalid={!!errors.city} {...register("city")} />
            {errors.city && <p className="text-destructive text-sm">{errors.city.message}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role">Quero</Label>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Comprar/vender USDT (cliente)</SelectItem>
                  <SelectItem value="caixeiro">Virar caixeiro (parceiro operacional)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-destructive text-sm">{errors.password.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Confirmar senha</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting}>
          Criar conta
        </Button>
      </form>
    </AuthCard>
  );
}
