import { VerifyPhoneClient } from "./verify-phone-client";

/** POST /auth/verify-phone — protótipo com dados fake, mesma muleta de
 * query string do `/verify-email`. Depois de confirmado, segue pro
 * mesmo branch que `/register` decidia antes: caixeiro vai pra
 * `/cashier-apply`, cliente vai direto pro `/kyc`. */
export default async function VerifyPhonePage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; role?: string }>;
}) {
  const params = await searchParams;
  return <VerifyPhoneClient phone={params.phone ?? ""} role={params.role ?? "cliente"} />;
}
