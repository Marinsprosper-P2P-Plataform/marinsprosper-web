import { api } from "@/lib/api";
import type { ChatMessageItem } from "./types";

/** `GET /orders/:id/messages` — conversa e histórico do sistema na
 * mesma linha do tempo (quem lê uma disputa não cruza duas listas). */
export function listMessagesRequest(orderId: string) {
  return api.get<ChatMessageItem[]>(`/orders/${orderId}/messages`);
}

/**
 * `POST /orders/:id/messages` — texto e/ou anexo (multipart quando há
 * arquivo). Sem `Idempotency-Key`: mandar a mesma mensagem duas vezes
 * não é uma escrita financeira, é só duas mensagens.
 */
export function sendMessageRequest(orderId: string, body: string | undefined, file?: File) {
  if (file) {
    const form = new FormData();
    if (body) form.append("body", body);
    form.append("file", file);
    return api.post<ChatMessageItem>(`/orders/${orderId}/messages`, form);
  }
  return api.post<ChatMessageItem>(`/orders/${orderId}/messages`, { body });
}
