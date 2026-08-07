"use client";

import { useMemo, useRef, useState } from "react";
import { LockIcon, PaperclipIcon, PencilIcon, SendIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@/lib/mock/chat";
import { useMockSession } from "@/lib/mock/session";
import type { ChatAttachment, ChatMessage } from "@/types/chat";
import type { Order } from "@/types/order";

const MAX_ATTACHMENT_MB = 10;

export function OrderChat({ order }: { order: Order }) {
  const orderId = order.id;
  const { user } = useMockSession();
  const { getMessages, sendMessage, editMessage, getTypingUsers, notifyTyping } = useChat();

  // Papel do autor NESTA ordem — a mesma conta pode ser cliente numa
  // ordem e caixeiro em outra, então não existe mais um "papel" fixo
  // do usuário pra rotular a mensagem.
  const myRole = order.clientId === user.id ? "cliente" : "caixeiro";

  const messages = getMessages(orderId);
  const typingUsers = getTypingUsers(orderId, user.id);

  // Versões antigas (já superadas por uma edição) não recebem mais o
  // botão de editar — continuam visíveis no histórico, só não mudam mais.
  const supersededIds = useMemo(
    () => new Set(messages.filter((m) => m.supersedes).map((m) => m.supersedes as string)),
    [messages],
  );
  const messageById = useMemo(
    () => new Map(messages.map((m) => [m.id, m])),
    [messages],
  );

  const [body, setBody] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleTyping(value: string) {
    setBody(value);
    if (value.trim()) {
      notifyTyping(orderId, { userId: user.id, name: user.name, role: myRole });
    }
  }

  function handleSend() {
    if (!body.trim() && !pendingFile) return;

    const attachments: ChatAttachment[] = pendingFile
      ? [buildFakeAttachment(pendingFile, orderId)]
      : [];

    sendMessage({
      orderId,
      authorId: user.id,
      authorName: user.name,
      authorRole: myRole,
      body: body.trim(),
      attachments,
    });
    setBody("");
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function startEdit(message: ChatMessage) {
    setEditingId(message.id);
    setEditingBody(message.body);
  }

  function saveEdit(message: ChatMessage) {
    if (!editingBody.trim()) return;
    editMessage(message, editingBody.trim());
    setEditingId(null);
    setEditingBody("");
  }

  return (
    <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-sm font-medium">Chat</h2>

      <ol className="flex max-h-96 flex-col gap-3 overflow-y-auto">
        {messages.map((message) => {
          const isMine = message.authorId === user.id;
          const original = message.supersedes ? messageById.get(message.supersedes) : undefined;
          const isEditable = isMine && !supersededIds.has(message.id) && !message.supersedes;

          return (
            <li key={message.id} className="flex gap-2">
              <Avatar size="sm">
                <AvatarFallback>{initials(message.authorName)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">{message.authorName}</span>
                  <span className="text-muted-foreground">({message.authorRole})</span>
                  <span className="text-muted-foreground">
                    {new Date(message.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {message.supersedes && (
                    <span className="text-muted-foreground">(editada)</span>
                  )}
                </div>

                {original && (
                  <p className="text-muted-foreground text-xs line-through">{original.body}</p>
                )}

                {editingId === message.id ? (
                  <div className="flex flex-col gap-1.5">
                    <Textarea
                      value={editingBody}
                      onChange={(event) => setEditingBody(event.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(message)}>
                        Salvar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {message.body && <p className="text-sm">{message.body}</p>}
                    {message.attachments.map((attachment) => (
                      <AttachmentPreview key={attachment.id} attachment={attachment} />
                    ))}
                  </>
                )}

                {isEditable && editingId !== message.id && (
                  <button
                    type="button"
                    onClick={() => startEdit(message)}
                    className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-xs"
                  >
                    <PencilIcon className="size-3" />
                    Editar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <TypingIndicator users={typingUsers} />

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
                  return;
                }
                setPendingFile(file ?? null);
              }}
            />
          </label>
          <Textarea
            value={body}
            onChange={(event) => handleTyping(event.target.value)}
            placeholder="Escreva uma mensagem"
            rows={1}
            className="flex-1"
          />
          <Button
            size="icon"
            aria-label="Enviar mensagem"
            disabled={!body.trim() && !pendingFile}
            onClick={handleSend}
          >
            <SendIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AttachmentPreview({ attachment }: { attachment: ChatAttachment }) {
  const isImage = attachment.mimeType.startsWith("image/");

  return (
    <div className="border-border flex items-center gap-2 rounded-md border p-2 text-xs">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- preview local de File via blob: URL, não um asset otimizável pelo next/image
        <img
          src={attachment.signedUrl}
          alt={attachment.fileName}
          className="size-10 shrink-0 rounded object-cover"
        />
      ) : (
        <PaperclipIcon className="text-muted-foreground size-4 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{attachment.fileName}</p>
        <p className="text-muted-foreground flex items-center gap-1">
          <LockIcon className="size-3" />
          Anexo privado — link expira
        </p>
      </div>
    </div>
  );
}

function TypingIndicator({
  users,
}: {
  users: { userId: string; name: string; role: string }[];
}) {
  if (users.length === 0) return <div className="h-4" aria-hidden />;

  return (
    <p className="text-muted-foreground h-4 text-xs italic">
      {users.map((u) => u.name).join(", ")} {users.length === 1 ? "está" : "estão"} digitando...
    </p>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function buildFakeAttachment(file: File, orderId: string): ChatAttachment {
  const isPreviewable = file.type.startsWith("image/");
  return {
    id: `att-${crypto.randomUUID()}`,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    // Preview local via blob: URL (só funciona nesta aba/sessão) — no
    // backend real isso seria uma URL assinada temporária de um bucket
    // privado, nunca um caminho público. `isPreviewable` decide só se a
    // miniatura é renderizada; PDFs mostram o ícone genérico.
    signedUrl: isPreviewable
      ? URL.createObjectURL(file)
      : `https://storage.marinsprosper.example/private/${orderId}/${encodeURIComponent(file.name)}?sig=fake`,
    expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
  };
}
