import { OctagonXIcon } from "lucide-react";
import { AuthCard } from "@/components/shared/auth-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Exibida quando o usuário autenticado está bloqueado/suspenso. Por
 * design, NÃO detalha o motivo interno de risco (ver Documentação de
 * Segurança) — só orienta a falar com o suporte.
 */
export default function BlockedPage() {
  return (
    <AuthCard title="Conta indisponível">
      <Alert variant="destructive">
        <OctagonXIcon className="size-4" />
        <AlertTitle>Você não pode operar no momento</AlertTitle>
        <AlertDescription>
          Sua conta está temporariamente indisponível para operar na
          plataforma. Entre em contato com o suporte para mais informações.
        </AlertDescription>
      </Alert>
    </AuthCard>
  );
}
