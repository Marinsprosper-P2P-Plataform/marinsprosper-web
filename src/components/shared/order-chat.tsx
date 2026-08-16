"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LockIcon, PaperclipIcon, SendIcon } from "lucide-react";
import type { Socket } from "socket.io-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { listMessagesRequest, sendMessageRequest } from "@/lib/chat/api";
import { connectChatSocket } from "@/lib/chat/socket";
import type { ChatMessageItem } from "@/lib/chat/types";
import { getAccessToken, ApiError, ApiNetworkError } from "@/lib/api";

const MAX_ATTACHMENT_MB = 10;

function describeApiError(error: unknown, fallback: string) {
  if (error instanceof ApiNetworkError) return error.message;
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

/**
 * `GET`/`POST /orders/:id/messages` reais + entrega em tempo real via
 * Socket.IO (`namespace: /chat`, sala `order:<id>`) — o socket só
 * entrega, nunca escreve; enviar continua sempre por `POST`. Sem edição
 * (mensagem é imutável no backend real, diferente do protótipo mock —
 * corrigir é mandar outra) e sem indicador de "digitando" (sem evento
 * correspondente no gateway real). Sem nome de autor — mesma limitação
 * de nome de contraparte do resto da API real (ver
 * [[14 - Ofertas e Ordens]]): rotula por papel (Cliente/Caixeiro/
 * Mediador/Sistema) + id curto.
 */
export function OrderChat({
  orderId,
  clientId,
  cashierId,
  viewerId,
}: {
  orderId: string;
  clientId: string;
  cashierId: string | null;
  viewerId: string;
}) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function roleLabel(authorId: string | null, kind: ChatMessageItem["kind"]) {
    if (kind === "SYSTEM" || !authorId) return "Sistema";
    if (authorId === clientId) return `Cliente ${shortId(authorId)}`;
    if (authorId === cashierId) return `Caixeiro ${shortId(authorId)}`;
    return `Mediador ${shortId(authorId)}`;
  }

  function addMessage(message: ChatMessageItem) {
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
  }

  const load = () => {
    listMessagesRequest(orderId)
      .then(({ data }) => setMessages(data))
      .catch((err) => setError(describeApiError(err, "Não foi possível carregar as mensagens.")));
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await listMessagesRequest(orderId);
        if (!cancelled) setMessages(data);
      } catch (err) {
        if (!cancelled) setError(describeApiError(err, "Não foi possível carregar as mensagens."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    let socket: Socket | null = connectChatSocket(token);
    socket.emit("entrar", orderId);
    socket.on("mensagem", (payload: ChatMessageItem & { orderId: string }) => {
      if (payload.orderId === orderId) addMessage(payload);
    });
    socket.on("status", (payload: { orderId: string }) => {
      // Mudança de status vira mensagem de sistema no thread, mas não
      // viaja pelo evento `mensagem` — recarrega pra pegar essa linha.
      if (payload.orderId === orderId) load();
    });

    return () => {
      socket?.emit("sair", orderId);
      socket?.disconnect();
      socket = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `load`/`addMessage` recriadas a cada render, mas fecham sobre `orderId` estável
  }, [orderId]);

  async function handleSend() {
    if ((!body.trim() && !pendingFile) || sending) return;
    setSending(true);
    try {
      const { data } = await sendMessageRequest(orderId, body.trim() || undefined, pendingFile ?? undefined);
      addMessage(data);
      setBody("");
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast.error(describeApiError(err, "Não foi possível enviar a mensagem."));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-sm font-medium">Chat</h2>

      {loading && <p className="text-muted-foreground text-sm">Carregando...</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}

      <ol className="flex max-h-96 flex-col gap-3 overflow-y-auto">
        {messages.map((message) => {
          const isMine = message.authorId === viewerId;
          const isSystem = message.kind === "SYSTEM";

          return (
            <li key={message.id} className={`flex gap-2 ${isSystem ? "opacity-70" : ""}`}>
              {!isSystem && (
                <Avatar size="sm">
                  <AvatarFallback>{isMine ? "EU" : roleLabel(message.authorId, message.kind).slice(0, 2)}</AvatarFallback>
                </Avatar>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">{roleLabel(message.authorId, message.kind)}</span>
                  <span className="text-muted-foreground">
                    {new Date(message.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {message.body && <p className="text-sm">{message.body}</p>}
                {message.attachments.map((attachment) => (
                  <AttachmentPreview key={attachment.id} attachment={attachment} />
                ))}
              </div>
            </li>
          );
        })}
        {!loading && messages.length === 0 && (
          <p className="text-muted-foreground text-xs">Nenhuma mensagem ainda.</p>
        )}
      </ol>

      <div className="flex flex-col gap-2">
        {pendingFile && (
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <PaperclipIcon className="size-3.5" />
            {pendingFile.name}
            <button type="button" onClick={() => setPendingFile(null)} className="underline">
              remover
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <label className="text-muted-foreground hover:text-foreground cursor-pointer p-2">
            <PaperclipIcon className="size-4" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file && file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
                  toast.error(`Arquivo maior que ${MAX_ATTACHMENT_MB} MB`);
                  return;
                }
                setPendingFile(file ?? null);
              }}
            />
          </label>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Escreva uma mensagem"
            rows={1}
            className="flex-1"
          />
          <Button
            size="icon"
            aria-label="Enviar mensagem"
            disabled={(!body.trim() && !pendingFile) || sending}
            onClick={handleSend}
          >
            <SendIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AttachmentPreview({ attachment }: { attachment: ChatMessageItem["attachments"][number] }) {
  const isImage = attachment.contentType.startsWith("image/");

  if (!attachment.url) {
    return (
      <div className="border-border flex items-center gap-2 rounded-md border p-2 text-xs">
        <PaperclipIcon className="text-muted-foreground size-4 shrink-0" />
        <span className="truncate">{attachment.filename}</span>
        <span className="text-muted-foreground">— indisponível (storage não configurado)</span>
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="border-border hover:bg-accent flex items-center gap-2 rounded-md border p-2 text-xs"
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária, não um asset otimizável pelo next/image
        <img src={attachment.url} alt={attachment.filename} className="size-10 shrink-0 rounded object-cover" />
      ) : (
        <PaperclipIcon className="text-muted-foreground size-4 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{attachment.filename}</p>
        <p className="text-muted-foreground flex items-center gap-1">
          <LockIcon className="size-3" />
          Anexo privado — abrir
        </p>
      </div>
    </a>
  );
}
