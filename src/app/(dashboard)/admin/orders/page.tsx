"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MfaNotice } from "@/components/shared/mfa-notice";
import { useMockAuditLog } from "@/lib/mock/audit-log";
import { CANCELLABLE_STATUSES, useMockOrders } from "@/lib/mock/orders";
import { useMockSession } from "@/lib/mock/session";
import { formatBRL, formatUSDT } from "@/lib/mock/format";
import type { Order } from "@/types/order";

/**
 * GET /admin/orders — protótipo com dados fake. Visão consolidada:
 * mostra TODAS as ordens, não só as do participante logado (diferente
 * de `/orders`, que respeita a checagem de participante em
 * `OrderDetail`). De propósito não linka pro detalhe de cada ordem
 * ainda — `OrderDetail` bloqueia quem não é participante (IDOR, ver
 * [[14 - Ofertas e Ordens]]), e este protótipo ainda não tem uma
 * identidade de admin separada que justifique abrir uma exceção nessa
 * checagem já auditada. Fica como visão de leitura só, por enquanto.
 *
 * Ação de congelar/liberar (`FROZEN_FOR_AUDIT`, ver `src/types/order.ts`)
 * é a única ação administrativa desta tela — cobre o item do checklist
 * de validação da Sprint -1 sobre esse estado de exceção.
 */
export default function AdminOrdersPage() {
  const { user } = useMockSession();
  const { orders, freezeOrder, unfreezeOrder } = useMockOrders();
  const { logEvent } = useMockAuditLog();
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

  function handleFreeze(order: Order, reason: string) {
    freezeOrder(order.id, reason);
    logEvent({
      category: "admin",
      actor: `${user.name} (admin)`,
      action: "Ordem congelada para auditoria",
      target: `Ordem ${order.publicId}`,
      details: reason,
    });
    toast.success("Ordem congelada");
  }

  function handleUnfreeze(order: Order) {
    unfreezeOrder(order.id);
    logEvent({
      category: "admin",
      actor: `${user.name} (admin)`,
      action: "Ordem liberada da auditoria",
      target: `Ordem ${order.publicId}`,
      details: "Retomada no status em que estava antes do congelamento.",
    });
    toast.success("Ordem liberada");
  }

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
              <TableHead className="text-right">Ação</TableHead>
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
                <TableCell className="text-right">
                  {order.status === "FROZEN_FOR_AUDIT" ? (
                    <Button size="sm" variant="outline" onClick={() => handleUnfreeze(order)}>
                      Liberar
                    </Button>
                  ) : (
                    CANCELLABLE_STATUSES.includes(order.status) && (
                      <FreezeDialog order={order} onConfirm={handleFreeze} />
                    )
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground text-center">
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

function FreezeDialog({
  order,
  onConfirm,
}: {
  order: Order;
  onConfirm: (order: Order, reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Congelar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Congelar ordem para auditoria</DialogTitle>
          <DialogDescription>
            Bloqueia qualquer ação de cliente e caixeiro em {order.publicId} até ser liberada.
            Motivo é obrigatório — toda transição grava autor e motivo.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="freeze-reason">Motivo</Label>
          <Input
            id="freeze-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: valor atípico, sinalização de fraude"
          />
        </div>
        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <MfaNotice />
          <Button
            disabled={!reason.trim()}
            onClick={() => {
              onConfirm(order, reason.trim());
              setOpen(false);
              setReason("");
            }}
          >
            Congelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
