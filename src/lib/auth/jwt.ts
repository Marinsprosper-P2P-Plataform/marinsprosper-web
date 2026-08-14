/**
 * Decodifica só o payload do JWT — nunca verifica assinatura (o front não
 * tem a chave e não precisa: quem valida de verdade é o backend em cada
 * chamada). Serve só pra ler claims pra UI (papel, expiração), nunca pra
 * decidir autorização sozinho.
 */
export function decodeJwtPayload<T>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
