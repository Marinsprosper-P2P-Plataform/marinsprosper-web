/**
 * Backend roda numa VM própria, nunca em `localhost` — repositório e
 * máquina separados de propósito (ver [[21 - Integração com API Real]]
 * §0). `NEXT_PUBLIC_API_URL` já aponta pro ambiente de teste da VM em
 * `.env.example`.
 */
export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_API_URL não configurada — copie .env.example para .env.local",
    );
  }
  return url.replace(/\/+$/, "");
}
