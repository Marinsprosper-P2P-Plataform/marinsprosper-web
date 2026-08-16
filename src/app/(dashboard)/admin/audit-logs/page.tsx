"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { listAuditLogsRequest } from "@/lib/admin/api";
import type { AuditLogEntry } from "@/lib/admin/types";
import { ApiError, ApiNetworkError } from "@/lib/api";

/**
 * `GET /admin/audit-logs` real — só leitura, `audit_logs` é
 * append-only no banco e não tem rota de escrita nenhuma (nunca vai
 * ter um botão de editar ou apagar aqui). Filtros são os de uma
 * investigação de verdade: o que fulano fez (`actorId`), o que
 * aconteceu com esta entidade (`entityType`+`entityId`), o que
 * aconteceu num período (`action`+`from`/`to`). Sem categorias
 * on-chain/admin como o protótipo tinha — o backend não separa por
 * categoria, só por `action`/`entityType` livres.
 */
export default function AdminAuditLogsPage() {
  const [events, setEvents] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    action: "",
    entityType: "",
    entityId: "",
    actorId: "",
    from: "",
    to: "",
  });

  async function load(current: typeof filters) {
    setLoading(true);
    try {
      const { data } = await listAuditLogsRequest({
        action: current.action.trim() || undefined,
        entityType: current.entityType.trim() || undefined,
        entityId: current.entityId.trim() || undefined,
        actorId: current.actorId.trim() || undefined,
        from: current.from ? new Date(current.from).toISOString() : undefined,
        to: current.to ? new Date(current.to).toISOString() : undefined,
      });
      setEvents(data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiNetworkError) setError(err.message);
      else if (err instanceof ApiError && err.status === 403) {
        setError("Acesso restrito à administração — sua conta não tem o papel ADMIN.");
      } else if (err instanceof ApiError) setError(`Backend recusou a consulta: ${err.message}`);
      else setError("Não foi possível carregar a trilha de auditoria.");
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }

  useEffect(() => {
    void (async () => {
      await load({ action: "", entityType: "", entityId: "", actorId: "", from: "", to: "" });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Logs de auditoria</h1>
        <p className="text-muted-foreground text-sm">
          Consulta somente leitura — nenhum evento pode ser editado ou apagado por aqui
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          load(filters);
        }}
        className="border-border grid grid-cols-2 gap-3 rounded-lg border p-4 sm:grid-cols-3"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="action">Ação</Label>
          <Input
            id="action"
            placeholder="ex.: order.accepted"
            value={filters.action}
            onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="entityType">Tipo de entidade</Label>
          <Input
            id="entityType"
            placeholder="ex.: order"
            value={filters.entityType}
            onChange={(event) => setFilters((current) => ({ ...current, entityType: event.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="entityId">ID da entidade</Label>
          <Input
            id="entityId"
            value={filters.entityId}
            onChange={(event) => setFilters((current) => ({ ...current, entityId: event.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="actorId">Ator</Label>
          <Input
            id="actorId"
            value={filters.actorId}
            onChange={(event) => setFilters((current) => ({ ...current, actorId: event.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from">De</Label>
          <Input
            id="from"
            type="datetime-local"
            value={filters.from}
            onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to">Até</Label>
          <Input
            id="to"
            type="datetime-local"
            value={filters.to}
            onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
          />
        </div>
        <div className="col-span-2 flex items-end sm:col-span-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Consultando..." : "Consultar"}
          </Button>
        </div>
      </form>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {!loaded && !loading && !error && (
        <p className="text-muted-foreground text-sm">Ajuste os filtros e consulte a trilha.</p>
      )}

      {loaded && !loading && (
        <div className="border-border overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/hora</TableHead>
                <TableHead>Ator</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(event.createdAt).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {event.actorType === "SYSTEM" ? "sistema" : (event.actorId?.slice(0, 8) ?? "—")}
                  </TableCell>
                  <TableCell className="text-xs">{event.action}</TableCell>
                  <TableCell className="text-xs">
                    {event.entityType}
                    {event.entityId && <span className="text-muted-foreground"> · {event.entityId.slice(0, 8)}</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs text-xs whitespace-normal">
                    {event.metadata ? JSON.stringify(event.metadata) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {events.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center">
                    Nenhum evento encontrado.
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
