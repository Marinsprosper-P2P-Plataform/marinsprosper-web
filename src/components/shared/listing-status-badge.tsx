import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ListingStatus } from "@/types/listing";

const STATUS_META: Record<ListingStatus, { label: string; classes: string }> = {
  ATIVA: { label: "Ativa", classes: "bg-status-open text-status-open-foreground" },
  PAUSADA: { label: "Pausada", classes: "bg-status-progress text-status-progress-foreground" },
  CANCELADA: { label: "Cancelada", classes: "bg-status-cancelled text-status-cancelled-foreground" },
  ENCERRADA: { label: "Encerrada", classes: "bg-status-completed text-status-completed-foreground" },
};

export function ListingStatusBadge({ status, className }: { status: ListingStatus; className?: string }) {
  const meta = STATUS_META[status];
  return <Badge className={cn("border-transparent", meta.classes, className)}>{meta.label}</Badge>;
}
