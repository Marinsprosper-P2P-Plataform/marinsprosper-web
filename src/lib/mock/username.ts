/**
 * Simula a checagem de unicidade de `@username`, que na vida real só o
 * backend pode responder de verdade (índice único na tabela `users`).
 * Mesmo função-round-trip que `quoteOrder` em `pricing.ts` — nenhuma tela
 * decide "disponível" sozinha, todas esperam esta resposta.
 */

const SIMULATED_LATENCY_MS = 500;

/** Usernames já "em uso" pelas contas fake (`session.tsx`) — permite
 * demonstrar o caminho de erro sem precisar de backend. */
export const RESERVED_USERNAMES = ["anaferreira", "betolima", "admin", "suporte"];

export async function checkUsernameAvailability(username: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));
  return !RESERVED_USERNAMES.includes(username.toLowerCase());
}
