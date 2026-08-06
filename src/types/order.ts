/**
 * Máquina de estados da ordem — espelha Arquitetura Técnica, seção 4
 * (docs/Documentação/02 - Arquitetura Técnica.md). Fonte de verdade real
 * é o backend; este union só precisa acompanhar mudanças lá.
 */
export type OrderStatus =
  | "DRAFT"
  | "OPEN"
  | "RESERVED"
  | "ACCEPTED"
  | "AWAITING_CLIENT_TRANSFER"
  | "CLIENT_MARKED_TRANSFERRED"
  | "AWAITING_CASHIER_CONFIRMATION"
  | "CASHIER_CONFIRMED_RECEIPT"
  | "AWAITING_CASHIER_TRANSFER"
  | "CASHIER_MARKED_TRANSFERRED"
  | "AWAITING_CLIENT_CONFIRMATION"
  | "COMPLETED"
  | "CANCEL_REQUESTED"
  | "CANCEL_ACCEPTED"
  | "CANCEL_REJECTED"
  | "DISPUTE_OPEN"
  | "DISPUTE_UNDER_REVIEW"
  | "DISPUTE_RESOLVED"
  | "EXPIRED"
  | "SUSPENDED"
  | "CLOSED";

/** As 6 categorias visuais definidas em globals.css (tokens --status-*). */
export type OrderStatusCategory =
  | "open"
  | "progress"
  | "completed"
  | "cancelled"
  | "dispute"
  | "expired";

interface OrderStatusMeta {
  label: string;
  category: OrderStatusCategory;
}

export const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  DRAFT: { label: "Rascunho", category: "open" },
  OPEN: { label: "Aberta", category: "open" },
  RESERVED: { label: "Reservada", category: "progress" },
  ACCEPTED: { label: "Aceita pelo caixeiro", category: "progress" },
  AWAITING_CLIENT_TRANSFER: {
    label: "Aguardando transferência do cliente",
    category: "progress",
  },
  CLIENT_MARKED_TRANSFERRED: {
    label: "Cliente informou transferência",
    category: "progress",
  },
  AWAITING_CASHIER_CONFIRMATION: {
    label: "Aguardando confirmação do caixeiro",
    category: "progress",
  },
  CASHIER_CONFIRMED_RECEIPT: {
    label: "Caixeiro confirmou recebimento",
    category: "progress",
  },
  AWAITING_CASHIER_TRANSFER: {
    label: "Aguardando envio do caixeiro",
    category: "progress",
  },
  CASHIER_MARKED_TRANSFERRED: {
    label: "Caixeiro informou envio",
    category: "progress",
  },
  AWAITING_CLIENT_CONFIRMATION: {
    label: "Aguardando confirmação do cliente",
    category: "progress",
  },
  COMPLETED: { label: "Concluída", category: "completed" },
  CANCEL_REQUESTED: {
    label: "Cancelamento solicitado",
    category: "progress",
  },
  CANCEL_ACCEPTED: { label: "Cancelada", category: "cancelled" },
  CANCEL_REJECTED: {
    label: "Cancelamento recusado",
    category: "progress",
  },
  DISPUTE_OPEN: { label: "Em disputa", category: "dispute" },
  DISPUTE_UNDER_REVIEW: { label: "Disputa em análise", category: "dispute" },
  DISPUTE_RESOLVED: { label: "Disputa resolvida", category: "dispute" },
  EXPIRED: { label: "Expirada", category: "expired" },
  SUSPENDED: { label: "Suspensa", category: "expired" },
  CLOSED: { label: "Encerrada", category: "cancelled" },
};

/** Ordem principal da linha do tempo — ramos (cancelamento, disputa,
 * expiração) não aparecem aqui; ver OrderTimeline para como são tratados. */
export const ORDER_HAPPY_PATH: OrderStatus[] = [
  "OPEN",
  "RESERVED",
  "ACCEPTED",
  "AWAITING_CLIENT_TRANSFER",
  "CLIENT_MARKED_TRANSFERRED",
  "AWAITING_CASHIER_CONFIRMATION",
  "CASHIER_CONFIRMED_RECEIPT",
  "AWAITING_CASHIER_TRANSFER",
  "CASHIER_MARKED_TRANSFERRED",
  "AWAITING_CLIENT_CONFIRMATION",
  "COMPLETED",
];
