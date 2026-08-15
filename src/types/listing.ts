import type { PixKeyType } from "@/lib/validations/pix";

/** Operação que o dono da oferta quer fazer — "compra" = dono quer
 * comprar USDT (a contraparte que negocia vende), "venda" = dono quer
 * vender USDT (a contraparte que negocia compra). Mesma convenção de
 * `Order["type"]` em `src/types/order.ts`. */
export type ListingOperation = "compra" | "venda";

export type PaymentMethodKind = "pix" | "transferencia";

export interface PixMethodDetails {
  kind: "pix";
  pixType: PixKeyType;
  pixKey: string;
}

export interface TransferMethodDetails {
  kind: "transferencia";
  bank: string;
  agency: string;
  account: string;
  transferKey: string;
}

export type PaymentMethodDetails = PixMethodDetails | TransferMethodDetails;

/** Método de pagamento cadastrado pelo dono de uma oferta — cadastro
 * inline dentro do wizard (etapa 1), separado das chaves PIX de
 * `src/lib/mock/pix-keys.tsx` porque cobre também transferência
 * bancária, e é um cadastro específico pra ofertas, não pro perfil. */
export interface PaymentMethod {
  id: string;
  userId: string;
  label: string;
  details: PaymentMethodDetails;
  createdAt: string;
}

export type ListingStatus = "ATIVA" | "PAUSADA" | "CANCELADA" | "ENCERRADA";

export interface Listing {
  id: string;
  operation: ListingOperation;
  asset: string;
  paymentMethodId: string;
  /** Cotação declarada pelo dono da oferta (BRL por unidade do ativo) —
   * só orienta a negociação; a ordem real criada ao negociar usa a
   * cotação de `quoteOrder` (`src/lib/mock/pricing.ts`), mesma regra do
   * resto do app (nenhuma tela financeira calcula taxa sozinha). */
  quote: number;
  /** "Não aceito negociação com terceiros" — só informativo na oferta,
   * sem trava automática (não há como o protótipo verificar terceiros). */
  noThirdParty: boolean;
  /** Quantidade restante disponível, no ativo (USDT) — decresce a cada
   * negociação (ver `useMockListings().negotiateListing`). */
  totalQuantity: number;
  minPerOrder: number;
  maxPerOrder: number;
  terms: string;
  welcomeMessage: string;
  isPublic: boolean;
  platformFeePercent: number;
  /** Comissão da plataforma sobre `totalQuantity * quote`, calculada na
   * publicação/edição — não recalculada dinamicamente. */
  feeAmount: number;
  status: ListingStatus;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}
