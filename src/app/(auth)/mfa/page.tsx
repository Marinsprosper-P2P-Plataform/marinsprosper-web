import { MfaClient } from "./mfa-client";

/** Segunda etapa do login quando o fator MFA está ativo — o `mfaToken`
 * de vida curta vem do `POST /auth/login` (resposta `{ mfaRequired: true,
 * mfaToken }`) e viaja por query string até aqui, mesma muleta de
 * prototipagem usada em `/verify-email`. */
export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ mfaToken?: string }>;
}) {
  const params = await searchParams;
  return <MfaClient mfaToken={params.mfaToken ?? ""} />;
}
