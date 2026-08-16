import type { Decimal } from "@/lib/api";
import type { BackendOrderStatus } from "@/lib/order-status-map";
import type { Role } from "@/lib/auth";

export type UserStatus = "PENDING_KYC" | "ACTIVE" | "SUSPENDED" | "BLOCKED" | "CLOSED";

/** Espelha `listarUsuarios()` de `admin.service.ts` — sem senha, sem
 * hash e sem sessão, o painel responde só "quem é e em que estado
 * está". */
export interface AdminUser {
  id: string;
  email: string;
  status: UserStatus;
  createdAt: string;
  fullName: string | null;
  documentType: "CPF" | "CNPJ" | null;
  roles: Role[];
}

/** Corpo de `POST /admin/users/:id/approve` — motivo opcional, mas vai
 * pro histórico de status (append-only); sem ele o backend grava
 * "aprovação manual da administração". */
export interface ApproveUserPayload {
  reason?: string;
}

/** Espelha `listarOrdens()` — mesmo `Order` do Prisma, decimais como
 * string. Única leitura da API sem recorte de participante. */
export interface AdminOrder {
  id: string;
  side: "CLIENT_BUYS_ASSET" | "CLIENT_SELLS_ASSET";
  status: BackendOrderStatus;
  clientId: string;
  cashierId: string | null;
  asset: "USDT";
  assetAmount: Decimal;
  fiatAmount: Decimal;
  rate: Decimal;
  feeAmount: Decimal;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrdersFilters {
  status?: BackendOrderStatus;
  clientId?: string;
  cashierId?: string;
  take?: number;
}

/** Espelha `AuditLog` do Prisma — trilha append-only, só leitura em
 * `GET /admin/audit-logs`. */
export interface AuditLogEntry {
  id: string;
  actorType: "USER" | "SYSTEM";
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogFilters {
  action?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  from?: string;
  to?: string;
  take?: number;
}

export const BLACKLIST_TARGET_TYPES = ["DOCUMENT", "EMAIL", "TRON_ADDRESS", "PIX_KEY", "USER"] as const;
export type BlacklistTargetType = (typeof BLACKLIST_TARGET_TYPES)[number];
export type BlacklistAction = "BLOCK" | "RELEASE";

/** Espelha `BlacklistEntry` do Prisma — append-only, vale o último ato
 * de cada alvo. `GET /admin/blacklist` só devolve os bloqueios em
 * vigor (histórico completo, com os desbloqueios, é `audit-logs`). */
export interface BlacklistEntry {
  id: string;
  targetType: BlacklistTargetType;
  targetValue: string;
  action: BlacklistAction;
  reason: string;
  createdById: string;
  createdAt: string;
}

/** Corpo de `POST /admin/blacklist` — motivo obrigatório (10-1000
 * caracteres) nos dois sentidos, bloqueio ou desbloqueio. */
export interface BlacklistPayload {
  targetType: BlacklistTargetType;
  targetValue: string;
  action?: BlacklistAction;
  reason: string;
}
