"use client";

import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  type ReactNode,
} from "react";
import type { CancelRequester, Order, OrderType } from "@/types/order";
import type { OrderQuote } from "./pricing";

/**
 * "Backend" fake em memória — existe só pro protótipo (Sprint -1) ter
 * um lugar único e consistente que aplica a máquina de estados de
 * verdade (ver Arquitetura Técnica, seção 4), em vez de cada tela
 * mutar status à vontade. Cada ação abaixo confere o estado anterior
 * antes de escrever — o mesmo princípio de "nunca assumir o estado
 * atual sem checar" que vale pro backend real, só que sem persistência
 * (reseta a cada recarregamento de página).
 */

let seq = 1000;
function nextPublicId() {
  seq += 1;
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `MP-${today}-${String(seq).padStart(6, "0")}`;
}

const now = () => new Date().toISOString();

function seedOrders(): Order[] {
  const t = now();
  return [
    {
      id: "order-1",
      publicId: nextPublicId(),
      type: "compra",
      asset: "USDT",
      network: "TRC20",
      fiatCurrency: "BRL",
      paymentMethod: "PIX",
      grossAmount: 500,
      quote: 5.42,
      feePercent: 3,
      feeAmount: 15,
      netAmount: 89.4,
      status: "OPEN",
      clientId: "user-client-1",
      clientName: "Ana Cliente",
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "order-2",
      publicId: nextPublicId(),
      type: "venda",
      asset: "USDT",
      network: "TRC20",
      fiatCurrency: "BRL",
      paymentMethod: "PIX",
      grossAmount: 1200,
      quote: 5.42,
      feePercent: 3,
      feeAmount: 36,
      netAmount: 214.76,
      status: "OPEN",
      clientId: "user-client-2",
      clientName: "Carla Souza",
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "order-3",
      publicId: nextPublicId(),
      type: "compra",
      asset: "USDT",
      network: "TRC20",
      fiatCurrency: "BRL",
      paymentMethod: "PIX",
      grossAmount: 300,
      quote: 5.42,
      feePercent: 3,
      feeAmount: 9,
      netAmount: 53.69,
      status: "AWAITING_CASHIER_CONFIRMATION",
      clientId: "user-client-1",
      clientName: "Ana Cliente",
      cashierId: "user-cashier-1",
      cashierName: "Beto Caixeiro",
      clientProofName: "comprovante-pix.pdf",
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "order-4",
      publicId: nextPublicId(),
      type: "venda",
      asset: "USDT",
      network: "TRC20",
      fiatCurrency: "BRL",
      paymentMethod: "PIX",
      grossAmount: 800,
      quote: 5.42,
      feePercent: 3,
      feeAmount: 24,
      netAmount: 143.17,
      status: "COMPLETED",
      clientId: "user-client-1",
      clientName: "Ana Cliente",
      cashierId: "user-cashier-1",
      cashierName: "Beto Caixeiro",
      clientProofName: "comprovante-pix.pdf",
      txid: "0x3a1f...c9e2",
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "order-5",
      publicId: nextPublicId(),
      type: "compra",
      asset: "USDT",
      network: "TRC20",
      fiatCurrency: "BRL",
      paymentMethod: "PIX",
      grossAmount: 150,
      quote: 5.42,
      feePercent: 3,
      feeAmount: 4.5,
      netAmount: 26.84,
      status: "DISPUTE_OPEN",
      clientId: "user-client-1",
      clientName: "Ana Cliente",
      cashierId: "user-cashier-1",
      cashierName: "Beto Caixeiro",
      disputeReason: "Cliente diz ter transferido, caixeiro não confirma o recebimento.",
      createdAt: t,
      updatedAt: t,
    },
  ];
}

