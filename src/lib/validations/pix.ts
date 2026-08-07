import { z } from "zod";

/** Validação de UI apenas — mesma ressalva do resto de `src/lib/validations`.
 * A trava de titularidade de verdade (chave PIX tem que pertencer ao mesmo
 * CPF/CNPJ do KYC) é regra dura de backend, já especificada em
 * [[04 - Documentação de Segurança]]; aqui só validamos formato e, no caso
 * do tipo `cpf`, comparamos com o documento fake da conta pra dar feedback
 * imediato. */

export const PIX_KEY_TYPES = [
  { id: "cpf", label: "CPF/CNPJ" },
  { id: "email", label: "E-mail" },
  { id: "telefone", label: "Telefone" },
  { id: "aleatoria", label: "Aleatória" },
] as const;

export type PixKeyType = (typeof PIX_KEY_TYPES)[number]["id"];

/** Só o formato — 11 dígitos (CPF) ou 14 (CNPJ), com ou sem máscara. */
export function isCpfCnpjFormat(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 || digits.length === 14;
}

export const pixKeySchema = z
  .object({
    type: z.enum(PIX_KEY_TYPES.map((type) => type.id) as [PixKeyType, ...PixKeyType[]], {
      error: "Selecione o tipo de chave",
    }),
    key: z.string().min(1, "Informe a chave"),
    bank: z.string().min(2, "Informe a instituição bancária"),
    description: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "cpf" && !isCpfCnpjFormat(data.key)) {
      ctx.addIssue({ code: "custom", path: ["key"], message: "CPF (11 dígitos) ou CNPJ (14 dígitos)" });
    }
    if (data.type === "email" && !z.email().safeParse(data.key).success) {
      ctx.addIssue({ code: "custom", path: ["key"], message: "Informe um e-mail válido" });
    }
    if (data.type === "telefone" && data.key.replace(/\D/g, "").length < 8) {
      ctx.addIssue({ code: "custom", path: ["key"], message: "Informe um telefone válido" });
    }
    if (data.type === "aleatoria" && data.key.replace(/-/g, "").length < 32) {
      ctx.addIssue({ code: "custom", path: ["key"], message: "Chave aleatória incompleta" });
    }
  });
export type PixKeyInput = z.infer<typeof pixKeySchema>;
