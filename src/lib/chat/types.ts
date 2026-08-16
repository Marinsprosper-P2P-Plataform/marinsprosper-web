/** Espelha `MensagemApresentada` de `chat.service.ts` — `SYSTEM` nasce
 * da própria máquina de estados da ordem (sem `authorId`), `TEXT`/
 * `ATTACHMENT` vêm de gente. Imutável: não existe edição no backend
 * real (era só do protótipo mock) — corrigir é mandar outra mensagem. */
export type ChatMessageKind = "TEXT" | "ATTACHMENT" | "SYSTEM";

export interface ChatAttachmentItem {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  /** URL assinada de leitura, gerada a cada `GET` — vence em minutos,
   * nunca cachear entre navegações. `null` se o storage não estiver
   * configurado no ambiente. */
  url: string | null;
}

export interface ChatMessageItem {
  id: string;
  kind: ChatMessageKind;
  authorId: string | null;
  body: string | null;
  metadata: unknown;
  createdAt: string;
  attachments: ChatAttachmentItem[];
}

/** Evento `status` publicado no socket quando a ordem muda de estado —
 * mesmo payload de `chatEvents.publicarStatus` (`orders.service.ts`). */
export interface ChatStatusEvent {
  orderId: string;
  status: string;
  from: string;
  event: string;
}
