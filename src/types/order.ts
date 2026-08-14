/**
 * Máquina de estados da ordem — espelha Arquitetura Técnica, seção 4
 * (docs/Documentação/02 - Arquitetura Técnica.md). Fonte de verdade real
 * é o backend; este union só precisa acompanhar mudanças lá.
 *
 * `FROZEN_FOR_AUDIT` **não está** na seção 4 da Arquitetura Técnica —
 * não existia em nenhuma documentação do projeto até o checklist de
 * validação da Sprint -1 pedir esse estado explicitamente. Semântica
 * adotada aqui (decisão de frontend, pendente de validar com o time
 * antes de virar backend de verdade): um admin pode congelar qualquer
 * ordem num estado intermediário (mesmo conjunto de
 * `CANCELLABLE_STATUSES`) pra investigação — ex. suspeita de fraude,
 * sinalização AML, valor atípico. Enquanto congelada, cliente e
 * caixeiro não têm nenhuma ação disponível (`OrderActions` não
 * renderiza controles pra este status). O admin libera de volta pro
 * status exato onde a ordem estava (`previousMainlineStatus` guarda
 * isso), ou escala pra disputa formal separadamente — congelar não é
 * o mesmo que abrir disputa. Motivo é campo obrigatório (`freezeReason`),
 * seguindo a regra "toda transição grava... motivo" da seção 4.
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
  | "CLOSED"
  | "FROZEN_FOR_AUDIT";

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
  FROZEN_FOR_AUDIT: { label: "Congelada para auditoria", category: "dispute" },
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

/**
 * Mesmo fluxo de `ORDER_HAPPY_PATH`, mas agrupado do jeito que o backend
 * real enxerga (ver [[21 - Integração com API Real]] §2): os pares
 * `AWAITING_*`/estado-base são a mesma etapa vista por papéis diferentes,
 * não dois passos separados — `OrderTimeline` usa isto pra desenhar um
 * step por etapa real, não por variação de rótulo. `RESERVED` fica de
 * fora: não existe como estado no backend (aceite vai direto
 * `OPEN → ACCEPTED`) e a máquina de estados do mock nunca o atribui.
 */
export const ORDER_HAPPY_PATH_STEPS: OrderStatus[][] = [
  ["OPEN"],
  ["ACCEPTED", "AWAITING_CLIENT_TRANSFER"],
  ["CLIENT_MARKED_TRANSFERRED", "AWAITING_CASHIER_CONFIRMATION"],
  ["CASHIER_CONFIRMED_RECEIPT", "AWAITING_CASHIER_TRANSFER"],
  ["CASHIER_MARKED_TRANSFERRED", "AWAITING_CLIENT_CONFIRMATION"],
  ["COMPLETED"],
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
  /** URL local (blob:) do comprovante anexado — é o que dá pro caixeiro
   * de fato abrir e ver o arquivo, não só o nome. Mesmo princípio de
   * `ChatAttachment.signedUrl` (`types/chat.ts`): no backend real seria
   * uma URL assinada temporária de storage privado, nunca um caminho
   * público; aqui, só local à aba do navegador. */
  clientProofUrl?: string;
  clientProofMimeType?: string;
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
  /** Motivo obrigatório de um congelamento `FROZEN_FOR_AUDIT` — ver
   * comentário em `OrderStatus`. */
  freezeReason?: string;
  /**
   * Chave PIX do cliente envolvida nesta ordem — snapshot (mesmo
   * princípio de `feePercent`/`quote`: a chave pode ser editada ou
   * removida depois em `/profile`, mas a ordem preserva o que foi
   * usado no momento da criação). Em `compra`, representa a conta de
   * origem do pagamento (checagem de titularidade/anti-triangulação:
   * de onde o dinheiro sai precisa bater com o KYC de quem envia); em
   * `venda`, representa a conta de destino (pra onde o caixeiro
   * transfere). Sem isso, não dá pra criar ordem — ver `/orders/new`.
   */
  clientPixKeySnapshot?: {
    type: string;
    key: string;
    bank: string;
    /** Nome do titular da chave — pode divergir de `clientName` (ex.
     * chave de pessoa jurídica cadastrada por quem opera a conta). Usada
     * pra validação de identidade no detalhe da ordem. */
    holderName?: string;
  };
  /**
   * Chave PIX do caixeiro envolvida nesta ordem — mesmo princípio de
   * `clientPixKeySnapshot`, snapshot no momento do aceite (não a chave
   * atual em `/profile`, que pode mudar depois). Em `compra`, é pra onde
   * o cliente efetivamente transfere o BRL — sem isso, o cliente nunca
   * saberia qual conta usar pra pagar. Pode ficar ausente se o caixeiro
   * não tinha nenhuma chave cadastrada no momento do aceite.
   */
  cashierPixKeySnapshot?: {
    type: string;
    key: string;
    bank: string;
    /** Ver `clientPixKeySnapshot.holderName`. */
    holderName?: string;
  };
}
