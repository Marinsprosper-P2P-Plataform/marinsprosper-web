/**
 * `Idempotency-Key` é obrigatório em toda escrita financeira (rotas ⚡ em
 * [[21 - Integração com API Real]]). Regra do backend: chave nova por
 * *ação do usuário* (ex. clique em "Confirmar"), nunca por sessão ou por
 * página; a mesma chave deve ser *reusada* em retry daquela mesma ação,
 * não recriada — reusar com corpo diferente dá 422, chave em corrida dá
 * 409. Formato exigido: `[A-Za-z0-9._~-]{16,128}`.
 */
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._~-]{16,128}$/;

export function generateIdempotencyKey(): string {
  const key = crypto.randomUUID();
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    // crypto.randomUUID() só produz [0-9a-f-], mas a checagem existe pra
    // nunca deixar uma chave fora do formato aceito pelo backend passar batido.
    throw new Error(`UUID gerado não bate com o formato esperado: ${key}`);
  }
  return key;
}

/**
 * Guarda a chave de uma ação em andamento pra reuso em retry. Chamar
 * `getKey()` de novo dentro da mesma ação (ex. usuário clica "tentar
 * novamente" após um erro de rede) devolve a mesma chave; `reset()` limpa
 * pra próxima ação distinta gerar uma chave nova.
 *
 * @example
 * const key = createIdempotencyKeyManager();
 * async function onSubmit() {
 *   try {
 *     await apiFetch("/orders/1/accept", { method: "POST", idempotencyKey: key.getKey() });
 *     key.reset(); // ação concluída, próximo clique é uma ação nova
 *   } catch {
 *     // não resetar: um novo clique em "tentar novamente" reusa a mesma key
 *   }
 * }
 */
export function createIdempotencyKeyManager() {
  let current: string | null = null;
  return {
    getKey(): string {
      if (!current) {
        current = generateIdempotencyKey();
      }
      return current;
    },
    reset(): void {
      current = null;
    },
  };
}
