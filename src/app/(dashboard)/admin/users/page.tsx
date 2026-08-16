"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { approveAdminUserRequest, listAdminUsersRequest } from "@/lib/admin/api";
import type { AdminUser, UserStatus } from "@/lib/admin/types";
import { ApiError, ApiNetworkError } from "@/lib/api";

const STATUS_VARIANT: Record<UserStatus, "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  PENDING_KYC: "secondary",
  SUSPENDED: "outline",
  BLOCKED: "destructive",
  CLOSED: "outline",
};

const STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: "Ativo",
  PENDING_KYC: "Pendente",
  SUSPENDED: "Suspenso",
  BLOCKED: "Bloqueado",
  CLOSED: "Encerrado",
};

/**
 * `GET /admin/users` real — fila de aprovação (`status=PENDING_KYC`)
 * e busca por e-mail (server-side, contida e sem diferenciar caixa).
 * Documento não vem nesta listagem — só `documentType`; a API não
 * expõe o número aqui (ver `admin.service.ts`), então não há campo
 * pra mascarar. Cobre "Listagem e busca de usuários" do bucket
 * Administração & Mediação.
 */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);

  const load = useCallback(async (params: { status?: UserStatus; email?: string }) => {
    setLoading(true);
    try {
      const { data } = await listAdminUsersRequest(params);
      setUsers(data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiNetworkError) setError(err.message);
      else if (err instanceof ApiError && err.status === 403) {
        setError("Acesso restrito à administração — sua conta não tem o papel ADMIN.");
      } else if (err instanceof ApiError) setError(`Backend recusou a listagem: ${err.message}`);
      else setError("Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load({ status: pendingOnly ? "PENDING_KYC" : undefined });
    })();
  }, [load, pendingOnly]);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    load({ status: pendingOnly ? "PENDING_KYC" : undefined, email: query.trim() || undefined });
  }

  async function handleApprove(userId: string, reason: string) {
    try {
      await approveAdminUserRequest(userId, { reason: reason.trim() || undefined });
      toast.success("Cadastro aprovado");
      load({ status: pendingOnly ? "PENDING_KYC" : undefined, email: query.trim() || undefined });
    } catch (err) {
      if (err instanceof ApiError && err.isConflict) {
        toast.error("Usuário não está aguardando aprovação (já saiu de PENDING_KYC).");
      } else if (err instanceof ApiError) {
        toast.error(`Não foi possível aprovar: ${err.message}`);
      } else {
        toast.error("Não foi possível aprovar — verifique a conexão.");
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Usuários</h1>
        <p className="text-muted-foreground text-sm">Listagem e aprovação de cadastros</p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por e-mail"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-sm"
        />
        <Button type="submit" variant="outline" size="sm">
          Buscar
        </Button>
        <Button
          type="button"
          variant={pendingOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setPendingOnly((current) => !current)}
        >
          Só pendentes
        </Button>
      </form>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {loading && <p className="text-muted-foreground text-sm">Carregando...</p>}

      {!loading && !error && (
        <div className="border-border overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Papéis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell className="font-medium">{candidate.fullName ?? "—"}</TableCell>
                  <TableCell className="text-xs">{candidate.email}</TableCell>
                  <TableCell className="text-xs">{candidate.documentType ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {candidate.roles.length > 0 ? candidate.roles.join(", ") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[candidate.status]}>{STATUS_LABEL[candidate.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {candidate.status === "PENDING_KYC" && (
                      <ApproveDialog user={candidate} onConfirm={handleApprove} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground text-center">
                    Nenhum usuário encontrado.
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

function ApproveDialog({
  user,
  onConfirm,
}: {
  user: AdminUser;
  onConfirm: (userId: string, reason: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Aprovar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprovar cadastro</DialogTitle>
          <DialogDescription>
            Leva {user.email} de PENDING_KYC para ACTIVE. O motivo vai para o histórico de status
            (append-only) — deixe em branco e o backend registra &quot;aprovação manual da
            administração&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="approve-reason">Motivo (opcional)</Label>
          <Input
            id="approve-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: documento conferido manualmente com selfie"
          />
        </div>
        <DialogFooter>
          <Button
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              await onConfirm(user.id, reason);
              setSubmitting(false);
              setOpen(false);
              setReason("");
            }}
          >
            Aprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
