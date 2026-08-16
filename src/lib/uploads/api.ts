import { api } from "@/lib/api";
import type { CreateUploadPayload, CreateUploadResponse } from "./types";

/** `POST /uploads` — pede a URL assinada de escrita (fase 1 do upload
 * direto ao bucket). Usado por KYC, evidência de disputa e anexo de
 * chat quando não se manda o arquivo via `multipart` direto. */
export function createUploadRequest(payload: CreateUploadPayload) {
  return api.post<CreateUploadResponse>("/uploads", payload);
}

/**
 * Fase 2: manda os bytes direto pro bucket — nunca pela nossa API, e
 * sem `Authorization` (a credencial é a própria assinatura da URL).
 * Quem usa o arquivo depois (`uploadId`) é quem confere os bytes de
 * verdade, lendo o objeto de volta.
 */
export async function uploadFileDirect(response: CreateUploadResponse, file: File) {
  const put = await fetch(response.url, {
    method: response.method,
    headers: response.headers,
    body: file,
  });
  if (!put.ok) {
    throw new Error(`Falha ao enviar o arquivo pro storage (HTTP ${put.status})`);
  }
}

/** Fase 1 + fase 2 juntas — pede a URL, manda os bytes, devolve o
 * `uploadId` pra usar em `/kyc/documents`, `/disputes/:id/evidence` etc. */
export async function uploadFile(file: File): Promise<string> {
  const { data } = await createUploadRequest({
    filename: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  });
  await uploadFileDirect(data, file);
  return data.uploadId;
}
