import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_META, type OrderStatus } from "@/types/order";

/**
 * Tailwind precisa das classes por extenso e estáticas (não
 * `bg-status-${category}`) para conseguir escaneá-las no build.
 */
const CATEGORY_CLASSES: Record<string, string> = {
  open: "bg-status-open text-status-open-foreground",
  progress: "bg-status-progress text-status-progress-foreground",
  completed: "bg-status-completed text-status-completed-foreground",
  cancelled: "bg-status-cancelled text-status-cancelled-foreground",
  dispute: "bg-status-dispute text-status-dispute-foreground",
  expired: "bg-status-expired text-status-expired-foreground",
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const meta = ORDER_STATUS_META[status];

  return (
    <Badge
      className={cn("border-transparent", CATEGORY_CLASSES[meta.category], className)}
    >
      {meta.label}
    </Badge>
  );
}
