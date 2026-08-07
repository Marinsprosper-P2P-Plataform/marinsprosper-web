"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMockAuditLog, type AuditEventCategory } from "@/lib/mock/audit-log";

type Filter = AuditEventCategory | "todos";

/**
 * GET /admin/audit-logs — protótipo com dados fake. Somente leitura,
 * de propósito: nenhum botão de editar ou apagar em lugar nenhum
 * desta tela, mesma regra de log imutável de
 * [[04 - Documentação de Segurança]]. Inclui eventos on-chain
 * (depósito, liberação, reembolso) misturados com ações
 * administrativas — filtro por categoria só reorganiza a visão, não
 * esconde nada de ninguém (sem mascaramento aqui ainda, isso é o card
 * separado "Máscara de dados sensíveis").
 */
export default function AdminAuditLogsPage() {
  const { events } = useMockAuditLog();
  const [filter, setFilter] = useState<Filter>("todos");

  const filtered = useMemo(
    () => (filter === "todos" ? events : events.filter((event) => event.category === filter)),
    [events, filter],
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Logs de auditoria</h1>
        <p className="text-muted-foreground text-sm">
          Consulta somente leitura — nenhum evento pode ser editado ou apagado por aqui
        </p>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="on-chain">On-chain</TabsTrigger>
          <TabsTrigger value="admin">Administrativo</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="pt-3">
          <div className="border-border overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/hora</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Ator</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Alvo</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(event.createdAt).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={event.category === "on-chain" ? "outline" : "secondary"}>
                        {event.category === "on-chain" ? "On-chain" : "Admin"}
                      </Badge>
                    </TableCell>
                    <TableCell>{event.actor}</TableCell>
                    <TableCell>{event.action}</TableCell>
                    <TableCell>{event.target}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs text-xs whitespace-normal">
                      {event.details}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground text-center">
                      Nenhum evento encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
