import { api } from "@/lib/api";
import type {
  AdminOrder,
  AdminOrdersFilters,
  AdminUser,
  ApproveUserPayload,
  AuditLogEntry,
  AuditLogFilters,
  BlacklistEntry,
  BlacklistPayload,
  UserStatus,
} from "./types";

function toQuery(params: object) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/** `GET /admin/users` — atrás do `AdminGuard` (403 pra quem não é
 * `ADMIN`). `status=PENDING_KYC` é a fila de aprovação. */
export function listAdminUsersRequest(params: { status?: UserStatus; email?: string; take?: number } = {}) {
  return api.get<AdminUser[]>(`/admin/users${toQuery(params)}`);
}

/** `POST /admin/users/:id/approve` — `PENDING_KYC` → `ACTIVE`. 409 se o
 * usuário não estiver em `PENDING_KYC` (inclui bloqueado — aprovar
 * desfaria o bloqueio pela porta dos fundos). */
export function approveAdminUserRequest(userId: string, payload: ApproveUserPayload) {
  return api.post<{ id: string; email: string; status: UserStatus }>(
    `/admin/users/${userId}/approve`,
    payload,
  );
}

/** `GET /admin/orders` — única leitura da API sem recorte de
 * participante, por isso atrás do guard de admin. */
export function listAdminOrdersRequest(params: AdminOrdersFilters = {}) {
  return api.get<AdminOrder[]>(`/admin/orders${toQuery(params)}`);
}

/** `GET /admin/audit-logs` — só leitura, `audit_logs` é append-only no
 * banco e não tem rota de escrita. */
export function listAuditLogsRequest(params: AuditLogFilters = {}) {
  return api.get<AuditLogEntry[]>(`/admin/audit-logs${toQuery(params)}`);
}

/** `GET /admin/blacklist` — o último ato de cada alvo, só os que estão
 * bloqueados agora. */
export function listBlacklistRequest(take?: number) {
  return api.get<BlacklistEntry[]>(`/admin/blacklist${toQuery({ take })}`);
}

/** `POST /admin/blacklist` — bloqueia (`action` padrão `BLOCK`) ou
 * desbloqueia (`RELEASE`, não apaga o bloqueio anterior) um dos 5 tipos
 * de alvo. Quem esbarra num bloqueio recebe 403 genérico em outro
 * endpoint — este aqui é só o registro do ato. */
export function blacklistTargetRequest(payload: BlacklistPayload) {
  return api.post<BlacklistEntry>("/admin/blacklist", payload);
}
