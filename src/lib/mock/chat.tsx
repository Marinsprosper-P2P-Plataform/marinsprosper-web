"use client";

import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ChatAttachment, ChatMessage } from "@/types/chat";
import type { MockRole } from "./session";

/**
 * Chat fake por ordem — mesmo espírito de `orders.tsx`: um Context com
 * todas as mensagens de todas as ordens, filtradas por `orderId` na
 * leitura. Sem persistência, sem WebSocket real (isso é Sprint 3/4);
 * o indicador de "digitando" é local a esta aba, mas funciona pra
 * demonstrar a UI porque o `AccountSwitcher` reaproveita o mesmo
 * estado — trocar de conta é literalmente "virar a outra pessoa"
 * dentro da mesma sessão do navegador.
 */

const now = () => new Date().toISOString();
const TYPING_TIMEOUT_MS = 2500;

function seedMessages(): ChatMessage[] {
  const t = now();
  return [
    {
      id: "msg-1",
      orderId: "order-3",
      authorId: "user-client-1",
      authorName: "Ana Cliente",
      authorRole: "cliente",
      body: "Oi! Acabei de fazer o PIX, já te mando o comprovante.",
      attachments: [],
      createdAt: t,
    },
    {
      id: "msg-2",
      orderId: "order-3",
      authorId: "user-client-1",
      authorName: "Ana Cliente",
      authorRole: "cliente",
      body: "Segue o comprovante",
      attachments: [
        {
          id: "att-1",
          fileName: "comprovante-pix.png",
          mimeType: "image/png",
          sizeBytes: 68,
          // Seed estático não tem um File de verdade pra gerar um blob:
          // — uma URL fake (`https://storage...`) não abre nada, o que é
          // exatamente o problema que motivou este anexo existir. Um
          // data: URI (placeholder 1x1) é a forma de manter o seed
          // genuinamente abrível, igual a um anexo enviado de verdade.
          signedUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
        },
      ],
      createdAt: t,
    },
    {
      id: "msg-3",
      orderId: "order-3",
      authorId: "user-cashier-1",
      authorName: "Beto Caixeiro",
      authorRole: "caixeiro",
      body: "Recebi, só confirmando o valor aqui e já libero.",
      attachments: [],
      createdAt: t,
    },
  ];
}

type ChatAction = { type: "ADD"; message: ChatMessage };

function chatReducer(state: ChatMessage[], action: ChatAction): ChatMessage[] {
  switch (action.type) {
    case "ADD":
      return [...state, action.message];
    default:
      return state;
  }
}

interface TypingEntry {
  userId: string;
  name: string;
  role: MockRole;
}

interface ChatContextValue {
  getMessages: (orderId: string) => ChatMessage[];
  sendMessage: (input: {
    orderId: string;
    authorId: string;
    authorName: string;
    authorRole: MockRole;
    body: string;
    attachments?: ChatAttachment[];
  }) => void;
  editMessage: (original: ChatMessage, newBody: string) => void;
  getTypingUsers: (orderId: string, excludeUserId: string) => TypingEntry[];
  notifyTyping: (orderId: string, user: TypingEntry) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, dispatch] = useReducer(chatReducer, undefined, seedMessages);
  const [typing, setTyping] = useState<Record<string, TypingEntry>>({});
  const timeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const getMessages = useCallback(
    (orderId: string) => messages.filter((m) => m.orderId === orderId),
    [messages],
  );

  const sendMessage = useCallback<ChatContextValue["sendMessage"]>((input) => {
    dispatch({
      type: "ADD",
      message: {
        id: `msg-${crypto.randomUUID()}`,
        orderId: input.orderId,
        authorId: input.authorId,
        authorName: input.authorName,
        authorRole: input.authorRole,
        body: input.body,
        attachments: input.attachments ?? [],
        createdAt: now(),
      },
    });
  }, []);

  const editMessage = useCallback<ChatContextValue["editMessage"]>((original, newBody) => {
    dispatch({
      type: "ADD",
      message: {
        id: `msg-${crypto.randomUUID()}`,
        orderId: original.orderId,
        authorId: original.authorId,
        authorName: original.authorName,
        authorRole: original.authorRole,
        body: newBody,
        attachments: original.attachments,
        createdAt: now(),
        supersedes: original.id,
      },
    });
  }, []);

  const getTypingUsers = useCallback(
    (orderId: string, excludeUserId: string) =>
      Object.entries(typing)
        .filter(([key, entry]) => key.startsWith(`${orderId}:`) && entry.userId !== excludeUserId)
        .map(([, entry]) => entry),
    [typing],
  );

  const notifyTyping = useCallback((orderId: string, user: TypingEntry) => {
    const key = `${orderId}:${user.userId}`;
    clearTimeout(timeouts.current[key]);
    setTyping((prev) => ({ ...prev, [key]: user }));
    timeouts.current[key] = setTimeout(() => {
      setTyping((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, TYPING_TIMEOUT_MS);
  }, []);

  return (
    <ChatContext.Provider
      value={{ getMessages, sendMessage, editMessage, getTypingUsers, notifyTyping }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat precisa estar dentro de ChatProvider");
  return ctx;
}
