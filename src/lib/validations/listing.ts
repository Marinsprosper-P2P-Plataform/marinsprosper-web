import { z } from "zod";
import { isCpfCnpjFormat, PIX_KEY_TYPES, type PixKeyType } from "@/lib/validations/pix";

/** Validação de UI do wizard de ofertas (`ListingWizard`) — mesma
 * ressalva do resto de `src/lib/validations`: só formato/consistência
 * local, sem trava de backend (não existe endpoint de ofertas ainda). */

export const pixMethodSchema = z
  .object({
    kind: z.literal("pix"),
    pixType: z.enum(PIX_KEY_TYPES.map((type) => type.id) as [PixKeyType, ...PixKeyType[]], {
      error: "Selecione o tipo de chave",
    }),
    pixKey: z.string().min(1, "Informe a chave PIX"),
  })
  .superRefine((data, ctx) => {
    if (data.pixType === "cpf" && !isCpfCnpjFormat(data.pixKey)) {
      ctx.addIssue({ code: "custom", path: ["pixKey"], message: "CPF (11 dígitos) ou CNPJ (14 dígitos)" });
    }
    if (data.pixType === "email" && !z.email().safeParse(data.pixKey).success) {
      ctx.addIssue({ code: "custom", path: ["pixKey"], message: "Informe um e-mail válido" });
    }
  });

export const transferMethodSchema = z.object({
  kind: z.literal("transferencia"),
  bank: z.string().min(2, "Informe o banco"),
  agency: z.string().min(1, "Informe a agência"),
  account: z.string().min(1, "Informe a conta"),
  transferKey: z.string().min(1, "Informe a chave da conta"),
});

export const paymentMethodDetailsSchema = z.discriminatedUnion("kind", [
  pixMethodSchema,
  transferMethodSchema,
]);
export type PaymentMethodDetailsInput = z.infer<typeof paymentMethodDetailsSchema>;

export const listingLimitsSchema = z
  .object({
    totalQuantity: z.number().positive("Informe a quantidade total"),
    minPerOrder: z.number().positive("Informe o mínimo por solicitação"),
    maxPerOrder: z.number().positive("Informe o máximo por solicitação"),
  })
  .superRefine((data, ctx) => {
    if (data.minPerOrder > data.maxPerOrder) {
      ctx.addIssue({ code: "custom", path: ["minPerOrder"], message: "Mínimo não pode ser maior que o máximo" });
    }
    if (data.maxPerOrder > data.totalQuantity) {
      ctx.addIssue({ code: "custom", path: ["maxPerOrder"], message: "Máximo não pode ser maior que a quantidade total" });
    }
  });

/** Senha de reconfirmação da etapa final — demo fixa (`1234`), sem
 * backend de autenticação de segundo fator pra ofertas ainda. */
export const LISTING_DEMO_PASSWORD = "1234";
