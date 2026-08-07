"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMockSession, type MockRole } from "@/lib/mock/session";

/**
 * Existe só porque não há autenticação real ainda — deixa claro pra
 * quem está revisando o protótipo que "visualizar como" é uma muleta
 * de Sprint -1, não o modelo final (no Sprint 4 o papel vem do JWT).
 */
export function RoleSwitcher() {
  const { user, setRole } = useMockSession();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">Visualizando como</span>
      <Select value={user.role} onValueChange={(value) => setRole(value as MockRole)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cliente">Cliente (Ana Cliente)</SelectItem>
          <SelectItem value="caixeiro">Caixeiro (Beto Caixeiro)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
