"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

/** `POST /auth/logout` via `useAuth().logout()` — best-effort, a sessão
 * local já é limpa mesmo se a chamada falhar (ver `src/lib/auth/session.tsx`). */
export function LogoutButton() {
  const router = useRouter();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <Button variant="ghost" size="icon" aria-label="Sair" onClick={handleLogout}>
      <LogOutIcon />
    </Button>
  );
}
