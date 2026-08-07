import Link from "next/link";
import { AuthCard } from "@/components/shared/auth-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type KycStatus = "pendente" | "aprovado" | "rejeitado";

const STATUS_META: Record<KycStatus, { label: string; variant: "secondary" | "default" | "destructive" }> = {
  pendente: { label: "Em análise", variant: "secondary" },
  aprovado: { label: "Aprovado", variant: "default" },
  rejeitado: { label: "Rejeitado", variant: "destructive" },
};

/** GET /kyc/status — protótipo com dados fake. Sem backend real ainda,
 * ?status=aprovado|rejeitado&motivo=... permite pré-visualizar os
 * outros estados (útil pra revisão de design com a equipe). Padrão:
 * pendente, que é o estado real logo após o envio em (auth)/kyc. */
export default async function KycStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; motivo?: string }>;
}) {
  const params = await searchParams;
  const status: KycStatus =
    params.status === "aprovado" || params.status === "rejeitado"
      ? params.status
      : "pendente";
  const meta = STATUS_META[status];

  return (
    <AuthCard title="Verificação de identidade" description="Status do seu envio">
      <Badge variant={meta.variant} className="w-fit">
        {meta.label}
      </Badge>

      {status === "pendente" && (
        <p className="text-muted-foreground text-sm">
          Seus documentos foram recebidos e estão em análise. Isso costuma levar
          até 1 dia útil.
        </p>
      )}

      {status === "aprovado" && (
        <>
          <p className="text-muted-foreground text-sm">
            Identidade verificada. Você já pode operar na plataforma.
          </p>
          <Button asChild>
            <Link href="/offers">Ir para ofertas</Link>
          </Button>
        </>
      )}

      {status === "rejeitado" && (
        <>
          <p className="text-muted-foreground text-sm">
            {params.motivo ?? "Não foi possível confirmar sua identidade com os documentos enviados."}
          </p>
          <Button asChild>
            <Link href="/kyc">Enviar novamente</Link>
          </Button>
        </>
      )}
    </AuthCard>
  );
}
