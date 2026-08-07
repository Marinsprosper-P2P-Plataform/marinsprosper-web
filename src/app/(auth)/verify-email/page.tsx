import { VerifyEmailClient } from "./verify-email-client";

/** POST /auth/verify-email — protótipo com dados fake. Dados vêm por
 * query string (mesma muleta de prototipagem do `/kyc/status`): sem
 * sessão real ainda, é como o wizard de cadastro carrega o e-mail e o
 * telefone de uma etapa pra outra sem precisar de backend. */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; phone?: string; role?: string }>;
}) {
  const params = await searchParams;
  return (
    <VerifyEmailClient
      email={params.email ?? ""}
      phone={params.phone ?? ""}
      role={params.role ?? "cliente"}
    />
  );
}