type OrdersAction =
  | { type: "CREATE"; order: Order }
  | { type: "ACCEPT"; orderId: string; cashierId: string; cashierName: string }
  | { type: "CLIENT_TRANSFER"; orderId: string; proofName: string }
  | { type: "CASHIER_CONFIRM_RECEIPT"; orderId: string }
  | { type: "CASHIER_TRANSFER"; orderId: string; txid: string }
  | { type: "CLIENT_CONFIRM"; orderId: string }
  | { type: "REQUEST_CANCEL"; orderId: string; requestedBy: CancelRequester; reason: string }
  | { type: "RESPOND_CANCEL"; orderId: string; accept: boolean }
  | { type: "OPEN_DISPUTE"; orderId: string; reason: string }
  | { type: "RATE"; orderId: string; rating: number };

/** Exportado pra UI usar exatamente a mesma lista ao decidir se mostra
 * os botões de cancelar/disputar — uma única fonte de verdade. */
export const CANCELLABLE_STATUSES: Order["status"][] = [
  "ACCEPTED",
  "AWAITING_CLIENT_TRANSFER",
  "CLIENT_MARKED_TRANSFERRED",
  "AWAITING_CASHIER_CONFIRMATION",
  "CASHIER_CONFIRMED_RECEIPT",
  "AWAITING_CASHIER_TRANSFER",
  "CASHIER_MARKED_TRANSFERRED",
  "AWAITING_CLIENT_CONFIRMATION",
];

function ordersReducer(state: Order[], action: OrdersAction): Order[] {
  const patch = (
    orderId: string,
    from: Order["status"][],
    next: Partial<Order> | ((order: Order) => Partial<Order>),
  ) =>
    state.map((order) => {
      if (order.id !== orderId) return order;
      // Idempotência: se o estado atual não é um dos esperados, a ação
      // já foi aplicada (ou é inválida agora) — não faz nada de novo.
      if (!from.includes(order.status)) return order;
      const resolved = typeof next === "function" ? next(order) : next;
      return { ...order, ...resolved, updatedAt: now() };
    });

  switch (action.type) {
    case "CREATE":
      return [action.order, ...state];

    case "ACCEPT":
      return patch(action.orderId, ["OPEN"], {
        status: "AWAITING_CLIENT_TRANSFER",
        cashierId: action.cashierId,
        cashierName: action.cashierName,
      });

    case "CLIENT_TRANSFER":
      return patch(action.orderId, ["AWAITING_CLIENT_TRANSFER"], {
        status: "AWAITING_CASHIER_CONFIRMATION",
        clientProofName: action.proofName,
      });

    case "CASHIER_CONFIRM_RECEIPT":
      return patch(action.orderId, ["AWAITING_CASHIER_CONFIRMATION"], {
        status: "AWAITING_CASHIER_TRANSFER",
      });

    case "CASHIER_TRANSFER":
      return patch(action.orderId, ["AWAITING_CASHIER_TRANSFER"], {
        status: "AWAITING_CLIENT_CONFIRMATION",
        txid: action.txid,
      });

    case "CLIENT_CONFIRM":
      return patch(action.orderId, ["AWAITING_CLIENT_CONFIRMATION"], {
        status: "COMPLETED",
      });

    case "REQUEST_CANCEL":
      return patch(action.orderId, CANCELLABLE_STATUSES, (order) => ({
        status: "CANCEL_REQUESTED",
        cancelRequestedBy: action.requestedBy,
        cancelReason: action.reason,
        previousMainlineStatus: order.status,
      }));

    case "RESPOND_CANCEL":
      return patch(action.orderId, ["CANCEL_REQUESTED"], action.accept
        ? { status: "CANCEL_ACCEPTED" }
        : {
            status: "DISPUTE_OPEN",
            disputeReason: "Cancelamento recusado pela contraparte.",
          });

    case "OPEN_DISPUTE":
      return patch(action.orderId, CANCELLABLE_STATUSES, (order) => ({
        status: "DISPUTE_OPEN",
        disputeReason: action.reason,
        previousMainlineStatus: order.status,
      }));

    case "RATE":
      return patch(action.orderId, ["COMPLETED"], { rating: action.rating });

    default:
      return state;
  }
}

