"use client";

import { createContext, useCallback, useContext, useReducer, type ReactNode } from "react";

/**
 * "Backend fake" da caução do caixeiro — mesmo padrão de `orders.tsx`/
 * `pix-keys.tsx`: Context em memória, sem persistência entre
 * recarregamentos. Espelha `cashier_collateral_accounts` e
 * `cashier_limits` de [[03 - Modelo de Dados]]: **nunca um campo único
 * de saldo** — sempre os sete baldes separados, e o limite é sempre
 * derivado (`computeCashierLimit`), nunca um número solto.
 */
export interface PendingDeposit {
  id: string;
  amount: number;
  /** Quando a confirmação on-chain simulada libera este depósito —
   * contado no cliente, mesmo espírito do `PaymentCountdown`. */
  confirmAt: string;
}

export interface CollateralAccount {
  userId: string;
  /** Endereço TRC20 fake — em produção viria de
   * `/cashier/collateral/deposit-address`, gerado pelo backend/custódia. */
  depositAddress: string;
  available: number;
  reserved: number;
  blocked: number;
  underReview: number;
  usedForReimbursement: number;
  pendingWithdrawal: number;
  withdrawn: number;
  pendingDeposits: PendingDeposit[];
}

/** `limite_bruto = caução_confirmada × fator_de_exposição` ([[03 - Modelo
 * de Dados]], seção 2). Valor de referência pro protótipo, não fechado —
 * mesma ressalva da taxa de 3% em `pricing.ts`. */
export const EXPOSURE_FACTOR = 0.5;

/** Simula o tempo de confirmação on-chain antes do depósito sair de
 * "em análise" e virar saldo disponível de verdade. */
const DEPOSIT_CONFIRMATION_MS = 8000;

function fakeDepositAddress(userId: string) {
  const seed = userId.replace(/[^a-zA-Z0-9]/g, "").padEnd(30, "0").slice(0, 30);
  return `T${seed}`.toUpperCase();
}

function seedAccounts(): CollateralAccount[] {
  return [
    {
      userId: "user-client-1",
      depositAddress: fakeDepositAddress("user-client-1"),
      available: 6000,
      reserved: 0,
      blocked: 0,
      underReview: 0,
      usedForReimbursement: 0,
      pendingWithdrawal: 0,
      withdrawn: 1200,
      pendingDeposits: [],
    },
    {
      userId: "user-cashier-1",
      depositAddress: fakeDepositAddress("user-cashier-1"),
      available: 9000,
      reserved: 1000,
      blocked: 200,
      underReview: 0,
      usedForReimbursement: 0,
      pendingWithdrawal: 300,
      withdrawn: 0,
      pendingDeposits: [],
    },
  ];
}

/** Limite bruto e disponível — nunca calculado inline numa tela, sempre
 * por aqui, mesma fronteira arquitetural de `quoteOrder`. Confirmada =
 * disponível + reservada + bloqueada (dinheiro que já entrou de
 * verdade); "em análise" ainda não conta porque a confirmação on-chain
 * não fechou, e "pendente de retirada"/"retirado" já não conta porque
 * está saindo ou já saiu da plataforma. */
export function computeCashierLimit(account: CollateralAccount) {
  const confirmedCollateral = account.available + account.reserved + account.blocked;
  const grossLimit = confirmedCollateral * EXPOSURE_FACTOR;
  const availableLimit = account.available * EXPOSURE_FACTOR;
  return { confirmedCollateral, grossLimit, availableLimit };
}

type CollateralAction =
  | { type: "INITIATE_DEPOSIT"; userId: string; deposit: PendingDeposit }
  | { type: "CONFIRM_DEPOSIT"; userId: string; depositId: string };

function collateralReducer(state: CollateralAccount[], action: CollateralAction): CollateralAccount[] {
  return state.map((account) => {
    if (account.userId !== action.userId) return account;

    switch (action.type) {
      case "INITIATE_DEPOSIT":
        return {
          ...account,
          underReview: account.underReview + action.deposit.amount,
          pendingDeposits: [...account.pendingDeposits, action.deposit],
        };

      case "CONFIRM_DEPOSIT": {
        const deposit = account.pendingDeposits.find((item) => item.id === action.depositId);
        if (!deposit) return account; // já confirmado — idempotente
        return {
          ...account,
          underReview: account.underReview - deposit.amount,
          available: account.available + deposit.amount,
          pendingDeposits: account.pendingDeposits.filter((item) => item.id !== action.depositId),
        };
      }

      default:
        return account;
    }
  });
}

interface MockCollateralContextValue {
  accounts: CollateralAccount[];
  getAccount: (userId: string) => CollateralAccount | undefined;
  initiateDeposit: (userId: string, amount: number) => void;
  confirmDeposit: (userId: string, depositId: string) => void;
}

const MockCollateralContext = createContext<MockCollateralContextValue | null>(null);

export function MockCollateralProvider({ children }: { children: ReactNode }) {
  const [accounts, dispatch] = useReducer(collateralReducer, undefined, seedAccounts);

  const getAccount = useCallback(
    (userId: string) => accounts.find((account) => account.userId === userId),
    [accounts],
  );

  const initiateDeposit = useCallback((userId: string, amount: number) => {
    dispatch({
      type: "INITIATE_DEPOSIT",
      userId,
      deposit: {
        id: `deposit-${crypto.randomUUID()}`,
        amount,
        confirmAt: new Date(Date.now() + DEPOSIT_CONFIRMATION_MS).toISOString(),
      },
    });
  }, []);

  const confirmDeposit = useCallback((userId: string, depositId: string) => {
    dispatch({ type: "CONFIRM_DEPOSIT", userId, depositId });
  }, []);

  return (
    <MockCollateralContext.Provider value={{ accounts, getAccount, initiateDeposit, confirmDeposit }}>
      {children}
    </MockCollateralContext.Provider>
  );
}

export function useMockCollateral() {
  const ctx = useContext(MockCollateralContext);
  if (!ctx) {
    throw new Error("useMockCollateral precisa estar dentro de MockCollateralProvider");
  }
  return ctx;
}
