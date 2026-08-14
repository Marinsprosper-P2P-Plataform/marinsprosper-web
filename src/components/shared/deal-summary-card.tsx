import { formatBRL, formatUSDT } from "@/lib/mock/format";
import type { Order } from "@/types/order";

/** Card em destaque com "Você paga"/"Você recebe" — calculado por papel
 * (cliente/caixeiro) e sentido da ordem (compra/venda), já que os dois
 * lados de uma mesma ordem sempre pagam e recebem moedas diferentes. */
export function DealSummaryCard({ order, isClient }: { order: Order; isClient: boolean }) {
  // Em `compra`, o cliente paga BRL e recebe USDT; em `venda`, o
  // cliente paga USDT e recebe BRL. O caixeiro é sempre o espelho do
  // cliente na mesma ordem.
  const clientPaysFiat = order.type === "compra";
  const iPayFiat = isClient ? clientPaysFiat : !clientPaysFiat;

  const youPay = iPayFiat ? formatBRL(order.grossAmount) : formatUSDT(order.netAmount);
  const youReceive = iPayFiat ? formatUSDT(order.netAmount) : formatBRL(order.grossAmount);

  return (
    <div className="border-border grid grid-cols-2 gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground text-xs">Você paga</span>
        <span className="text-lg font-semibold">{youPay}</span>
      </div>
      <div className="flex flex-col gap-0.5 text-right">
        <span className="text-muted-foreground text-xs">Você recebe</span>
        <span className="text-lg font-semibold">{youReceive}</span>
      </div>
      <p className="text-muted-foreground col-span-2 text-xs">
        A taxa da plataforma ({order.feePercent}%, {formatBRL(order.feeAmount)}) já está descontada
        do valor mostrado acima — não precisa calcular nada a mais.
      </p>
    </div>
  );
}
