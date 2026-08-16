"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listKycQueueRequest } from "@/lib/kyc/admin-api";
import type { AdminKycQueueItem } from "@/lib/kyc/admin-types";
import { ApiError, ApiNetworkError } from "@/lib/api";

/**
 * `GET /admin/kyc` real — fila de análise, atrás do `AdminGuard`. Sem
 * filtro, o backend já traz só `SUBMITTED` + `IN_REVIEW`, do mais
 * antigo pro mais novo. Sem tela equivalente no protótipo antes desta
 * rodada — item citado no Kanban ("candidato a `/admin/kyc`, ao lado
 * dos outros atalhos de `/admin`").
 */
export default function AdminKycQueuePage() {
  const [cases, setCases] = useState<AdminKycQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await listKycQueueRequest();
        if (cancelled) return;
        setCases(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiNetworkError) setError(err.message);
        else if (err instanceof ApiError && err.status === 403) {
          setError("Acesso restrito à administração — sua conta não tem o papel ADMIN.");
        } else if (err instanceof ApiError) setError(`Backend recusou a listagem: ${err.message}`);
        else setError("Não foi possível carregar a fila de KYC.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Fila de KYC</h1>
        <p className="text-muted-foreground text-sm">Casos submetidos ou em análise, do mais antigo pro mais novo</p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {loading && <p className="text-muted-foreground text-sm">Carregando...</p>}

      {!loading && !error && (
        <div className="border-border overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Documentos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submetido em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((kycCase) => (
                <TableRow key={kycCase.id}>
                  <TableCell>
                    <Link href={`/admin/kyc/${kycCase.id}`} className="hover:underline">
                      <div className="flex flex-col">
                        <span className="font-medium">{kycCase.user.fullName ?? "—"}</span>
                        <span className="text-muted-foreground text-xs">{kycCase.user.email}</span>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>{kycCase.documents}</TableCell>
                  <TableCell>
                    <Badge variant={kycCase.status === "IN_REVIEW" ? "default" : "secondary"}>
                      {kycCase.status === "IN_REVIEW" ? "Em análise" : "Submetido"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {kycCase.submittedAt ? new Date(kycCase.submittedAt).toLocaleString("pt-BR") : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {cases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-center">
                    Nenhum caso aguardando análise.
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
