"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PeriodPreset, PeriodRange } from "@/lib/mock/dashboard";

const PRESET_LABELS: Record<PeriodPreset, string> = {
  today: "Hoje",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  ytd: "Ano até hoje",
  custom: "Personalizado",
};

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Filtro de período padrão, reaproveitado nas 3 telas de Relatórios &
 * Ganhos (cliente, caixeiro, admin) — card "Filtros de período padrão"
 * do Kanban. `custom` abre dois `Input[type=date]`; o cálculo de
 * `PeriodRange` real fica em `resolvePeriodRange` (`lib/mock/dashboard`),
 * não aqui — este componente só controla o preset selecionado. */
export function PeriodFilter({
  preset,
  onPresetChange,
  custom,
  onCustomChange,
}: {
  preset: PeriodPreset;
  onPresetChange: (preset: PeriodPreset) => void;
  custom: PeriodRange;
  onCustomChange: (range: PeriodRange) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={(value) => onPresetChange(value as PeriodPreset)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PRESET_LABELS) as PeriodPreset[]).map((key) => (
            <SelectItem key={key} value={key}>
              {PRESET_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-auto"
            value={toDateInputValue(custom.from)}
            max={toDateInputValue(custom.to)}
            onChange={(event) => {
              if (!event.target.value) return;
              onCustomChange({ ...custom, from: new Date(event.target.value) });
            }}
          />
          <span className="text-muted-foreground text-xs">até</span>
          <Input
            type="date"
            className="w-auto"
            value={toDateInputValue(custom.to)}
            min={toDateInputValue(custom.from)}
            onChange={(event) => {
              if (!event.target.value) return;
              // Fim do dia, pra incluir ordens criadas até o fim da data escolhida.
              const end = new Date(event.target.value);
              end.setHours(23, 59, 59, 999);
              onCustomChange({ ...custom, to: end });
            }}
          />
        </div>
      )}
    </div>
  );
}
