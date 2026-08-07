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

export type OrderType = "compra" | "venda";

export type CancelRequester = "cliente" | "caixeiro";

/**
 * Modelo simplificado da ordem para o protótipo (Sprint -1, dados fake).
 * Espelha `orders` em [[03 - Modelo de Dados]], mas achatado — sem as
 * tabelas satélite (order_fee_snapshots, order_proofs etc.), que só
 * fazem sentido quando existir persistência de verdade.
 */
export interface Order {
  id: string;
  /** Identificador público não sequencial, ex. MP-20260812-000123. */
  publicId: string;
  type: OrderType;
  asset: "USDT";
  network: "TRC20";
  fiatCurrency: "BRL";
  paymentMethod: string;
  /** Valor bruto em reais, antes da taxa. */
  grossAmount: number;
  /** Cotação USDT/BRL no momento da criação — snapshot, não recalculada depois. */
  quote: number;
  /** Snapshot da taxa aplicada (Parte 1, seção 4) — imutável mesmo se a
   * configuração global mudar depois, exatamente como no modelo de dados real. */
  feePercent: number;
  feeAmount: number;
  /** Quanto de USDT efetivamente troca de mãos, líquido da taxa. */
  netAmount: number;
  status: OrderStatus;
  clientId: string;
  clientName: string;
  cashierId?: string;
  cashierName?: string;
  createdAt: string;
  updatedAt: string;
  clientProofName?: string;
  txid?: string;
  cancelRequestedBy?: CancelRequester;
  cancelReason?: string;
  disputeReason?: string;
  rating?: number;
  /** Onde a ordem estava no fluxo principal antes de desviar pra
   * cancelamento/disputa — usada pelo OrderTimeline pra "congelar" o
   * stepper no lugar certo em vez de zerar o progresso. */
  previousMainlineStatus?: OrderStatus;
  /** SLA de 30 minutos pro cliente pagar, contado a partir do aceite —
   * definido só quando a ordem entra em `AWAITING_CLIENT_TRANSFER`. No
   * protótipo o cancelamento por timeout é simulado no cliente
   * (`PaymentCountdown`); a fila real (BullMQ) é Sprint 3. */
  paymentDeadline?: string;
}
