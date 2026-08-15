"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { listDisputesRequest } from "@/lib/disputes/api";
import type { BackendDispute } from "@/lib/disputes/types";
import { ApiError, ApiNetworkError } from "@/lib/api";

const STATUS_LABEL: Record<BackendDispute["status"], string> = {
  OPEN: "Aberta",
  UNDER_REVIEW: "Em análise",
  RESOLVED: "Resolvida",
};

/**
 * `GET /disputes` real — fila de mediação. Substitui `/admin/disputes`
 * (papel errado: mediação é `MEDIATOR`, não `ADMIN`). O backend já
 * decide o que cada conta vê: mediador enxerga as próprias + as ainda
 * sem dono; quem não é mediador só vê as disputas das próprias ordens.
 * Sem RBAC no front ainda (mesma ressalva já registrada pro resto do
 * app) — a rota fica alcançável por qualquer conta, mas o conteúdo é
 * sempre o que o backend autoriza. Ver [[14 - Ofertas e Ordens]].
 */
export default function DisputesPage() {
  const [disputes, setDisputes] = useState<BackendDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await listDisputesRequest();
        if (cancelled) return;
        setDisputes(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiNetworkError) setError(err.message);
        else if (err instanceof ApiError) setError(`Backend recusou a listagem: ${err.message}`);
        else setError("Não foi possível carregar as disputas.");
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
        <h1 className="text-xl font-semibold">Disputas</h1>
        <p className="text-muted-foreground text-sm">
          Casos em mediação — os seus, como parte ou como mediador
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {loading && <p className="text-muted-foreground text-sm">Carregando...</p>}

      {!loading && disputes.length === 0 && (
        <p className="text-muted-foreground text-sm">Nenhuma disputa no momento.</p>
      )}

      {!loading && disputes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {disputes.map((dispute) => (
            <li key={dispute.id}>
              <Link
                href={`/disputes/${dispute.id}`}
                className="border-border hover:bg-accent flex flex-col gap-2 rounded-lg border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      #{dispute.orderId.replace(/-/g, "").slice(0, 8).toUpperCase()}
                    </span>
                    <Badge variant={dispute.status === "RESOLVED" ? "secondary" : "default"}>
                      {STATUS_LABEL[dispute.status]}
                    </Badge>
                    {!dispute.mediatorId && (
                      <span className="text-muted-foreground text-xs">Sem mediador ainda</span>
                    )}
                  </div>
                  {dispute.reason && <p className="text-sm">{dispute.reason}</p>}
                </div>
                <span className="text-muted-foreground text-xs">
                  {new Date(dispute.createdAt).toLocaleString("pt-BR")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
