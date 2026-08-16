"use client";

import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getUserReputationRequest, moderateRatingRequest } from "@/lib/ratings/api";
import type { RatingModerationStatus, UserReputation } from "@/lib/ratings/types";
import { ApiError, ApiNetworkError } from "@/lib/api";

function describeApiError(error: unknown, fallback: string) {
  if (error instanceof ApiNetworkError) return error.message;
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

/**
 * `POST /ratings/:id/moderation` real — só administração (checagem
 * dentro do `ratings.service.ts`, não guard de classe). Sem listagem
 * de avaliações no backend: não existe `GET /admin/ratings` nem
 * equivalente — a única leitura é `GET /users/:id/ratings`, que só
 * devolve as ainda **visíveis** (as 20 mais recentes). Por isso a
 * tela é dividida em duas frentes: buscar por usuário pra esconder
 * uma avaliação visível, e moderar por ID direto pra reexibir uma já
 * escondida (o `id` some da resposta pública depois de escondida —
 * quem for reexibir precisa achá-lo em `/admin/audit-logs`,
 * `entityType: "rating"`, `metadata.ratingId`). Sem tela no protótipo
 * antes desta rodada.
 */
export default function AdminRatingsPage() {
  const [userId, setUserId] = useState("");
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!userId.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const { data } = await getUserReputationRequest(userId.trim());
      setReputation(data);
    } catch (err) {
      setReputation(null);
      if (err instanceof ApiError && err.isNotFound) {
        setSearchError("Usuário não encontrado.");
      } else {
        setSearchError(describeApiError(err, "Não foi possível carregar a reputação."));
      }
    } finally {
      setSearching(false);
    }
  }

  async function handleModerate(ratingId: string, status: RatingModerationStatus, reason: string) {
    await moderateRatingRequest(ratingId, { status, reason: reason.trim() });
    toast.success(status === "HIDDEN" ? "Avaliação escondida" : "Avaliação reexibida");
    if (status === "HIDDEN" && userId.trim()) {
      const { data } = await getUserReputationRequest(userId.trim());
      setReputation(data);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-xl font-semibold">Moderação de avaliações</h1>
        <p className="text-muted-foreground text-sm">
          Esconder não apaga — a avaliação continua no banco, cada ato fica registrado com motivo
        </p>
      </div>

      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Buscar avaliações visíveis de um usuário</h2>
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="ID do usuário avaliado"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className="max-w-sm"
          />
          <Button type="submit" variant="outline" size="sm" disabled={searching}>
            {searching ? "Buscando..." : "Buscar"}
          </Button>
        </form>

        {searchError && <p className="text-destructive text-sm">{searchError}</p>}

        {reputation && (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-sm">
              Média {reputation.average ?? "—"} · {reputation.count} avaliações visíveis
            </p>
            <ul className="flex flex-col gap-2">
              {reputation.latest.map((rating) => (
                <li key={rating.id} className="border-border flex flex-col gap-1 rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{rating.score} ★</Badge>
                    <span className="text-muted-foreground text-xs">
                      {new Date(rating.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {rating.comment && <p>{rating.comment}</p>}
                  <ModerateDialog ratingId={rating.id} status="HIDDEN" onConfirm={handleModerate} />
                </li>
              ))}
              {reputation.latest.length === 0 && (
                <p className="text-muted-foreground text-sm">Nenhuma avaliação visível pra este usuário.</p>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Moderar por ID</h2>
        <p className="text-muted-foreground text-xs">
          Pra reexibir uma avaliação já escondida — o ID sai de `/admin/audit-logs`
          (entidade &quot;rating&quot;).
        </p>
        <ManualModerateForm onConfirm={handleModerate} />
      </div>
    </div>
  );
}

function ModerateDialog({
  ratingId,
  status,
  onConfirm,
}: {
  ratingId: string;
  status: RatingModerationStatus;
  onConfirm: (ratingId: string, status: RatingModerationStatus, reason: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive" className="w-fit">
          Esconder
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Esconder avaliação</DialogTitle>
          <DialogDescription>
            Motivo obrigatório (10-1000 caracteres) — moderação sem motivo registrado não se
            distingue de censura.
          </DialogDescription>
        </DialogHeader>
        <Textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} />
        <DialogFooter>
          <Button
            disabled={submitting || reason.trim().length < 10}
            onClick={async () => {
              setSubmitting(true);
              try {
                await onConfirm(ratingId, status, reason);
                setOpen(false);
                setReason("");
              } catch (err) {
                toast.error(describeApiError(err, "Não foi possível moderar a avaliação."));
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManualModerateForm({
  onConfirm,
}: {
  onConfirm: (ratingId: string, status: RatingModerationStatus, reason: string) => Promise<void>;
}) {
  const [ratingId, setRatingId] = useState("");
  const [status, setStatus] = useState<RatingModerationStatus>("VISIBLE");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = ratingId.trim().length > 0 && reason.trim().length >= 10;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rating-id">ID da avaliação</Label>
        <Input id="rating-id" value={ratingId} onChange={(event) => setRatingId(event.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rating-status">Status</Label>
        <Select value={status} onValueChange={(value) => setStatus(value as RatingModerationStatus)}>
          <SelectTrigger id="rating-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="VISIBLE">Reexibir (VISIBLE)</SelectItem>
            <SelectItem value="HIDDEN">Esconder (HIDDEN)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rating-reason">Motivo</Label>
        <Textarea id="rating-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={2} />
      </div>
      <Button
        disabled={!canSubmit || submitting}
        onClick={async () => {
          setSubmitting(true);
          try {
            await onConfirm(ratingId.trim(), status, reason);
            setRatingId("");
            setReason("");
          } catch (err) {
            toast.error(describeApiError(err, "Não foi possível moderar a avaliação."));
          } finally {
            setSubmitting(false);
          }
        }}
        className="w-fit"
      >
        {submitting ? "Enviando..." : "Confirmar"}
      </Button>
    </div>
  );
}
