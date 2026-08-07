import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Reputation } from "@/lib/mock/reputation";

/** Estrelas + média + contagem — usado em `/profile`, `/offers` e no
 * detalhe da ordem. `reputation` vem de `getUserReputation`. */
export function ReputationStars({
  reputation,
  emptyLabel = "Ainda sem avaliações",
  className,
}: {
  reputation: Reputation | null;
  emptyLabel?: string;
  className?: string;
}) {
  if (!reputation) {
    return <p className={cn("text-muted-foreground text-sm", className)}>{emptyLabel}</p>;
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[1, 2, 3, 4, 5].map((value) => (
        <StarIcon
          key={value}
          className={cn(
            "size-3.5",
            reputation.average >= value - 0.5 ? "fill-primary text-primary" : "text-muted-foreground",
          )}
        />
      ))}
      <span className="text-muted-foreground text-sm">
        {reputation.average.toFixed(1)} ({reputation.count} {reputation.count === 1 ? "avaliação" : "avaliações"})
      </span>
    </div>
  );
}
