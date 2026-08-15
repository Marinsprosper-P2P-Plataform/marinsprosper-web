import { api } from "@/lib/api";
import type {
  CashierCollateral,
  CashierLimit,
  DepositAddressResponse,
  RegisterDepositAddressPayload,
} from "./types";

/** `GET /cashier/collateral?asset=USDT` — 404 se o cashier ainda não
 * registrou nenhum endereço de depósito neste ativo (sem conta de
 * colateral ainda). */
export function getCollateralRequest() {
  return api.get<CashierCollateral>("/cashier/collateral?asset=USDT");
}

/** `POST /cashier/collateral/deposit-address` — registra a origem (uma
 * vez; reenviar o MESMO endereço é idempotente e devolve a mesma
 * resposta de novo, mas trocar de endereço depois de registrado dá 409). */
export function registerDepositAddressRequest(
  payload: RegisterDepositAddressPayload,
  idempotencyKey: string,
) {
  return api.post<DepositAddressResponse>("/cashier/collateral/deposit-address", payload, {
    idempotencyKey,
  });
}

/** `POST /cashier/collateral/sync?asset=USDT` — relê o saldo no
 * contrato; devolve o mesmo formato de `getCollateralRequest`. */
export function syncCollateralRequest(idempotencyKey: string) {
  return api.post<CashierCollateral>("/cashier/collateral/sync?asset=USDT", undefined, {
    idempotencyKey,
  });
}

export function getCashierLimitRequest() {
  return api.get<CashierLimit>("/cashier/limit?asset=USDT");
}