interface MockOrdersContextValue {
  orders: Order[];
  createOrder: (input: {
    type: OrderType;
    paymentMethod: string;
    grossAmount: number;
    quote: OrderQuote;
    clientId: string;
    clientName: string;
  }) => Order;
  acceptOrder: (orderId: string, cashierId: string, cashierName: string) => void;
  markClientTransferred: (orderId: string, proofName: string) => void;
  confirmCashierReceipt: (orderId: string) => void;
  markCashierTransferred: (orderId: string, txid: string) => void;
  confirmClientReceipt: (orderId: string) => void;
  requestCancel: (orderId: string, requestedBy: CancelRequester, reason: string) => void;
  respondCancel: (orderId: string, accept: boolean) => void;
  openDispute: (orderId: string, reason: string) => void;
  rateOrder: (orderId: string, rating: number) => void;
}

const MockOrdersContext = createContext<MockOrdersContextValue | null>(null);

export function MockOrdersProvider({ children }: { children: ReactNode }) {
  const [orders, dispatch] = useReducer(ordersReducer, undefined, seedOrders);

  const createOrder: MockOrdersContextValue["createOrder"] = useCallback((input) => {
    const order: Order = {
      id: `order-${crypto.randomUUID()}`,
      publicId: nextPublicId(),
      type: input.type,
      asset: "USDT",
      network: "TRC20",
      fiatCurrency: "BRL",
      paymentMethod: input.paymentMethod,
      grossAmount: input.grossAmount,
      quote: input.quote.quote,
      feePercent: input.quote.feePercent,
      feeAmount: input.quote.feeAmount,
      netAmount: input.quote.netAmount,
      status: "OPEN",
      clientId: input.clientId,
      clientName: input.clientName,
      createdAt: now(),
      updatedAt: now(),
    };
    dispatch({ type: "CREATE", order });
    return order;
  }, []);

  const acceptOrder = useCallback(
    (orderId: string, cashierId: string, cashierName: string) =>
      dispatch({ type: "ACCEPT", orderId, cashierId, cashierName }),
    [],
  );
  const markClientTransferred = useCallback(
    (orderId: string, proofName: string) =>
      dispatch({ type: "CLIENT_TRANSFER", orderId, proofName }),
    [],
  );
  const confirmCashierReceipt = useCallback(
    (orderId: string) => dispatch({ type: "CASHIER_CONFIRM_RECEIPT", orderId }),
    [],
  );
  const markCashierTransferred = useCallback(
    (orderId: string, txid: string) =>
      dispatch({ type: "CASHIER_TRANSFER", orderId, txid }),
    [],
  );
  const confirmClientReceipt = useCallback(
    (orderId: string) => dispatch({ type: "CLIENT_CONFIRM", orderId }),
    [],
  );
  const requestCancel = useCallback(
    (orderId: string, requestedBy: CancelRequester, reason: string) =>
      dispatch({ type: "REQUEST_CANCEL", orderId, requestedBy, reason }),
    [],
  );
  const respondCancel = useCallback(
    (orderId: string, accept: boolean) =>
      dispatch({ type: "RESPOND_CANCEL", orderId, accept }),
    [],
  );
  const openDispute = useCallback(
    (orderId: string, reason: string) =>
      dispatch({ type: "OPEN_DISPUTE", orderId, reason }),
    [],
  );
  const rateOrder = useCallback(
    (orderId: string, rating: number) => dispatch({ type: "RATE", orderId, rating }),
    [],
  );

  return (
    <MockOrdersContext.Provider
      value={{
        orders,
        createOrder,
        acceptOrder,
        markClientTransferred,
        confirmCashierReceipt,
        markCashierTransferred,
        confirmClientReceipt,
        requestCancel,
        respondCancel,
        openDispute,
        rateOrder,
      }}
    >
      {children}
    </MockOrdersContext.Provider>
  );
}

export function useMockOrders() {
  const ctx = useContext(MockOrdersContext);
  if (!ctx) {
    throw new Error("useMockOrders precisa estar dentro de MockOrdersProvider");
  }
  return ctx;
}
