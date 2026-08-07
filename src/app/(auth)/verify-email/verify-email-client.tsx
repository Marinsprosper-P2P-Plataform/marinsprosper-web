"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthCard } from "@/components/shared/auth-card";
import { OtpForm } from "@/components/shared/otp-form";
import { emailOtpSchema } from "@/lib/validations/auth";

export function VerifyEmailClient({
  email,
  phone,
  role,
}: {
  email: string;
  phone: string;
  role: string;
}) {
  const router = useRouter();

  async function handleVerified() {
    await new Promise((resolve) => setTimeout(resolve, 400));
    toast.success("E-mail confirmado");
    const params = new URLSearchParams({ phone, role });
    router.push(`/verify-phone?${params.toString()}`);
  }

  return (
    <AuthCard
      title="Confirme seu e-mail"
      description={email ? `Digite o código de 6 dígitos enviado para ${email}` : "Digite o código de 6 dígitos enviado para o seu e-mail"}
    >
      <OtpForm schema={emailOtpSchema} onVerified={handleVerified} />
    </AuthCard>
  );
}
