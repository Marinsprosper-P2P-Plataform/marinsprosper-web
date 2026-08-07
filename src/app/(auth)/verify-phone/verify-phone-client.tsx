"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthCard } from "@/components/shared/auth-card";
import { OtpForm } from "@/components/shared/otp-form";
import { phoneOtpSchema } from "@/lib/validations/auth";

export function VerifyPhoneClient({ phone, role }: { phone: string; role: string }) {
  const router = useRouter();

  async function handleVerified() {
    await new Promise((resolve) => setTimeout(resolve, 400));
    toast.success("Celular confirmado");
    router.push(role === "caixeiro" ? "/cashier-apply" : "/kyc");
  }

  return (
    <AuthCard
      title="Confirme seu celular"
      description={
        phone
          ? `Digite o código de 6 dígitos enviado por SMS/WhatsApp para ${phone}`
          : "Digite o código de 6 dígitos enviado por SMS/WhatsApp"
      }
    >
      <OtpForm schema={phoneOtpSchema} onVerified={handleVerified} />
    </AuthCard>
  );
}
