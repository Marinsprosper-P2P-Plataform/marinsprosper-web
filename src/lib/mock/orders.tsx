"use client";

import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  type ReactNode,
} from "react";
import type { Order, OrderType } from "@/types/order";

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
/** SLA de pagamento — 30 minutos a partir do aceite, contado no cliente
 * (ver `PaymentCountdown`). Fila real de timeout é Sprint 3 (BullMQ). */
const PAYMENT_SLA_MS = 30 * 60 * 1000;

/** Timestamp fake no passado — só pra dar massa histórica com
 * distribuição real ao longo dos últimos ~90 dias, pro bucket
 * Relatórios & Ganhos ter o que agregar (filtro de período, gráficos).
 * As 5 ordens originais (order-1..5) continuam todas com `createdAt = t`
 * (o instante do carregamento), então ficam de fora de qualquer período
 * que não seja "hoje" — por isso este histórico é necessário. */
function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Taxa fixa em 3% (ver `pricing.ts`) — usada aqui só pra manter as
 * ordens históricas consistentes com o mesmo cálculo do `quoteOrder`. */
function feeSnapshot(grossAmount: number) {
  const feeAmount = Math.round(grossAmount * 0.03 * 100) / 100;
  const netAmount = Math.round(((grossAmount - feeAmount) / 5.42) * 1_000_000) / 1_000_000;
  return { feeAmount, netAmount };
}

interface HistoricalOrderInput {
  id: string;
  type: OrderType;
  grossAmount: number;
  status: "COMPLETED" | "CANCEL_ACCEPTED" | "EXPIRED";
  clientId: "user-client-1" | "user-client-2";
  clientName: string;
  daysAgo: number;
  rating?: number;
}

/** Ordens concluídas/canceladas/expiradas no passado — todas envolvendo
 * o único caixeiro logável do protótipo (`user-cashier-1`, Beto), exceto
 * a expirada, que nunca chega a ter caixeiro. */
