"use client";

import { useMemo, useState } from "react";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMockOrders } from "@/lib/mock/orders";
import { formatBRL, formatUSDT } from "@/lib/mock/format";

/**
 * GET /admin/orders — protótipo com dados fake. Visão consolidada:
 * mostra TODAS as ordens, não só as do participante logado (diferente
 * de `/orders`, que respeita a checagem de participante em
 * `OrderDetail`). De propósito não linka pro detalhe de cada ordem
 * ainda — `OrderDetail` bloqueia quem não é participante (IDOR, ver
 * [[14 - Ofertas e Ordens]]), e este protótipo ainda não tem uma
 * identidade de admin separada que justifique abrir uma exceção nessa
 * checagem já auditada. Fica como visão de leitura só, por enquanto.
 */
export default function AdminOrdersPage() {
  const { orders } = useMockOrders();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return orders;
    return orders.filter(
      (order) =>
        order.publicId.toLowerCase().includes(normalized) ||
        order.clientName.toLowerCase().includes(normalized) ||
        (order.cashierName ?? "").toLowerCase().includes(normalized),
    );
  }, [orders, query]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Ordens</h1>
        <p className="text-muted-foreground text-sm">Visão consolidada de todas as ordens da plataforma</p>
      </div>

      <Input
        placeholder="Buscar por ID público, cliente ou caixeiro"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="max-w-sm"
      />

      <div className="border-border overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Caixeiro</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">{order.publicId}</TableCell>
                <TableCell>{order.type === "compra" ? "Compra" : "Venda"}</TableCell>
                <TableCell>{order.clientName}</TableCell>
                <TableCell>{order.cashierName ?? "—"}</TableCell>
                <TableCell>
                  {formatBRL(order.grossAmount)}
                  <span className="text-muted-foreground"> · {formatUSDT(order.netAmount)}</span>
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground text-center">
                  Nenhuma ordem encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
