const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(value: number) {
  return brl.format(value);
}

export function formatUSDT(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 6 })} USDT`;
}
