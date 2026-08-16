"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listAdminOrdersRequest } from "@/lib/admin/api";
import type { AdminOrder } from "@/lib/admin/types";
import { ApiError, ApiNetworkError } from "@/lib/api";
import { formatBRL, formatUSDT } from "@/lib/mock/format";
import type { BackendOrderStatus } from "@/lib/order-status-map";

const STATUS_LABEL: Record<BackendOrderStatus, string> = {
  DRAFT: "Rascunho",
  OPEN: "Aberta",
  ACCEPTED: "Aceita",
  CLIENT_TRANSFERRED: "Cliente transferiu",
  RECEIPT_CONFIRMED: "Recebimento confirmado",
  CASHIER_TRANSFERRED: "Caixeiro transferiu",
  COMPLETED: "Concluída",
  CANCEL_REQUESTED: "Cancelamento pedido",
  CANCELLED: "Cancelada",
  DISPUTED: "Em disputa",
  EXPIRED: "Expirada",
};

/**
 * `GET /admin/orders` real — visão consolidada, mostra ordens de
 * qualquer usuário (única leitura da API sem recorte de participante,
 * por isso atrás do `AdminGuard`). Sem congelar/liberar: `FROZEN_FOR_AUDIT`
 * não existe no backend nem está planejado (decisão de produto
 * pendente, ver Kanban) — o mock antigo simulava essa ação, removida
 * aqui. Sem drill-down pro detalhe por enquanto: `OrderDetail` aplica
 * a checagem de participante (IDOR) que bloquearia o próprio admin.
 */
export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await listAdminOrdersRequest();
        if (cancelled) return;
        setOrders(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiNetworkError) setError(err.message);
        else if (err instanceof ApiError && err.status === 403) {
          setError("Acesso restrito à administração — sua conta não tem o papel ADMIN.");
        } else if (err instanceof ApiError) setError(`Backend recusou a listagem: ${err.message}`);
        else setError("Não foi possível carregar as ordens.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = orders.filter((order) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    return (
      order.id.toLowerCase().includes(normalized) ||
      order.clientId.toLowerCase().includes(normalized) ||
      (order.cashierId ?? "").toLowerCase().includes(normalized)
    );
  });

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Ordens</h1>
        <p className="text-muted-foreground text-sm">Visão consolidada de todas as ordens da plataforma</p>
      </div>

      <Input
        placeholder="Buscar por ID, cliente ou caixeiro"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="max-w-sm"
      />

      {error && <p className="text-destructive text-sm">{error}</p>}
      {loading && <p className="text-muted-foreground text-sm">Carregando...</p>}

      {!loading && !error && (
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
                  <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
                  <TableCell>{order.side === "CLIENT_BUYS_ASSET" ? "Compra" : "Venda"}</TableCell>
                  <TableCell className="font-mono text-xs">{order.clientId.slice(0, 8)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {order.cashierId ? order.cashierId.slice(0, 8) : "—"}
                  </TableCell>
                  <TableCell>
                    {formatBRL(Number(order.fiatAmount))}
                    <span className="text-muted-foreground"> · {formatUSDT(Number(order.assetAmount))}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{STATUS_LABEL[order.status]}</Badge>
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
      )}
    </div>
  );
}
