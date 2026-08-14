import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ORDER_HAPPY_PATH_STEPS,
  ORDER_STATUS_META,
  type OrderStatus,
} from "@/types/order";
import { OrderStatusBadge } from "./order-status-badge";

interface OrderTimelineProps {
  status: OrderStatus;
  /**
   * Quando `status` é um ramo fora do fluxo principal (cancelamento,
   * disputa, expiração, suspensão), este prop indica até onde a ordem
   * avançou no fluxo principal antes de desviar — o stepper fica
   * "congelado" nesse ponto e um aviso do status do ramo aparece acima.
   */
  lastMainlineStatus?: OrderStatus;
  className?: string;
}

/** Índice do grupo (etapa real do backend) que contém `status`, ou -1 se
 * `status` for um ramo fora do fluxo principal. Cada grupo em
 * `ORDER_HAPPY_PATH_STEPS` é uma única etapa do backend vista por papéis
 * diferentes (ver [[21 - Integração com API Real]] §2) — os dois rótulos
 * do par contam como o mesmo step aqui, nunca dois. */
function stepIndexOf(status: OrderStatus): number {
  return ORDER_HAPPY_PATH_STEPS.findIndex((group) => group.includes(status));
}

export function OrderTimeline({
  status,
  lastMainlineStatus,
  className,
}: OrderTimelineProps) {
  const mainlineIndex = stepIndexOf(status);
  const isBranch = mainlineIndex === -1;
  const frozenAt = isBranch
    ? lastMainlineStatus
      ? stepIndexOf(lastMainlineStatus)
      : -1
    : mainlineIndex;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {isBranch && (
        <div className="border-status-dispute/30 bg-status-dispute/10 rounded-lg border p-3">
          <OrderStatusBadge status={status} />
        </div>
      )}

      <ol>
        {ORDER_HAPPY_PATH_STEPS.map((group, index) => {
          const isDone = index < frozenAt;
          const isActive = !isBranch && index === frozenAt;
          const isLast = index === ORDER_HAPPY_PATH_STEPS.length - 1;
          // Enquanto o step está ativo, mostra o rótulo exato do status
          // atual (que já reflete o papel de quem está olhando, ver
          // `mapBackendOrderStatus`); fora disso, o primeiro rótulo do
          // grupo serve só como nome genérico da etapa.
          const label = ORDER_STATUS_META[group.includes(status) ? status : group[0]].label;

          return (
            <li key={group[0]} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                    isDone &&
                      "border-status-completed bg-status-completed text-status-completed-foreground",
                    isActive &&
                      "border-status-progress bg-status-progress text-status-progress-foreground",
                    !isDone &&
                      !isActive &&
                      "border-border bg-background text-muted-foreground",
                  )}
                >
                  {isDone ? <CheckIcon className="size-3.5" /> : index + 1}
                </span>
                {!isLast && (
                  <span
                    className={cn(
                      "w-px flex-1",
                      isDone ? "bg-status-completed" : "bg-border",
                    )}
                  />
                )}
              </div>
              <div
                className={cn(
                  "pb-4 text-sm",
                  isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground",
                )}
              >
                {label}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
