/** Só os 4 tipos que o backend detecta por assinatura de bytes
 * (`file-signature.ts`) — lista de permissão, não de bloqueio. */
export const ACCEPTED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type AcceptedUploadType = (typeof ACCEPTED_UPLOAD_TYPES)[number];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export interface CreateUploadPayload {
  filename: string;
  contentType: string;
  sizeBytes: number;
}

/** Resposta de `POST /uploads` — `url` é assinada e válida por poucos
 * minutos; os bytes vão direto pra ela (`PUT`), nunca pela nossa API. */
export interface CreateUploadResponse {
  uploadId: string;
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: string;
  maxBytes: number;
}
