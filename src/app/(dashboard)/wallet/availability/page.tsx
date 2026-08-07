"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeftIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PAYMENT_METHODS } from "@/lib/validations/auth";
import { WEEKDAYS, useMockCashierAvailability } from "@/lib/mock/cashier-availability";
import { useMockSession } from "@/lib/mock/session";

/** PATCH /cashier/availability — protótipo com dados fake. Cobre a
 * tela de disponibilidade do card "Carteira & Caução" do [[Kanban]]:
 * online/offline, horários e métodos aceitos. Cada mudança já aplica
 * direto no mock (sem botão "salvar" — mesma UX de um toggle/settings
 * simples, não um formulário longo). */
export default function CashierAvailabilityPage() {
  const { user } = useMockSession();
  const { getAvailability, updateAvailability } = useMockCashierAvailability();
  const availability = getAvailability(user.id);

  if (!availability) return null;

  function toggleDay(day: string) {
    if (!availability) return;
    const days = availability.days.includes(day)
      ? availability.days.filter((item) => item !== day)
      : [...availability.days, day];
    updateAvailability(user.id, { days });
  }

  function toggleMethod(methodId: string) {
    if (!availability) return;
    const methods = availability.methods.includes(methodId)
      ? availability.methods.filter((item) => item !== methodId)
      : [...availability.methods, methodId];
    updateAvailability(user.id, { methods });
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <Link
        href="/wallet"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeftIcon className="size-4" />
        Carteira
      </Link>

      <div>
        <h1 className="text-xl font-semibold">Disponibilidade do caixeiro</h1>
        <p className="text-muted-foreground text-sm">
          Controla quando você aparece pra aceitar ordens em `/offers`
        </p>
      </div>

      <div className="border-border flex items-center justify-between rounded-lg border p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">Status</span>
          <span className="text-muted-foreground text-xs">
            {availability.online ? "Online — visível pra novas ordens" : "Offline — não aparece pra novas ordens"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={availability.online ? "default" : "secondary"}>
            {availability.online ? "Online" : "Offline"}
          </Badge>
          <Switch
            checked={availability.online}
            onCheckedChange={(checked) => {
              updateAvailability(user.id, { online: checked });
              toast.success(checked ? "Você está online" : "Você está offline");
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Dias de atuação</Label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => {
            const checked = availability.days.includes(day.id);
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => toggleDay(day.id)}
                className="focus-visible:outline-none"
              >
                <Badge variant={checked ? "default" : "secondary"} className="cursor-pointer">
                  {day.label}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="start-time">Das</Label>
          <Input
            id="start-time"
            type="time"
            value={availability.startTime}
            onChange={(event) => updateAvailability(user.id, { startTime: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="end-time">Até</Label>
          <Input
            id="end-time"
            type="time"
            value={availability.endTime}
            onChange={(event) => updateAvailability(user.id, { endTime: event.target.value })}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Métodos aceitos</legend>
        {PAYMENT_METHODS.map((method) => (
          <label key={method.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={availability.methods.includes(method.id)}
              onCheckedChange={() => toggleMethod(method.id)}
            />
            {method.label}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
