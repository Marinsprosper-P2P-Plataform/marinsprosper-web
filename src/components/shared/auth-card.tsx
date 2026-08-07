import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Wrapper visual comum pras telas de `(auth)` — login, registro, MFA,
 * KYC, solicitação de caixeiro. Mantém largura e espaçamento consistentes. */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="border-border bg-card w-full max-w-sm rounded-xl border p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
      {footer && <div className="text-muted-foreground mt-6 text-sm">{footer}</div>}
    </div>
  );
}
