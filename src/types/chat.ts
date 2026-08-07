import type { MockRole } from "@/lib/mock/session";

/**
 * Espelha `chat_attachments`/`order_proofs` em [[03 - Modelo de Dados]].
 * `signedUrl` é sempre fake e sempre temporária — nunca deve apontar
 * pra um caminho de storage público (ver Documentação de Segurança).
 */
export interface ChatAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  signedUrl: string;
  expiresAt: string;
}

/**
 * Mensagens não são editáveis de verdade — `supersedes` aponta pra uma
 * versão anterior quando o autor "edita", mas a mensagem original nunca
 * é removida nem sobrescrita (ver `chat_messages` em
 * [[03 - Modelo de Dados]]).
 */
export interface ChatMessage {
  id: string;
  orderId: string;
  authorId: string;
  authorName: string;
  authorRole: MockRole;
  body: string;
  attachments: ChatAttachment[];
  createdAt: string;
  supersedes?: string;
}
