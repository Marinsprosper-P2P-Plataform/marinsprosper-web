"use client";

import { useEffect, useRef, useState } from "react";
import { TimerIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * SLA de 30 minutos entre o aceite e o pagamento — contado no cliente
 * (`setInterval`, mesmo espírito de round-trip simulado de `pricing.ts`).
 * Quando zera, chama `onExpire` uma única vez; quem decide o que fazer
 * com isso é o chamador (`OrderActions` despacha `EXPIRE` no reducer
 * fake). O cancelamento automático real por timeout é trabalho de
 * backend (fila BullMQ, Sprint 3) — isto aqui só demonstra a UX.
 */
export function PaymentCountdown({
  deadline,
  onExpire,
}: {
  deadline: string;
  onExpire: () => void;
}) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(deadline).getTime() - Date.now());
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    const tick = () => setRemainingMs(new Date(deadline).getTime() - Date.now());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  useEffect(() => {
    if (remainingMs <= 0 && !hasExpiredRef.current) {
      hasExpiredRef.current = true;
      onExpire();
    }
  }, [remainingMs, onExpire]);

  const clampedMs = Math.max(0, remainingMs);
  const minutes = Math.floor(clampedMs / 60_000);
  const seconds = Math.floor((clampedMs % 60_000) / 1000);
  const isExpired = clampedMs <= 0;
  const isUrgent = !isExpired && clampedMs <= 5 * 60_000;

  return (
    <Alert variant={isExpired || isUrgent ? "destructive" : "default"}>
      <TimerIcon />
      <AlertTitle>{isExpired ? "Prazo esgotado" : "Prazo pra pagar"}</AlertTitle>
      <AlertDescription>
        {isExpired
          ? "A ordem foi cancelada automaticamente por falta de pagamento dentro do prazo."
          : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} restantes — pague e clique em "Marquei que transferi" antes de zerar.`}
      </AlertDescription>
    </Alert>
  );
}
