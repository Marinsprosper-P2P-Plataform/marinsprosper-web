"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MOCK_ACCOUNTS, useMockSession } from "@/lib/mock/session";

/**
 * Existe só porque não há autenticação real ainda — deixa claro pra
 * quem está revisando o protótipo que "visualizar como" é uma muleta
 * de Sprint -1, não o modelo final (no Sprint 4 a identidade vem do
 * JWT). Qualquer conta pode comprar/vender como cliente e aceitar
 * ofertas como caixeiro — não é uma escolha exclusiva nem depende de
 * aprovação simulada (ver `src/lib/mock/session.tsx`).
 */
export function AccountSwitcher() {
  const { user, switchAccount } = useMockSession();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">Visualizando como</span>
      <Select value={user.id} onValueChange={switchAccount}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MOCK_ACCOUNTS.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
