/** Espelha `collateral()` de `cashier.service.ts` — nunca um saldo
 * único: `free`/`locked`, mais a idade da leitura (`mirrorAgeSeconds`) e
 * os movimentos ainda sem confirmação on-chain (`pendingMovements`). O
 * aceite de ordem recusa espelho com mais de 5 minutos. */
export interface CashierCollateral {
  asset: "USDT";
  /** Endereço TRON que o cashier registrou como origem — `null` se
   * nunca registrou nenhum (conta de colateral ainda não existe). */
  depositAddress: string | null;
  free: string;
  locked: string;
  mirroredAt: string | null;
  mirroredBlock: string | null;
  mirrorAgeSeconds: number | null;
  /** `false` enquanto o contrato de custódia não estiver implantado —
   * nesse caso o espelho nunca teve de onde vir. */
  contractDeployed: boolean;
  pendingMovements: Array<{
    type: string;
    amount: string;
    onChainTxHash: string | null;
    createdAt: string;
  }>;
}

export interface RegisterDepositAddressPayload {
  tronAddress: string;
  asset?: "USDT";
}

/** Resposta de `POST /cashier/collateral/deposit-address` — o destino
 * (`contractAddress`) é o mesmo pra todo mundo; quem separa um depósito
 * do outro é a origem (`fromAddress`, registrada e exclusiva). */
export interface DepositAddressResponse {
  asset: "USDT";
  contractAddress: string;
  fromAddress: string;
  network: string;
  warning: string;
}

/** Espelha `limits()` — limite e consumo sempre juntos, nunca só o
 * limite sozinho. */
export interface CashierLimit {
  asset: "USDT";
  minOrderAmount: string;
  maxOrderAmount: string;
  maxOpenOrders: number;
  openOrders: number;
  dailyVolumeLimit: string;
  dailyVolumeUsed: string;
  dailyVolumeRemaining: string;
}
