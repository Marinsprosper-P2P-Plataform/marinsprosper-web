/**
 * Simula o cálculo de taxa que hoje só existe no backend (Parte 1, seção
 * 3: "toda regra financeira existe no backend; o frontend solicita, o
 * servidor valida e executa"). Mesmo sem servidor de verdade ainda, esta
 * função representa essa fronteira: nenhum componente de UI multiplica
 * `amount * feePercent` diretamente — todos chamam `quoteOrder` e
 * esperam a resposta, como fariam com um `POST /orders` de verdade.
 *
 * Valores vêm da Parte 1, seção 4: 3% total (2,5% caixeiro / 0,5%
 * plataforma).
 */

const FEE_PERCENT = 3;
const FAKE_QUOTE_USDT_BRL = 5.42;
const SIMULATED_LATENCY_MS = 350;

export interface OrderQuote {
  quote: number;
  feePercent: number;
  feeAmount: number;
  netAmount: number;
}

export async function quoteOrder(grossAmount: number): Promise<OrderQuote> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  const feeAmount = Math.round(grossAmount * (FEE_PERCENT / 100) * 100) / 100;
  const netFiat = grossAmount - feeAmount;
  const netAmount = Math.round((netFiat / FAKE_QUOTE_USDT_BRL) * 1_000_000) / 1_000_000;

  return {
    quote: FAKE_QUOTE_USDT_BRL,
    feePercent: FEE_PERCENT,
    feeAmount,
    netAmount,
  };
}
