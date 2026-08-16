import { io, type Socket } from "socket.io-client";
import { getWsBaseUrl } from "@/lib/api";

/** Handshake leva o JWT em `auth.token` (`chat.gateway.ts`, real) — o
 * socket nunca escreve nada, só entrega em tempo real; enviar mensagem
 * continua sempre por `POST` (`src/lib/chat/api.ts`). */
export function connectChatSocket(token: string): Socket {
  return io(`${getWsBaseUrl()}/chat`, {
    auth: { token },
    transports: ["websocket"],
  });
}
