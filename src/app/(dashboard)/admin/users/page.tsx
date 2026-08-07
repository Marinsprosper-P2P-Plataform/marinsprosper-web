"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMockAdminUsers, type UserStatus } from "@/lib/mock/admin-users";
import { useMockAuditLog } from "@/lib/mock/audit-log";
import { useMockSession } from "@/lib/mock/session";

const STATUS_VARIANT: Record<UserStatus, "default" | "secondary" | "outline" | "destructive"> = {
  aprovado: "default",
  pendente: "secondary",
  suspenso: "outline",
  bloqueado: "destructive",
};

const STATUS_LABEL: Record<UserStatus, string> = {
  aprovado: "Aprovado",
  pendente: "Pendente",
  suspenso: "Suspenso",
  bloqueado: "Bloqueado",
};

/** GET /admin/users — protótipo com dados fake. Cobre o card
 * "Listagem e busca de usuários" do bucket Administração & Mediação.
 * Busca é só filtro client-side sobre a lista já carregada — não é
 * paginação/busca server-side (isso é Sprint 4). */
export default function AdminUsersPage() {
  const { user } = useMockSession();
  const { users, approveUser } = useMockAdminUsers();
  const { logEvent } = useMockAuditLog();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter(
      (candidate) =>
        candidate.name.toLowerCase().includes(normalized) ||
        candidate.username.toLowerCase().includes(normalized) ||
        candidate.email.toLowerCase().includes(normalized),
    );
  }, [users, query]);

  function handleApprove(userId: string, name: string, username: string) {
    approveUser(userId);
    logEvent({
      category: "admin",
      actor: `${user.name} (admin)`,
      action: "Cadastro aprovado",
      target: `${name} (@${username})`,
      details: "Aprovação registrada no protótipo — sem checagem real de documentos ainda.",
    });
    toast.success(`${name} aprovada(o)`);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Usuários</h1>
        <p className="text-muted-foreground text-sm">Listagem e aprovação de cadastros</p>
      </div>

      <Input
        placeholder="Buscar por nome, @username ou e-mail"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="max-w-sm"
      />

      <div className="border-border overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>KYC</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((candidate) => (
              <TableRow key={candidate.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{candidate.name}</span>
                    <span className="text-muted-foreground text-xs">@{candidate.username}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-xs">
                    <span>{candidate.email}</span>
                    <span className="text-muted-foreground">{candidate.phone}</span>
                  </div>
                </TableCell>
                <TableCell>Nível {candidate.kycLevel}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[candidate.status]}>
                    {STATUS_LABEL[candidate.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {candidate.status === "pendente" && (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(candidate.id, candidate.name, candidate.username)}
                    >
                      Aprovar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground text-center">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
