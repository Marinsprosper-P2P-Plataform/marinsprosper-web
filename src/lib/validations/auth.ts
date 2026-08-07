import { z } from "zod";

/**
 * Validação de UI apenas — protótipo com dados fake (Sprint -1). A
 * validação real, que decide o que é aceito de verdade, vive sempre no
 * backend (ver Parte 1, seção 3 dos princípios fundamentais).
 */

export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe sua senha"),
  isCashierOrAdmin: z.boolean(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const mfaSchema = z.object({
  code: z
    .string()
    .length(6, "O código tem 6 dígitos")
    .regex(/^\d+$/, "Só números"),
});
export type MfaInput = z.infer<typeof mfaSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(2, "Informe seu nome completo"),
    email: z.email("Informe um e-mail válido"),
    phone: z.string().min(8, "Informe um telefone válido"),
    role: z.enum(["cliente", "caixeiro"]),
    password: z.string().min(8, "Mínimo de 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const cashierApplySchema = z.object({
  methods: z.array(z.string()).min(1, "Selecione ao menos um método"),
  countries: z.string().min(2, "Informe ao menos um país"),
  currencies: z.string().min(2, "Informe ao menos uma moeda"),
});
export type CashierApplyInput = z.infer<typeof cashierApplySchema>;

export const PAYMENT_METHODS = [
  { id: "pix", label: "PIX" },
  { id: "ted", label: "TED" },
  { id: "boleto", label: "Boleto" },
] as const;