function seedHistoricalOrders(): Order[] {
  const inputs: HistoricalOrderInput[] = [
    { id: "order-h1", type: "compra", grossAmount: 400, status: "COMPLETED", clientId: "user-client-1", clientName: "Ana Cliente", daysAgo: 2, rating: 5 },
    { id: "order-h2", type: "venda", grossAmount: 900, status: "COMPLETED", clientId: "user-client-2", clientName: "Carla Souza", daysAgo: 5, rating: 4 },
    { id: "order-h3", type: "compra", grossAmount: 250, status: "COMPLETED", clientId: "user-client-1", clientName: "Ana Cliente", daysAgo: 9, rating: 5 },
    { id: "order-h4", type: "venda", grossAmount: 1500, status: "COMPLETED", clientId: "user-client-2", clientName: "Carla Souza", daysAgo: 14, rating: 5 },
    { id: "order-h5", type: "compra", grossAmount: 600, status: "COMPLETED", clientId: "user-client-1", clientName: "Ana Cliente", daysAgo: 20, rating: 4 },
    { id: "order-h6", type: "venda", grossAmount: 350, status: "COMPLETED", clientId: "user-client-2", clientName: "Carla Souza", daysAgo: 28, rating: 5 },
    { id: "order-h7", type: "compra", grossAmount: 2000, status: "COMPLETED", clientId: "user-client-1", clientName: "Ana Cliente", daysAgo: 35, rating: 5 },
    { id: "order-h8", type: "venda", grossAmount: 700, status: "COMPLETED", clientId: "user-client-2", clientName: "Carla Souza", daysAgo: 45, rating: 3 },
    { id: "order-h9", type: "compra", grossAmount: 500, status: "COMPLETED", clientId: "user-client-1", clientName: "Ana Cliente", daysAgo: 60, rating: 5 },
    { id: "order-h10", type: "venda", grossAmount: 1200, status: "COMPLETED", clientId: "user-client-2", clientName: "Carla Souza", daysAgo: 75, rating: 4 },
    { id: "order-h11", type: "compra", grossAmount: 300, status: "COMPLETED", clientId: "user-client-1", clientName: "Ana Cliente", daysAgo: 88, rating: 4 },
    { id: "order-h12", type: "compra", grossAmount: 400, status: "CANCEL_ACCEPTED", clientId: "user-client-1", clientName: "Ana Cliente", daysAgo: 10 },
    { id: "order-h13", type: "venda", grossAmount: 800, status: "EXPIRED", clientId: "user-client-2", clientName: "Carla Souza", daysAgo: 40 },
  ];

  return inputs.map((input) => {
    const t = daysAgo(input.daysAgo);
    const { feeAmount, netAmount } = feeSnapshot(input.grossAmount);
    const hasCashier = input.status !== "EXPIRED";
    return {
      id: input.id,
      publicId: nextPublicId(),
      type: input.type,
      asset: "USDT",
      network: "TRC20",
      fiatCurrency: "BRL",
      paymentMethod: "PIX",
      grossAmount: input.grossAmount,
      quote: 5.42,
      feePercent: 3,
      feeAmount,
      netAmount,
      status: input.status,
      clientId: input.clientId,
      clientName: input.clientName,
      cashierId: hasCashier ? "user-cashier-1" : undefined,
      cashierName: hasCashier ? "Beto Caixeiro" : undefined,
      cancelRequestedBy: input.status === "CANCEL_ACCEPTED" ? "cliente" : undefined,
      cancelReason: input.status === "CANCEL_ACCEPTED" ? "Cliente desistiu da negociação." : undefined,
      rating: input.rating,
      createdAt: t,
      updatedAt: t,
    };
  });
}

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
      clientPixKeySnapshot: { type: "cpf", key: "123.456.789-00", bank: "Nubank", holderName: "Ana Cliente" },
      cashierPixKeySnapshot: { type: "cpf", key: "987.654.321-00", bank: "Itaú", holderName: "Beto Caixeiro" },
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
      clientPixKeySnapshot: { type: "email", key: "ana.cliente@email.com", bank: "Nubank", holderName: "Ana Cliente" },
      cashierPixKeySnapshot: { type: "cpf", key: "987.654.321-00", bank: "Itaú", holderName: "Beto Caixeiro" },
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
      clientPixKeySnapshot: { type: "cpf", key: "123.456.789-00", bank: "Nubank", holderName: "Ana Cliente" },
      cashierPixKeySnapshot: { type: "cpf", key: "987.654.321-00", bank: "Itaú", holderName: "Beto Caixeiro" },
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "order-6",
      // Data fixa proposital (não `nextPublicId()`) — ordem de
      // demonstração pro alerta de divergência de titularidade PIX no
      // detalhe da ordem (chave de "Lima Consultoria e Serviços ME"
      // recebendo em nome de "Beto Lima").
      publicId: "MP-20260801-001006",
      type: "compra",
      asset: "USDT",
      network: "TRC20",
      fiatCurrency: "BRL",
      paymentMethod: "PIX",
      grossAmount: 650,
      quote: 5.42,
      feePercent: 3,
      feeAmount: 19.5,
      netAmount: 116.36,
      status: "AWAITING_CLIENT_TRANSFER",
      clientId: "user-client-1",
      clientName: "Ana Ferreira",
      cashierId: "user-cashier-1",
      cashierName: "Beto Lima",
      cashierPixKeySnapshot: {
        type: "cpf",
        key: "12.345.678/0001-90",
        bank: "Itaú",
        holderName: "Lima Consultoria e Serviços ME",
      },
      paymentDeadline: new Date(Date.now() + PAYMENT_SLA_MS).toISOString(),
      createdAt: t,
      updatedAt: t,
    },
    ...seedHistoricalOrders(),
  ];
}

type OrdersAction =
  | { type: "FREEZE_ORDER"; orderId: string; reason: string }
  | { type: "UNFREEZE_ORDER"; orderId: string };

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
    case "FREEZE_ORDER":
      return patch(action.orderId, CANCELLABLE_STATUSES, (order) => ({
        status: "FROZEN_FOR_AUDIT",
        freezeReason: action.reason,
        previousMainlineStatus: order.status,
      }));

    case "UNFREEZE_ORDER":
      return patch(action.orderId, ["FROZEN_FOR_AUDIT"], (order) => ({
        status: order.previousMainlineStatus ?? "AWAITING_CLIENT_TRANSFER",
        freezeReason: undefined,
        previousMainlineStatus: undefined,
      }));

    default:
      return state;
  }
}

interface MockOrdersContextValue {
  orders: Order[];
  freezeOrder: (orderId: string, reason: string) => void;
  unfreezeOrder: (orderId: string) => void;
}

const MockOrdersContext = createContext<MockOrdersContextValue | null>(null);

export function MockOrdersProvider({ children }: { children: ReactNode }) {
  const [orders, dispatch] = useReducer(ordersReducer, undefined, seedOrders);

  const freezeOrder = useCallback(
    (orderId: string, reason: string) => dispatch({ type: "FREEZE_ORDER", orderId, reason }),
    [],
  );
  const unfreezeOrder = useCallback(
    (orderId: string) => dispatch({ type: "UNFREEZE_ORDER", orderId }),
    [],
  );

  return (
    <MockOrdersContext.Provider
      value={{
        orders,
        freezeOrder,
        unfreezeOrder,
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
